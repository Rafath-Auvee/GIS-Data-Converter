"""GeoJSON -> Raster (mandatory conversion #4). Library: rasterio.features."""
from pathlib import Path


def geojson_to_raster(src: Path, dst: Path, resolution: float = 0.001) -> None:
    """Rasterize vector features into a grid GeoTIFF (for ML datasets).

    TODO (Step 3): read features with geopandas -> derive transform from bounds +
    resolution -> rasterio.features.rasterize -> write a GeoTIFF.
    """
    raise NotImplementedError
