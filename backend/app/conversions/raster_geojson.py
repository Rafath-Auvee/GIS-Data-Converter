from pathlib import Path

import geopandas as gpd
import rasterio
from rasterio import features


def raster_to_geojson(src: Path, dst: Path, band: int = 1) -> None:
    with rasterio.open(src) as ds:
        data = ds.read(band)
        mask = data != 0
        if ds.nodata is not None:
            mask &= data != ds.nodata
        if data.dtype.name not in ("int16", "int32", "uint8", "uint16", "float32"):
            data = data.astype("float32")
        geoms = [
            {"type": "Feature", "properties": {"value": float(val)}, "geometry": geom}
            for geom, val in features.shapes(data, mask=mask, transform=ds.transform)
        ]
        crs = ds.crs

    if not geoms:
        raise ValueError("No features found to vectorize (raster mask is empty).")

    gdf = gpd.GeoDataFrame.from_features(geoms, crs=crs)
    if crs is not None and crs.to_epsg() not in (None, 4326):
        gdf = gdf.to_crs(4326)
    gdf.to_file(dst, driver="GeoJSON")
