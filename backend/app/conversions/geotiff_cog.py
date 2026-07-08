"""GeoTIFF -> COG (mandatory conversion #2). Library: rio-cogeo."""
from pathlib import Path

from rio_cogeo.cogeo import cog_translate
from rio_cogeo.profiles import cog_profiles

VALID_COMPRESSIONS = {"deflate", "lzw", "zstd", "webp", "jpeg", "packbits", "raw"}


def _resolve_profile(compression: str | None, blocksize: int | None) -> dict:
    name = (compression or "deflate").lower()
    if name in {"none", "no", "raw"}:
        name = "raw"
    if name not in VALID_COMPRESSIONS:
        raise ValueError(
            f"Unsupported compression '{compression}'. "
            f"Choose one of: {', '.join(sorted(VALID_COMPRESSIONS - {'raw'}))}, none."
        )
    profile = cog_profiles.get(name)
    if blocksize:
        if blocksize % 16 != 0:
            raise ValueError("Block size must be a multiple of 16 (e.g. 128, 256, 512).")
        profile.update(blockxsize=blocksize, blockysize=blocksize)
    return profile


def geotiff_to_cog(
    src: Path,
    dst: Path,
    *,
    compression: str | None = None,
    nodata: float | None = None,
    blocksize: int | None = None,
) -> None:
    """Translate a GeoTIFF into a Cloud-Optimized GeoTIFF.

    Advanced GDAL controls: `compression` (deflate/lzw/zstd/webp/jpeg/none),
    `nodata` value, and internal tile `blocksize` (multiple of 16).
    """
    profile = _resolve_profile(compression, blocksize)
    cog_translate(
        str(src),
        str(dst),
        profile,
        nodata=nodata,
        in_memory=False,
        quiet=True,
    )
