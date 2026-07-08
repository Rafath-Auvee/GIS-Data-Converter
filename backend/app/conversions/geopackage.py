"""GeoJSON <-> GeoPackage (.gpkg)."""
from pathlib import Path

import geopandas as gpd


def geojson_to_gpkg(src: Path, dst: Path) -> None:
    """Convert GeoJSON to a GeoPackage."""
    gdf = gpd.read_file(src)
    gdf.to_file(dst, driver="GPKG")


def gpkg_to_geojson(src: Path, dst: Path) -> None:
    """Convert a GeoPackage (first layer) to GeoJSON (WGS84)."""
    gdf = gpd.read_file(src)
    if gdf.crs is not None and gdf.crs.to_epsg() not in (None, 4326):
        gdf = gdf.to_crs(4326)
    gdf.to_file(dst, driver="GeoJSON")
