from pathlib import Path

import geopandas as gpd
import rasterio
from rasterio.warp import Resampling, calculate_default_transform
from rasterio.warp import reproject as rio_reproject


def reproject_vector(src: Path, dst: Path, target_epsg: int = 3857) -> None:
    gdf = gpd.read_file(src)
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    gdf.to_crs(epsg=target_epsg).to_file(dst, driver="GeoJSON")


def reproject_raster(src: Path, dst: Path, target_epsg: int = 3857) -> None:
    dst_crs = f"EPSG:{target_epsg}"
    with rasterio.open(src) as ds:
        transform, width, height = calculate_default_transform(
            ds.crs, dst_crs, ds.width, ds.height, *ds.bounds
        )
        meta = ds.meta.copy()
        meta.update(
            {"crs": dst_crs, "transform": transform, "width": width, "height": height}
        )
        with rasterio.open(dst, "w", **meta) as out:
            for i in range(1, ds.count + 1):
                rio_reproject(
                    source=rasterio.band(ds, i),
                    destination=rasterio.band(out, i),
                    src_transform=ds.transform,
                    src_crs=ds.crs,
                    dst_transform=transform,
                    dst_crs=dst_crs,
                    resampling=Resampling.nearest,
                )
