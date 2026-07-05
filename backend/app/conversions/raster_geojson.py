"""COG / Raster -> GeoJSON (mandatory conversion #3). Library: rasterio.features."""
from pathlib import Path


def raster_to_geojson(src: Path, dst: Path, band: int = 1) -> None:
    """Polygonize raster features (e.g. a binary mask) into GeoJSON polygons.

    TODO (Step 3): read band with rasterio -> rasterio.features.shapes over the
    mask -> assemble features -> write GeoJSON (in the raster CRS or WGS84).
    """
    raise NotImplementedError
