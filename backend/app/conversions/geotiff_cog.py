"""GeoTIFF -> COG (mandatory conversion #2). Library: rio-cogeo."""
from pathlib import Path

from rio_cogeo.cogeo import cog_translate
from rio_cogeo.profiles import cog_profiles


def geotiff_to_cog(src: Path, dst: Path) -> None:
    """Translate a GeoTIFF into a Cloud-Optimized GeoTIFF (deflate-compressed,
    internally tiled, with overviews)."""
    profile = cog_profiles.get("deflate")
    cog_translate(str(src), str(dst), profile, in_memory=False, quiet=True)
