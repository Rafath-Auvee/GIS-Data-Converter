"""GeoJSON <-> KML/KMZ (Google Earth)."""
import tempfile
import zipfile
from pathlib import Path

import geopandas as gpd


def geojson_to_kml(src: Path, dst: Path) -> None:
    """Convert GeoJSON to a KML file."""
    gdf = gpd.read_file(src)
    gdf.to_file(dst, driver="KML")


def kml_to_geojson(src: Path, dst: Path) -> None:
    """Convert a KML or KMZ to GeoJSON (WGS84)."""
    with tempfile.TemporaryDirectory() as tmp:
        path = src
        if src.suffix.lower() == ".kmz":
            with zipfile.ZipFile(src) as zf:
                zf.extractall(tmp)
            path = next(Path(tmp).rglob("*.kml"), None)
            if path is None:
                raise ValueError("No .kml file found inside the .kmz.")
        gdf = gpd.read_file(path)
    if gdf.crs is not None and gdf.crs.to_epsg() not in (None, 4326):
        gdf = gdf.to_crs(4326)
    gdf.to_file(dst, driver="GeoJSON")
