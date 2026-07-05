"""GeoTIFF -> COG (mandatory conversion #2). Library: rio-cogeo."""
from pathlib import Path


def geotiff_to_cog(src: Path, dst: Path) -> None:
    """Convert a GeoTIFF into a Cloud-Optimized GeoTIFF.

    TODO (Step 3): rio_cogeo.cog_translate(src, dst, profile) with a chosen
    compression profile (e.g. deflate) and internal tiling/overviews.
    """
    raise NotImplementedError
