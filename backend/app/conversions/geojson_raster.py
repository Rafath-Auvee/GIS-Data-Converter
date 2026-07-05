"""GeoJSON -> Raster (mandatory conversion #4). Library: rasterio.features."""
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio import features
from rasterio.transform import from_bounds


def geojson_to_raster(src: Path, dst: Path, resolution: float = 0.05) -> None:
    """Burn vector features into a single-band uint8 GeoTIFF grid.

    `resolution` is in the units of the data's CRS (degrees for EPSG:4326).
    """
    gdf = gpd.read_file(src)
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")

    minx, miny, maxx, maxy = gdf.total_bounds
    width = max(1, int(np.ceil((maxx - minx) / resolution)))
    height = max(1, int(np.ceil((maxy - miny) / resolution)))
    transform = from_bounds(minx, miny, maxx, maxy, width, height)

    shapes = ((geom, 1) for geom in gdf.geometry if geom is not None)
    raster = features.rasterize(
        shapes, out_shape=(height, width), transform=transform, fill=0, dtype="uint8"
    )

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
        compress="deflate",
    ) as out:
        out.write(raster, 1)
