"""Conversion engine: the mandatory Top 5 geospatial conversions.

Each converter takes an input path and writes to an output path. The REGISTRY
maps a ConversionType to its callable so routers/workers can dispatch generically.
"""
from app.conversions import (
    geojson_csv,
    geojson_raster,
    geotiff_cog,
    raster_geojson,
    reproject,
)
from app.models.task import ConversionType

REGISTRY = {
    ConversionType.geojson_to_csv: geojson_csv.geojson_to_csv,
    ConversionType.csv_to_geojson: geojson_csv.csv_to_geojson,
    ConversionType.geotiff_to_cog: geotiff_cog.geotiff_to_cog,
    ConversionType.raster_to_geojson: raster_geojson.raster_to_geojson,
    ConversionType.geojson_to_raster: geojson_raster.geojson_to_raster,
    ConversionType.reproject: reproject.reproject_vector,
}
