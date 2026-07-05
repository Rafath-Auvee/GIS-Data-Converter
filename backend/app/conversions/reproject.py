"""Reprojection between EPSG systems (mandatory conversion #5).

Libraries: geopandas / pyproj (vector), rasterio.warp (raster).
"""
from pathlib import Path


def reproject_vector(src: Path, dst: Path, target_epsg: int = 3857) -> None:
    """Reproject a vector dataset to a target EPSG CRS.

    TODO (Step 3): geopandas.read_file(src).to_crs(epsg=target_epsg).to_file(dst).
    """
    raise NotImplementedError


def reproject_raster(src: Path, dst: Path, target_epsg: int = 3857) -> None:
    """Reproject a raster to a target EPSG CRS.

    TODO (Step 3): rasterio.warp.calculate_default_transform + reproject each band.
    """
    raise NotImplementedError
