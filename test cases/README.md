# Test Cases — one sample input per conversion

Small, self-contained sample files for **every** conversion the service supports.
Unlike [`data/`](../data/) (large real-world datasets, git-ignored), these are tiny,
committed to the repo, and each was **verified end-to-end** against the actual
conversion engine (all 16 produce valid, non-empty output).

Layout: one folder per conversion, named exactly like the `conversion` form field
the API expects, with the input file(s) inside.

Columns: the `conversion` form value (= folder name), the sample file to upload, the
optional parameters that conversion accepts (with defaults), and the output filename.

| Folder (`conversion` value) | Sample file | Parameters (default) | Output |
|---|---|---|---|
| `geojson_to_csv` | `regions.geojson` | — none — | `<name>.csv` |
| `csv_to_geojson` | `cities.csv` | — none — (CSV needs `geometry_wkt` **or** `longitude`/`latitude` columns) | `<name>.geojson` |
| `geotiff_to_cog` | `elevation.tif` | `compression` (`deflate`), `nodata`, `blocksize` (multiple of 16) | `<name>_cog.tif` |
| `raster_to_geojson` | `landcover_mask.tif` | `band` (`1`) | `<name>.geojson` |
| `geojson_to_raster` | `regions.geojson` | `resolution` (`0.05`), `nodata` (0–255), `compression` | `<name>_raster.tif` |
| `reproject` | `regions.geojson`, `elevation.tif` | `target_epsg` (`3857`) — accepts vector **and** raster | `<name>_epsg<code>.geojson`/`.tif` |
| `geojson_to_shapefile` | `regions.geojson` | — none — | `<name>_shapefile.zip` |
| `shapefile_to_geojson` | `regions_shapefile.zip` | — none — | `<name>.geojson` |
| `geojson_to_gpkg` | `regions.geojson` | — none — | `<name>.gpkg` |
| `gpkg_to_geojson` | `regions.gpkg` | — none — | `<name>.geojson` |
| `geojson_to_kml` | `regions.geojson` | — none — | `<name>.kml` |
| `kml_to_geojson` | `regions.kml` | — none — (`.kmz` also accepted) | `<name>.geojson` |
| `multiband_to_cogs` | `rgb.tif` | — none — | `<name>_bands.zip` |
| `geojson_to_coco` | `regions.geojson` | — none — | `<name>_coco.json` |
| `coco_to_geojson` | `regions_coco.json` | — none — | `<name>.geojson` |

> **Which parameter goes where:** `target_epsg` → `reproject` only · `resolution` →
> `geojson_to_raster` only · `band` → `raster_to_geojson` only · `compression`/`nodata`
> → `geotiff_to_cog` and `geojson_to_raster` · `blocksize` → `geotiff_to_cog` only.
> Any parameter that doesn't apply to the chosen conversion is ignored.

All vector samples cover the same two small polygons (`Region A`, `Region B`) near
10–11°E / 50°N so outputs are easy to eyeball; rasters share that footprint.

## How to test one conversion

**Swagger UI** (easiest): open <http://localhost:8000/docs> → `POST /api/upload` →
*Try it out* → choose the file from the matching folder, type the `conversion` value,
execute, then poll `GET /api/tasks/{task_id}` and download.

**curl** (from the repo root):

```bash
# 1. Upload + queue (returns {"task_id": "...", "status": "pending"})
curl -X POST http://localhost:8000/api/upload \
  -F 'file=@test cases/geojson_to_csv/regions.geojson' \
  -F 'conversion=geojson_to_csv'

# 2. Poll status until "completed"
curl http://localhost:8000/api/tasks/<TASK_ID>

# 3. Download the result
curl -OJ http://localhost:8000/api/download/<TASK_ID>
```

Swap the folder, filename, and `conversion` value to test any row above. Conversions
that take extra parameters:

```bash
# GeoTIFF -> COG with GDAL-like options
curl -X POST http://localhost:8000/api/upload \
  -F 'file=@test cases/geotiff_to_cog/elevation.tif' \
  -F 'conversion=geotiff_to_cog' -F 'compression=lzw' -F 'nodata=0' -F 'blocksize=256'

# Reprojection to Web Mercator
curl -X POST http://localhost:8000/api/upload \
  -F 'file=@test cases/reproject/regions.geojson' \
  -F 'conversion=reproject' -F 'target_epsg=3857'

# Raster -> GeoJSON (choose band); GeoJSON -> Raster (resolution)
curl -X POST http://localhost:8000/api/upload \
  -F 'file=@test cases/raster_to_geojson/landcover_mask.tif' \
  -F 'conversion=raster_to_geojson' -F 'band=1'
curl -X POST http://localhost:8000/api/upload \
  -F 'file=@test cases/geojson_to_raster/regions.geojson' \
  -F 'conversion=geojson_to_raster' -F 'resolution=0.05'
```

**Postman:** import [`../postman_collection.json`](../postman_collection.json). Each
upload request already points at the sample file in this folder and auto-saves the
returned `task_id` into a collection variable, so *Get task status* / *Download*
work with no manual copy-paste.

## Regenerating these files

They are produced by a script that builds one base GeoJSON and derives the rest with
the project's own conversion engine (guaranteeing they stay valid and consistent). If
you ever need to rebuild them, re-run that generator inside the backend container —
see the project [README](../README.md#7-sample-datasets--test-cases).
