# Sample Datasets

Test data for the GIS Data Converter's conversion engine. Every file here maps to
one or more of the conversions the service performs.

> **Note:** this `data/` folder is **gitignored** (sample data is large and freely
> re-downloadable). Use the [re-download script](#re-download) below to recreate it
> on a fresh clone.

---

## How these files were chosen

Selection worked **backwards from the conversions**: each converter needs a specific
input format, so we picked the smallest real dataset that provides each required
format.

1. **PDF-listed sources first** — OSGeo GeoTIFF samples and the folium `us-states.json`.
2. **Everything else from stable public mirrors** — [Natural Earth](https://www.naturalearthdata.com/)
   (public-domain map data) and rasterio's test image — preferring small files so
   conversions run fast during testing.

---

## PDF datasets → local files

The mini-project PDF lists **4 datasets**. Here is exactly which local file each became.

### Satellite Imagery / GeoTIFF

| PDF dataset | → Local file(s) |
|-------------|-----------------|
| **OSGeo GeoTIFF Samples** | `raster/cea.tif`, `raster/usgs_ortho.tif` |
| **GeoTIFF Benchmark Files** | `raster/benchmark/byte_50m.tif`, `raster/benchmark/int16_50m.tif`, `raster/benchmark/float32_50m.tif` |

### Vector Data

| PDF dataset | → Local file(s) |
|-------------|-----------------|
| **World Countries Boundary** (folium us-states) | `vector/us-states.geojson` |
| **GADM Global Administrative Areas** (USA chosen) | `vector/gadm41_USA.gpkg` |

So the **4 PDF datasets = 8 files**. Every other file is an **extra** added to cover
conversions the PDF datasets cannot test on their own (CSV import, RGB band-split, and
the Shapefile / GeoPackage / KML bonus formats):

| Extra file | Why added (not in PDF) |
|------------|------------------------|
| `vector/ne_countries.geojson` | Natural Earth world countries |
| `vector/ne_populated_places.geojson` | Natural Earth city points (for GeoJSON→CSV) |
| `tabular/cities.csv` | Hand-made — needed for CSV→GeoJSON |
| `raster/rgb_byte.tif` | 3-band RGB — needed for multi-band→COG |
| `formats/shapefile/*` | Real Shapefile — Shapefile↔GeoJSON |
| `formats/gdal_sample.gpkg` | GeoPackage — GeoPackage↔GeoJSON |
| `formats/sample.kml` | Hand-made KML — KML↔GeoJSON |

---

## Folder layout

```
data/
├─ vector/     GeoJSON (polygons + points) + GADM USA GeoPackage
├─ tabular/    CSV with coordinates
├─ raster/     GeoTIFF (grayscale, RGB, large ortho) + benchmark/ (byte/int16/float32)
└─ formats/    Bonus-format sources (Shapefile, GeoPackage, KML)
```

---

## Files, sources & coverage

### Vector — `vector/` and `tabular/`

| File | Source | License | Used by conversion |
|------|--------|---------|--------------------|
| `vector/us-states.geojson` | https://raw.githubusercontent.com/python-visualization/folium/master/examples/data/us-states.json | BSD (folium) | GeoJSON→CSV, GeoJSON→Raster, Reproject |
| `vector/ne_countries.geojson` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson | Public domain | Reproject, Raster round-trips |
| `vector/ne_populated_places.geojson` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_populated_places.geojson | Public domain | GeoJSON→CSV (point export) |
| `vector/gadm41_USA.gpkg` | https://geodata.ucdavis.edu/gadm/gadm4.1/gpkg/gadm41_USA.gpkg | GADM (free, non-commercial) | GeoPackage↔GeoJSON, admin boundaries (PDF: GADM) |
| `tabular/cities.csv` | Hand-authored (10 cities, lon/lat columns) | Free to use | CSV→GeoJSON (import from tabular) |

### Raster — `raster/`

| File | Source | License | Used by conversion |
|------|--------|---------|--------------------|
| `raster/cea.tif` | https://download.osgeo.org/geotiff/samples/gdal_eg/cea.tif | Public test data | GeoTIFF→COG, Raster→GeoJSON, Reproject |
| `raster/usgs_ortho.tif` | https://download.osgeo.org/geotiff/samples/usgs/o41078a1.tif | Public domain (USGS) | GeoTIFF→COG (realistic demo) |
| `raster/rgb_byte.tif` | https://github.com/rasterio/rasterio/raw/main/tests/data/RGB.byte.tif | BSD (rasterio) | Multi-band → single-band COG (bonus) |
| `raster/benchmark/{byte,int16,float32}_50m.tif` | https://s3.us-east-2.amazonaws.com/geotiff-benchmark-sample-files/geotiff_sample_files.tar.gz | Public sample | GeoTIFF→COG across pixel data types (PDF: GeoTIFF Benchmark Files) |

### Bonus-format sources — `formats/`

| File | Source | License | Used by conversion |
|------|--------|---------|--------------------|
| `formats/shapefile/ne_110m_admin_0_countries.{shp,shx,dbf,prj}` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/110m_cultural/ | Public domain | Shapefile ↔ GeoJSON (bonus) |
| `formats/gdal_sample.gpkg` | http://www.geopackage.org/data/gdal_sample.gpkg | Public sample | GeoPackage ↔ GeoJSON (bonus) |
| `formats/sample.kml` | Hand-authored (2 points + 1 polygon) | Free to use | KML ↔ GeoJSON (bonus) |

---

## Conversion coverage

**Mandatory (Top 5):**

1. GeoJSON ↔ CSV — `us-states.geojson`, `ne_populated_places.geojson` + `cities.csv`
2. GeoTIFF → COG — `cea.tif`, `usgs_ortho.tif`
3. Raster → GeoJSON — `cea.tif`
4. GeoJSON → Raster — `us-states.geojson`
5. Reprojection — any vector or raster

**Bonus:** Shapefile, GeoPackage, KML, and multi-band band-split are all covered.

---

## Re-download

A Shapefile is 4 files (`.shp/.shx/.dbf/.prj`); the `.csv` and `.kml` are authored by
hand and live in git history if committed separately. Run from the project root:

```bash
mkdir -p data/vector data/tabular data/raster data/formats/shapefile

# Vector
curl -fsSL -o data/vector/us-states.geojson          https://raw.githubusercontent.com/python-visualization/folium/master/examples/data/us-states.json
curl -fsSL -o data/vector/ne_countries.geojson       https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
curl -fsSL -o data/vector/ne_populated_places.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_populated_places.geojson

# Raster
curl -fsSL -o data/raster/cea.tif        https://download.osgeo.org/geotiff/samples/gdal_eg/cea.tif
curl -fsSL -o data/raster/usgs_ortho.tif https://download.osgeo.org/geotiff/samples/usgs/o41078a1.tif
curl -fsSL -o data/raster/rgb_byte.tif   https://github.com/rasterio/rasterio/raw/main/tests/data/RGB.byte.tif

# Raster benchmark set (~89 MB tarball -> three 48 MB GeoTIFFs; server is slow)
mkdir -p data/raster/benchmark
curl -fL -o /tmp/geotiff_sample_files.tar.gz https://s3.us-east-2.amazonaws.com/geotiff-benchmark-sample-files/geotiff_sample_files.tar.gz
tar -xzf /tmp/geotiff_sample_files.tar.gz -C data/raster/benchmark/

# GADM USA admin boundaries (~107 MB GeoPackage; server is slow, -C - resumes)
curl -fL -C - -o data/vector/gadm41_USA.gpkg https://geodata.ucdavis.edu/gadm/gadm4.1/gpkg/gadm41_USA.gpkg

# Bonus formats
base=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/110m_cultural/ne_110m_admin_0_countries
for ext in shp shx dbf prj; do
  curl -fsSL -o "data/formats/shapefile/ne_110m_admin_0_countries.$ext" "$base.$ext"
done
curl -fsSL -o data/formats/gdal_sample.gpkg http://www.geopackage.org/data/gdal_sample.gpkg
```
