"""Conversion engine dispatcher for the mandatory Top 5 conversions.

`run()` picks the right converter for a ConversionType, writes the output into
`output_dir`, and returns the produced file's path.
"""
from pathlib import Path

from app.conversions import (
    geojson_csv,
    geojson_raster,
    geotiff_cog,
    raster_geojson,
    reproject,
)
from app.models.task import ConversionType

RASTER_EXTS = {".tif", ".tiff"}


def run(
    conversion: "ConversionType | str",
    input_path: Path,
    output_dir: Path,
    *,
    target_epsg: int | None = None,
    resolution: float = 0.05,
) -> Path:
    """Run a conversion and return the path to the produced output file."""
    conversion = ConversionType(conversion)
    stem = input_path.stem

    if conversion is ConversionType.geojson_to_csv:
        out = output_dir / f"{stem}.csv"
        geojson_csv.geojson_to_csv(input_path, out)
    elif conversion is ConversionType.csv_to_geojson:
        out = output_dir / f"{stem}.geojson"
        geojson_csv.csv_to_geojson(input_path, out)
    elif conversion is ConversionType.geotiff_to_cog:
        out = output_dir / f"{stem}_cog.tif"
        geotiff_cog.geotiff_to_cog(input_path, out)
    elif conversion is ConversionType.raster_to_geojson:
        out = output_dir / f"{stem}.geojson"
        raster_geojson.raster_to_geojson(input_path, out)
    elif conversion is ConversionType.geojson_to_raster:
        out = output_dir / f"{stem}_raster.tif"
        geojson_raster.geojson_to_raster(input_path, out, resolution=resolution)
    elif conversion is ConversionType.reproject:
        epsg = target_epsg or 3857
        if input_path.suffix.lower() in RASTER_EXTS:
            out = output_dir / f"{stem}_epsg{epsg}.tif"
            reproject.reproject_raster(input_path, out, epsg)
        else:
            out = output_dir / f"{stem}_epsg{epsg}.geojson"
            reproject.reproject_vector(input_path, out, epsg)
    else:
        raise ValueError(f"Unsupported conversion: {conversion}")

    return out
