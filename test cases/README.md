# Test Cases — one sample input per conversion

Small, self-contained sample files for **every** conversion the service supports.
Unlike [`data/`](../data/) (large real-world datasets, git-ignored), these are tiny,
committed to the repo, and each was **verified end-to-end** against the actual
conversion engine (all 16 produce valid, non-empty output).

Layout: one folder per conversion, named exactly like the `conversion` form field
the API expects, with the input file(s) inside.

| Folder (`conversion` value) | Sample file | What it demonstrates |
|---|---|---|
| `geojson_to_csv` | `regions.geojson` | 2 polygons + attributes → CSV (properties + `geometry_wkt`) |
| `csv_to_geojson` | `cities.csv` | Point table with `longitude`/`latitude` columns → GeoJSON |
| `geotiff_to_cog` | `elevation.tif` | Single-band float32 GeoTIFF → Cloud-Optimized GeoTIFF |
| `raster_to_geojson` | `landcover_mask.tif` | Classified uint8 mask (2 blocks) → polygonized features |
| `geojson_to_raster` | `regions.geojson` | Vector polygons → burned into a uint8 raster grid |
| `reproject` | `regions.geojson`, `elevation.tif` | Vector **and** raster reprojection (WGS84 → target EPSG) |
| `geojson_to_shapefile` | `regions.geojson` | GeoJSON → zipped ESRI Shapefile |
| `shapefile_to_geojson` | `regions_shapefile.zip` | Zipped Shapefile → GeoJSON |
| `geojson_to_gpkg` | `regions.geojson` | GeoJSON → GeoPackage (`.gpkg`) |
| `gpkg_to_geojson` | `regions.gpkg` | GeoPackage → GeoJSON |
| `geojson_to_kml` | `regions.geojson` | GeoJSON → KML (Google Earth) |
| `kml_to_geojson` | `regions.kml` | KML → GeoJSON (`.kmz` also accepted) |
| `multiband_to_cogs` | `rgb.tif` | 3-band GeoTIFF → one single-band COG per band (zipped) |
| `geojson_to_coco` | `regions.geojson` | GeoJSON polygons → COCO annotation JSON |
| `coco_to_geojson` | `regions_coco.json` | COCO annotations → GeoJSON |

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
