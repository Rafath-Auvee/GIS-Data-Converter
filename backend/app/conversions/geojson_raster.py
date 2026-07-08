from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio import features
from rasterio.transform import from_bounds


def geojson_to_raster(
    src: Path,
    dst: Path,
    resolution: float = 0.05,
    *,
    nodata: float | None = None,
    compression: str | None = None,
) -> None:
    gdf = gpd.read_file(src)
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")

    fill = 0
    if nodata is not None:
        if not 0 <= nodata <= 255:
            raise ValueError("NoData must be between 0 and 255 for a uint8 raster.")
        fill = int(nodata)

    minx, miny, maxx, maxy = gdf.total_bounds
    width = max(1, int(np.ceil((maxx - minx) / resolution)))
    height = max(1, int(np.ceil((maxy - miny) / resolution)))
    transform = from_bounds(minx, miny, maxx, maxy, width, height)

    shapes = ((geom, 1) for geom in gdf.geometry if geom is not None)
    raster = features.rasterize(
        shapes, out_shape=(height, width), transform=transform, fill=fill, dtype="uint8"
    )

    creation: dict[str, object] = {}
    codec = (compression or "deflate").lower()
    if codec not in {"none", "no", "raw"}:
        creation["compress"] = codec

    with rasterio.open(
        dst,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=1,
        dtype="uint8",
        crs=gdf.crs.to_wkt(),
        transform=transform,
        nodata=nodata,
        **creation,
    ) as out:
        out.write(raster, 1)
