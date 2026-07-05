"""GeoJSON <-> CSV (mandatory conversion #1). Library: geopandas + shapely."""
from pathlib import Path


def geojson_to_csv(src: Path, dst: Path) -> None:
    """Export GeoJSON features (geometry as WKT + properties) to CSV.

    TODO (Step 2): geopandas.read_file(src) -> write geometry as WKT -> to_csv(dst).
    """
    raise NotImplementedError


def csv_to_geojson(
    src: Path, dst: Path, lon: str = "longitude", lat: str = "latitude"
) -> None:
    """Build GeoJSON point features from tabular data with coordinate columns.

    TODO (Step 2): pandas.read_csv -> geopandas.points_from_xy -> to_file(dst).
    """
    raise NotImplementedError
