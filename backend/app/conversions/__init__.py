from pathlib import Path

from app.conversions import (
    coco,
    geojson_csv,
    geojson_raster,
    geopackage,
    geotiff_cog,
    kml,
    multiband,
    raster_geojson,
    reproject,
    shapefile,
)
from app.models.task import ConversionType

RASTER_EXTS = {".tif", ".tiff"}


def run(
    conversion: "ConversionType | str",
    input_path: Path,
    output_dir: Path,
    *,
    target_epsg: int | None = None,
    resolution: float | None = None,
    band: int | None = None,
    compression: str | None = None,
    nodata: float | None = None,
    blocksize: int | None = None,
) -> Path:
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
        geotiff_cog.geotiff_to_cog(
            input_path, out, compression=compression, nodata=nodata, blocksize=blocksize
        )
    elif conversion is ConversionType.raster_to_geojson:
        out = output_dir / f"{stem}.geojson"
        raster_geojson.raster_to_geojson(input_path, out, band=band or 1)
    elif conversion is ConversionType.geojson_to_raster:
        out = output_dir / f"{stem}_raster.tif"
        geojson_raster.geojson_to_raster(
            input_path,
            out,
            resolution=resolution or 0.05,
            nodata=nodata,
            compression=compression,
        )
    elif conversion is ConversionType.reproject:
        epsg = target_epsg or 3857
        if input_path.suffix.lower() in RASTER_EXTS:
            out = output_dir / f"{stem}_epsg{epsg}.tif"
            reproject.reproject_raster(input_path, out, epsg)
        else:
            out = output_dir / f"{stem}_epsg{epsg}.geojson"
            reproject.reproject_vector(input_path, out, epsg)

    elif conversion is ConversionType.geojson_to_shapefile:
        out = output_dir / f"{stem}_shapefile.zip"
        shapefile.geojson_to_shapefile(input_path, out)
    elif conversion is ConversionType.shapefile_to_geojson:
        out = output_dir / f"{stem}.geojson"
        shapefile.shapefile_to_geojson(input_path, out)
    elif conversion is ConversionType.geojson_to_gpkg:
        out = output_dir / f"{stem}.gpkg"
        geopackage.geojson_to_gpkg(input_path, out)
    elif conversion is ConversionType.gpkg_to_geojson:
        out = output_dir / f"{stem}.geojson"
        geopackage.gpkg_to_geojson(input_path, out)
    elif conversion is ConversionType.geojson_to_kml:
        out = output_dir / f"{stem}.kml"
        kml.geojson_to_kml(input_path, out)
    elif conversion is ConversionType.kml_to_geojson:
        out = output_dir / f"{stem}.geojson"
        kml.kml_to_geojson(input_path, out)
    elif conversion is ConversionType.multiband_to_cogs:
        out = output_dir / f"{stem}_bands.zip"
        multiband.multiband_to_cogs(input_path, out)
    elif conversion is ConversionType.geojson_to_coco:
        out = output_dir / f"{stem}_coco.json"
        coco.geojson_to_coco(input_path, out)

    else:
        raise ValueError(f"Unsupported conversion: {conversion}")

    return out
