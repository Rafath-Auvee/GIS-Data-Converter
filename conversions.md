# Conversions — a visual field guide

A note-taking walkthrough of every module in `backend/app/conversions/`. For each
conversion: **what it does · input · output · which sample file · a worked example ·
a text-graph of the transformation.**

All examples use the committed samples in [`test cases/`](test%20cases/) and show the
*actual* output this engine produces (verified end-to-end).

---

## 0. The big picture

```text
                         ┌──────────────── the request pipeline ────────────────┐
  you ──upload file──▶  API  ──validate──▶  queue (Redis)  ──▶  Celery worker
                         │                                            │
                         │                                     run(conversion,…)
                         │                                            │
                         ▼                                            ▼
                     Postgres                                  conversions/<module>.py
                   (task status)                                      │
                         ▲                                     write output file
                         │                                            │
  you ◀─download─── API ◀──────────────── MinIO (object store) ◀──────┘
```

Everything in `conversions/` is the **last box**: pure functions `input_path → output_path`.
The dispatcher [`__init__.py`](backend/app/conversions/__init__.py) picks the right one.

### The two worlds of GIS (know this and everything clicks)

```text
        VECTOR                              RASTER
   shapes + attributes                  grid of pixels
   ───────────────────                  ──────────────
   GeoJSON, CSV, Shapefile,             GeoTIFF, COG
   GeoPackage, KML, COCO                (a number per cell)

        ●───●                            ┌─┬─┬─┬─┐
        │   │   "Region A"               │0│1│1│0│   each cell = a value
        ●───●   value=10                 ├─┼─┼─┼─┤   (elevation, class, colour…)
                                         │0│1│1│0│
   zoom in → crisp math edges           └─┴─┴─┴─┘
                                         zoom in → you see the squares
```

Most conversions either **move within a world** (GeoJSON→Shapefile, GeoTIFF→COG) or
**cross between worlds** (GeoJSON→Raster, Raster→GeoJSON).

### Words you need first (30-second glossary)

- **Vector** — data as **shapes** (points, lines, polygons) plus **attributes**. Zoom in and
  edges stay razor-sharp (they're math, not pixels). Formats: GeoJSON, CSV+coords,
  Shapefile, GeoPackage, KML, COCO.
- **Raster** — data as a **grid of pixels**, each cell holding a number (brightness,
  elevation, a class code…). Zoom in and you see squares. Formats: GeoTIFF, COG.
- **Feature** — one vector item = a **geometry + its properties** (e.g. one country + its name).
- **Geometry** — the shape itself: `Point`, `LineString`, `Polygon`, `MultiPolygon`…
- **Properties / attributes** — the facts attached to a shape (`name`, `value`, `category`).
- **CRS (Coordinate Reference System)** — the rulebook that says what the coordinate numbers
  *mean* on Earth. Named by an **EPSG** code.
- **EPSG:4326 / WGS84** — plain **longitude, latitude in degrees**; the GeoJSON default.
- **EPSG:3857 / Web Mercator** — **x, y in metres**; what Google/Leaflet map tiles use.
- **WKT (Well-Known Text)** — a geometry written as text, e.g. `POLYGON ((10 50, …))`. This is
  how a shape can live inside a single CSV cell.
- **Band** — one layer of a raster. A colour photo has 3 (R, G, B); satellites add more (NIR…).
- **NoData** — a pixel value that means "nothing here" (ignored in stats and previews).
- **Resolution** — the ground size of one pixel (here measured in degrees per pixel).
- **COG (Cloud-Optimized GeoTIFF)** — a GeoTIFF re-arranged into internal **tiles** + **overviews**
  so a web map can stream just the piece it needs instead of the whole file.
- **Rasterize** = vector → raster (shapes become pixels). **Vectorize** = raster → vector
  (pixels become shapes). These two are exact opposites (#3 and #4 below).

### Map of all 15 directions

```text
 VECTOR ↔ TABULAR         RASTER OPTIMISE        RASTER ↔ VECTOR        REPROJECT
 ────────────────         ──────────────         ───────────────        ─────────
 GeoJSON ─▶ CSV           GeoTIFF ─▶ COG         Raster ─▶ GeoJSON      any CRS ─▶ EPSG
 CSV     ─▶ GeoJSON       Multiband ─▶ COGs      GeoJSON ─▶ Raster       (vector OR raster)

 VECTOR INTERCHANGE (bonus)                      ML INTEROP (bonus)
 ──────────────────────────                      ──────────────────
 GeoJSON ↔ Shapefile   GeoJSON ↔ GeoPackage      GeoJSON ─▶ COCO
 GeoJSON ↔ KML/KMZ                                COCO   ─▶ GeoJSON
```

### At a glance: is it vector or raster?

| Conversion | Input world | Output world | Crosses worlds? |
|---|---|---|---|
| GeoJSON ↔ CSV | vector | tabular (vector-as-text) | no (stays vector) |
| GeoTIFF → COG | **raster** | **raster** | no |
| Raster → GeoJSON | **raster** | vector | **yes** (vectorize) |
| GeoJSON → Raster | vector | **raster** | **yes** (rasterize) |
| Reprojection | vector *or* raster | same as input | no (only the CRS changes) |
| GeoJSON ↔ Shapefile | vector | vector | no |
| GeoJSON ↔ GeoPackage | vector | vector | no |
| GeoJSON ↔ KML/KMZ | vector | vector | no |
| Multi-band → COGs | **raster** | **raster** | no |
| GeoJSON ↔ COCO | vector | ML annotations (JSON) | no (stays vector-ish) |

Rule of thumb: only **two** conversions cross the vector/raster divide — **Raster → GeoJSON**
(vectorize) and **GeoJSON → Raster** (rasterize). Everything else stays in its own world.

---

# MANDATORY — the Top 5

## 1. `geojson_csv.py` — GeoJSON ↔ CSV

> Turn map features into a spreadsheet and back. Each feature = one row; the geometry is
> stored as **WKT** text so no shape information is lost.

**Learn it**
- **What it is —** export map features to a table (Excel/pandas) and re-import a table as a map.
- **Vector or raster —** **vector ⇄ tabular** (a CSV row is still vector info, just written as text).
- **Why you'd use it —** analyse attributes in a spreadsheet, or turn a list of GPS points into a map.
- **What actually happens —** each feature becomes one row: properties → columns, geometry →
  a `geometry_wkt` text cell. Going back, the geometry is rebuilt from `geometry_wkt`, or from
  `longitude`/`latitude` columns (which makes Points).
- **Gotcha —** a CSV with no `geometry_wkt` and no lon/lat columns can't become a map; everything
  is assumed to be WGS84 (EPSG:4326).

```text
 GeoJSON  ─────────────▶  CSV                CSV  ─────────────▶  GeoJSON
 (shapes+props)           (rows)             (rows)              (points/shapes)

 properties → columns                        geometry_wkt column → shapes
 geometry   → geometry_wkt column            OR lon/lat columns  → Point shapes
```

**Sample:** `test cases/geojson_to_csv/regions.geojson` · `test cases/csv_to_geojson/cities.csv`

**GeoJSON → CSV**
```text
INPUT  regions.geojson                     OUTPUT  regions.csv
{ "type":"FeatureCollection",              name,category,value,geometry_wkt
  "features":[                             Region A,forest,10,"POLYGON ((10 50, 10.5 50,
    {"properties":{"name":"Region A",        10.5 50.5, 10 50.5, 10 50))"
      "category":"forest","value":10},     Region B,water,20,"POLYGON ((11 50, 11.5 50,
     "geometry":{"type":"Polygon", …}}       11.5 50.5, 11 50.5, 11 50))"
    …]}
```

**CSV → GeoJSON** (needs `geometry_wkt` **or** `longitude`/`latitude` columns)
```text
INPUT  cities.csv                          OUTPUT  cities.geojson
name,country,longitude,latitude            { "type":"FeatureCollection","features":[
Berlin,DE,13.4050,52.5200        ─────▶       {"type":"Feature",
Paris,FR,2.3522,48.8566                         "properties":{"name":"Berlin","country":"DE"},
Madrid,ES,-3.7038,40.4168                       "geometry":{"type":"Point",
                                                   "coordinates":[13.405,52.52]}}, … ]}
```
Library: `geopandas` + `shapely` (WKT). Assumes WGS84 (EPSG:4326).

---

## 2. `geotiff_cog.py` — GeoTIFF → COG

> Re-lay-out a raster as a **Cloud-Optimized GeoTIFF**: internally **tiled** + **overviews**
> (pre-shrunk zoom levels) so a viewer streams only the tiles it needs.

**Learn it**
- **What it is —** repackage a raster so the web can stream it efficiently.
- **Vector or raster —** **raster → raster** (identical pixels, only the *internal layout* changes).
- **Why you'd use it —** a normal GeoTIFF must be downloaded whole; a COG lets a map grab just
  the tiles for the current view + zoom, so maps load fast from cloud storage.
- **What actually happens —** the file is rewritten into small internal **tiles** and given
  **overviews** (a pyramid of pre-shrunk copies for zoomed-out views).
- **Gotcha —** choose compression to match the data: `jpeg`/`webp` are lossy (fine for photos),
  `deflate`/`lzw`/`zstd` are lossless (use for elevation/scientific data). `blocksize` must be ×16.

```text
 plain GeoTIFF                         COG (Cloud-Optimized GeoTIFF)
 ┌───────────────┐                     ┌──┬──┬──┬──┐  ← internal tiles (e.g. 256×256)
 │ one big strip │      ─────▶         ├──┼──┼──┼──┤
 │ read it ALL   │   rio-cogeo         └──┴──┴──┴──┘
 └───────────────┘                     + overviews:  [██]  [▓]  [░]
                                          full  1/2  1/4 …  ← cheap zoom-out
```

**Sample:** `test cases/geotiff_to_cog/elevation.tif` (single-band float32, 64×64, EPSG:4326)
**Params:** `compression` (deflate·lzw·zstd·webp·jpeg·none) · `nodata` · `blocksize` (×16)

```text
elevation.tif  ──cog_translate(compression=lzw, blocksize=256)──▶  elevation_cog.tif
   64×64 float32                                                    tiled + overviews,
   EPSG:4326                                                        valid COG
```

---

## 3. `raster_geojson.py` — Raster → GeoJSON (polygonize)

> **Vectorize** a raster: adjacent pixels with the same value become one polygon. Pixels
> equal to `0` (and `nodata`) are treated as background and skipped.

**Learn it**
- **What it is —** turn pixel regions into editable shapes (the "vectorize" direction).
- **Vector or raster —** **raster → vector** (crosses worlds: pixels come in, polygons go out).
- **Why you'd use it —** a model or classifier outputs a raster mask (e.g. water = 1, land = 0);
  vectorizing gives you clean polygons you can measure, edit, or store as GeoJSON.
- **What actually happens —** touching pixels that share a value are merged into one polygon;
  each polygon keeps that value as a `value` property; `0` and NoData are treated as background.
- **Gotcha —** pick which `band` to read (default 1); the result is reprojected to WGS84; if every
  pixel is background the job fails with "raster mask is empty".

```text
 INPUT landcover_mask.tif (uint8)          OUTPUT polygons (GeoJSON, WGS84)
 ┌─┬─┬─┬─┬─┬─┬─┬─┐
 │0│0│0│0│0│0│0│0│                          Feature  value=1  ▉ (top-left block)
 │0│1│1│0│0│0│0│0│                          Feature  value=2  ▓ (bottom-right block)
 │0│1│1│0│0│2│2│0│        ──shapes()──▶
 │0│0│0│0│0│2│2│0│                          { "type":"FeatureCollection","features":[
 │0│0│0│0│0│0│0│0│                            {"properties":{"value":1.0},
 └─┴─┴─┴─┴─┴─┴─┴─┘                              "geometry":{"type":"Polygon", …}}, … ]}
   pixels grouped by value  ───▶  one polygon per connected region
```

**Sample:** `test cases/raster_to_geojson/landcover_mask.tif` · **Param:** `band` (default 1)
Use case in the PDF: *polygonization of binary masks* (e.g. ML segmentation output → shapes).

---

## 4. `geojson_raster.py` — GeoJSON → Raster (rasterize)

> The inverse of #3: **burn** vector shapes into a pixel grid (a mask), the classic input
> shape for machine-learning datasets.

**Learn it**
- **What it is —** stamp shapes onto a pixel grid (the "rasterize" direction, exact opposite of #3).
- **Vector or raster —** **vector → raster** (polygons come in, a pixel grid goes out).
- **Why you'd use it —** ML models train on rasters, not shapes; rasterizing your labelled
  polygons produces the mask image the model needs.
- **What actually happens —** any cell covered by a shape becomes `1`, everything else is the
  `fill` value (`0` by default); `resolution` sets how big one pixel is in degrees.
- **Gotcha —** it's a **binary** mask — every feature burns the same value `1` (it does *not* burn
  per-feature attribute values); output is single-band `uint8`.

```text
 INPUT regions.geojson (polygons)          OUTPUT regions_raster.tif (uint8 grid)
        ●─────●                            ┌─┬─┬─┬─┬─┬─┬─┐
        │  A  │        ──rasterize(        │0│0│0│0│0│0│0│
        ●─────●          resolution=0.05)  │0│1│1│1│0│0│0│   1 = inside a shape
                 ●────●     ─────▶         │0│1│1│1│0│1│1│   0 = background (fill)
                 │ B  │                    │0│0│0│0│0│1│1│
                 ●────●                    └─┴─┴─┴─┴─┴─┴─┘
```

**Sample:** `test cases/geojson_to_raster/regions.geojson`
**Params:** `resolution` (deg/pixel, default 0.05) · `nodata` (0–255) · `compression`
Note: it's a **binary burn** (every feature → value `1`), single-band `uint8`.

---

## 5. `reproject.py` — Reprojection (EPSG)

> Convert coordinates between **coordinate reference systems**. Works on **vector** and
> **raster** (the dispatcher picks by file extension).

**Learn it**
- **What it is —** re-express the same location in a different coordinate system (EPSG code).
- **Vector or raster —** **either → same world** (vector→vector *or* raster→raster; it never
  changes the world, only the coordinate numbers). The dispatcher picks the path from the file type.
- **Why you'd use it —** two datasets only line up if they share a CRS; and web maps need
  Web Mercator (`3857`) while GeoJSON is usually WGS84 (`4326`).
- **What actually happens —** every coordinate is transformed by `pyproj`; for rasters the whole
  grid is *warped* onto the new system and pixels are resampled.
- **Gotcha —** it does **not** move the place — `[10, 50]` degrees and `[1113194, 6446275]` metres
  are the *same point*. Raster reprojection uses nearest-neighbour resampling.

```text
 EPSG:4326  (degrees, lon/lat)   ──to_crs / warp──▶   EPSG:3857 (metres, Web Mercator)

   [ 10.0 , 50.0 ]                                      [ 1 113 194.9 , 6 446 275.8 ]
   ▲ human map degrees                                  ▲ what web tile maps use
```

**Sample:** `test cases/reproject/regions.geojson` (vector) · `.../elevation.tif` (raster)
**Param:** `target_epsg` (default 3857)

```text
 vector:  gdf.to_crs(epsg)                → <name>_epsg3857.geojson
 raster:  calculate_default_transform +   → <name>_epsg3857.tif
          warp(resampling=nearest)
```

---

# BONUS — the 5 secondary conversions

## 6. `shapefile.py` — GeoJSON ↔ Shapefile

> The ESRI classic. A "shapefile" is really **several files** (`.shp` geometry, `.shx`
> index, `.dbf` attributes, `.prj` CRS, `.cpg` encoding) — so we zip/unzip them.

**Learn it**
- **What it is —** convert between GeoJSON and the decades-old ESRI Shapefile.
- **Vector or raster —** **vector ⇄ vector**.
- **Why you'd use it —** Shapefile is still the default in ArcGIS/QGIS and government data, so
  you constantly need to get data in and out of it.
- **What actually happens —** a shapefile isn't one file — it's a **bundle** (`.shp` + `.shx` +
  `.dbf` + `.prj` + `.cpg`). We zip that bundle for download, and unzip an uploaded `.zip` to read it.
- **Gotcha —** you must upload a **`.zip`** (not a lone `.shp`); Shapefile also truncates column
  names to 10 characters. Output is reprojected to WGS84.

```text
 GeoJSON ─▶ Shapefile                       Shapefile (zip) ─▶ GeoJSON
   regions.geojson                            regions_shapefile.zip
        │  to_file(ESRI Shapefile)                 │  unzip → find .shp → read
        ▼                                          ▼
   regions_shapefile.zip                       regions.geojson (reprojected to 4326)
   ┌──────────────────────────┐
   │ .shp .shx .dbf .prj .cpg │  ← all bundled into ONE zip
   └──────────────────────────┘
```

**Sample:** `test cases/geojson_to_shapefile/regions.geojson` · `.../shapefile_to_geojson/regions_shapefile.zip`

---

## 7. `geopackage.py` — GeoJSON ↔ GeoPackage (.gpkg)

> A modern single-file format — a **SQLite database** holding geometry + attributes.
> One tidy `.gpkg` file instead of the shapefile's 5-file bundle.

**Learn it**
- **What it is —** convert between GeoJSON and GeoPackage, the modern OGC standard.
- **Vector or raster —** **vector ⇄ vector** (GeoPackage can also hold rasters, but here it's vector).
- **Why you'd use it —** it's the recommended replacement for Shapefile: **one file**, no 10-char
  name limit, no size cap, and it's just a SQLite database under the hood.
- **What actually happens —** GDAL's GPKG driver reads/writes the `.gpkg`; each is a self-contained
  spatial database file.
- **Gotcha —** none major — this is the "just works" modern format. Output reprojected to WGS84.

```text
 GeoJSON ─▶ .gpkg                           .gpkg ─▶ GeoJSON
   regions.geojson  ──to_file(GPKG)──▶        regions.gpkg  ──read──▶  regions.geojson
                    one SQLite container                     (reprojected to 4326)
```

**Sample:** `test cases/geojson_to_gpkg/regions.geojson` · `.../gpkg_to_geojson/regions.gpkg`

---

## 8. `kml.py` — GeoJSON ↔ KML/KMZ (Google Earth)

> **KML** = XML for Google Earth. **KMZ** = a zipped KML. Reading accepts either.

**Learn it**
- **What it is —** convert between GeoJSON and Google Earth's KML/KMZ format.
- **Vector or raster —** **vector ⇄ vector**.
- **Why you'd use it —** to view your data in Google Earth, or to ingest KML/KMZ that others
  share (tours, placemarks, overlays).
- **What actually happens —** KML is an XML dialect; **KMZ is just a zipped KML**, so on import we
  unzip it first, then read the `.kml` inside.
- **Gotcha —** KML carries visual *styling* (colours, icons) that GeoJSON has no place for, so that
  styling is dropped. Output reprojected to WGS84.

```text
 GeoJSON ─▶ KML                             KML/KMZ ─▶ GeoJSON
   regions.geojson                            regions.kml   (or .kmz → unzip first)
        │ to_file(KML)                             │ read
        ▼                                          ▼
   regions.kml   <Placemark>…</Placemark>     regions.geojson (reprojected to 4326)
```

**Sample:** `test cases/geojson_to_kml/regions.geojson` · `.../kml_to_geojson/regions.kml`

---

## 9. `multiband.py` — Multi-band GeoTIFF → single-band COGs

> Satellite images stack bands (Red, Green, Blue, NIR…). This **splits** each band into its
> own COG and zips them — e.g. pull the NIR band out of a Sentinel-2 scene.

**Learn it**
- **What it is —** split one multi-band raster into a separate single-band COG per band.
- **Vector or raster —** **raster → raster** (one file in, many files out).
- **Why you'd use it —** satellite scenes stack many bands (Red, Green, Blue, Near-Infrared…);
  analyses like NDVI need one specific band on its own, cloud-optimized.
- **What actually happens —** it reads each band, writes it as its own COG, and bundles them into
  a single `.zip`.
- **Gotcha —** it's **one-way** (splitting only, as the PDF specifies) and always uses `deflate`
  compression; the output is a `.zip` of COGs, not a single file.

```text
 INPUT rgb.tif (3 bands)                    OUTPUT rgb_bands.zip
 ┌───────────────┐  band 1 (R)              ┌────────────────────────┐
 │███████████████│                          │ rgb_band1_cog.tif      │
 ├───────────────┤  band 2 (G)   ──split──▶ │ rgb_band2_cog.tif      │
 │███████████████│               each band  │ rgb_band3_cog.tif      │
 ├───────────────┤  band 3 (B)   → own COG  └────────────────────────┘
 │███████████████│                            (each a valid COG, deflate)
 └───────────────┘
```

**Sample:** `test cases/multiband_to_cogs/rgb.tif` (3-band uint8). One-way (as the PDF specifies).

---

## 10. `coco.py` — GeoJSON ↔ COCO JSON

> **COCO** is the standard annotation format for computer-vision / ML datasets. This bridges
> GIS polygons ⇄ COCO annotations (bbox + segmentation).

**Learn it**
- **What it is —** bridge GIS polygons and COCO, the standard labelling format for computer vision.
- **Vector or raster —** **vector ⇄ ML-JSON** (COCO is not GIS — it's an annotation file that
  happens to describe shapes on an image).
- **Why you'd use it —** reuse hand-drawn map polygons as ML **training labels**, or bring a
  model's predicted shapes **back** into GIS as GeoJSON.
- **What actually happens —** each polygon becomes a COCO **annotation** with a bounding box
  (`bbox`) and outline (`segmentation`); reading COCO rebuilds each annotation into a GeoJSON polygon.
- **Gotcha —** **polygons only** (points/lines are skipped), and coordinates are treated as flat
  image/pixel space — there's no CRS/georeferencing round-trip.

```text
 GeoJSON ─▶ COCO                            COCO ─▶ GeoJSON
   polygons                                   annotations (bbox / segmentation)
        │                                          │
        ▼                                          ▼
 { "images":[{id,file_name,width,height}],   each annotation's polygon →
   "categories":[{id,name}],                  one GeoJSON Feature with
   "annotations":[                            {annotation_id, category, area, iscrowd}
     {id, bbox:[x,y,w,h], area,
      segmentation:[[x,y,x,y,…]], …} ] }
```

**Worked example** (`regions.geojson` → `regions_coco.json`)
```text
Region A polygon  ▶  { "id":1, "category_id":1,
                       "bbox":[10, 50, 0.5, 0.5],      ← x, y, width, height
                       "area":0.25,
                       "segmentation":[[10,50, 10.5,50, 10.5,50.5, 10,50.5, 10,50]],
                       "iscrowd":0 }
image size = feature bounds = width 1.5 (11.5−10), height 0.5 (50.5−50)
```
**Sample:** `test cases/geojson_to_coco/regions.geojson` · `.../coco_to_geojson/regions_coco.json`
Note: encodes **polygons only**; treats coordinates as the pixel space.

---

# Datasets — what to feed each conversion

### Small committed samples → [`test cases/`](test%20cases/) (one per conversion, always present)

```text
 test cases/
  ├─ geojson_to_csv/regions.geojson        ├─ geojson_to_gpkg/regions.geojson
  ├─ csv_to_geojson/cities.csv             ├─ gpkg_to_geojson/regions.gpkg
  ├─ geotiff_to_cog/elevation.tif          ├─ geojson_to_kml/regions.geojson
  ├─ raster_to_geojson/landcover_mask.tif  ├─ kml_to_geojson/regions.kml
  ├─ geojson_to_raster/regions.geojson     ├─ multiband_to_cogs/rgb.tif
  ├─ reproject/{regions.geojson,           ├─ geojson_to_coco/regions.geojson
  │             elevation.tif}             └─ coco_to_geojson/regions_coco.json
  ├─ geojson_to_shapefile/regions.geojson
  └─ shapefile_to_geojson/regions_shapefile.zip
```

### Bigger real-world datasets → [`data/`](data/) (from the PDF; see [dataset.md](dataset.md))

```text
 data/
  ├─ World Countries Boundary/us-states.geojson        ← vector demo (50 US states)
  ├─ OSGeo GeoTIFF Samples/{cea,rgb_byte,usgs_ortho}.tif ← real rasters (rgb_byte = multiband)
  ├─ GeoTIFF Benchmark Files/{byte,int16,float32}_50m.tif ← stress-test COG on every dtype
  └─ GADM Global Administrative Areas/
        ├─ GeoJSON/gadm41_USA_{0,1,2}.json    ├─ Shapefile/gadm41_USA_*.{shp,zip}
        ├─ Geopackage/gadm41_USA.gpkg         └─ KMZ/gadm41_USA_*.kmz
```

```text
 which dataset for which conversion
 ───────────────────────────────────
 vector conversions      →  us-states.geojson         (GeoJSON↔CSV, →Raster, reproject, →SHP/GPKG/KML/COCO)
 raster → COG / polygon  →  cea.tif · *_50m.tif        (GeoTIFF→COG, Raster→GeoJSON, reproject raster)
 multiband split         →  rgb_byte.tif               (Multi-band → single-band COGs)
 reverse (→ GeoJSON)     →  gadm41 gpkg / shp.zip / kmz (GPKG/Shapefile/KML → GeoJSON)
```

---

## One-line memory hooks

```text
 GeoJSON↔CSV   shapes ⇄ spreadsheet rows (WKT text)
 GeoTIFF→COG   same pixels, web-streamable layout (tiles + overviews)
 Raster→GeoJSON  pixels of the same value  →  polygons        (vectorize)
 GeoJSON→Raster  polygons  →  burned pixel mask               (rasterize)
 Reproject     same place, different coordinate numbers (EPSG)
 →Shapefile    1 zip = 5 files (.shp/.shx/.dbf/.prj/.cpg)
 →GeoPackage   1 file = a SQLite spatial database
 →KML/KMZ      XML for Google Earth (KMZ = zipped KML)
 Multiband→COGs  one stacked raster  →  one COG per band
 GeoJSON↔COCO  GIS polygons ⇄ ML annotation format
```
