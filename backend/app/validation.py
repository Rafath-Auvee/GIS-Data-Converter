import json
from pathlib import Path

ALLOWED_EXTENSIONS: dict[str, set[str]] = {
    "geojson_to_csv": {".geojson", ".json"},
    "csv_to_geojson": {".csv"},
    "geotiff_to_cog": {".tif", ".tiff"},
    "raster_to_geojson": {".tif", ".tiff"},
    "geojson_to_raster": {".geojson", ".json"},
    "reproject": {".geojson", ".json", ".gpkg", ".kml", ".tif", ".tiff"},
    "geojson_to_shapefile": {".geojson", ".json"},
    "shapefile_to_geojson": {".zip"},
    "geojson_to_gpkg": {".geojson", ".json"},
    "gpkg_to_geojson": {".gpkg"},
    "geojson_to_kml": {".geojson", ".json"},
    "kml_to_geojson": {".kml", ".kmz"},
    "multiband_to_cogs": {".tif", ".tiff"},
    "geojson_to_coco": {".geojson", ".json"},
    "coco_to_geojson": {".json"},
}

# Conversions whose input is genuinely GeoJSON-shaped (as opposed to some other
# JSON-based format, e.g. COCO, that happens to share the .json extension).
GEOJSON_INPUT_CONVERSIONS = {
    "geojson_to_csv",
    "geojson_to_raster",
    "reproject",
    "geojson_to_shapefile",
    "geojson_to_gpkg",
    "geojson_to_kml",
    "geojson_to_coco",
}

_GEOJSON_TYPES = {
    "FeatureCollection",
    "Feature",
    "Point",
    "MultiPoint",
    "LineString",
    "MultiLineString",
    "Polygon",
    "MultiPolygon",
    "GeometryCollection",
}


def validate_extension(conversion: str, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    allowed = ALLOWED_EXTENSIONS.get(conversion, set())
    if ext not in allowed:
        raise ValueError(
            f"File type '{ext}' is not accepted for '{conversion}'. "
            f"Expected one of: {', '.join(sorted(allowed))}."
        )
    return ext


def validate_geojson(path: Path) -> None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise ValueError(f"Not valid JSON: {e}") from e
    if not isinstance(data, dict) or data.get("type") not in _GEOJSON_TYPES:
        raise ValueError("Not a valid GeoJSON object (missing or unknown 'type').")
    if data["type"] == "FeatureCollection" and not isinstance(data.get("features"), list):
        raise ValueError("GeoJSON FeatureCollection is missing a 'features' array.")


def validate_geotiff(path: Path) -> None:
    import rasterio

    try:
        with rasterio.open(path) as ds:
            if ds.count < 1:
                raise ValueError("GeoTIFF has no raster bands.")
            _ = ds.crs
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Could not read GeoTIFF: {e}") from e
