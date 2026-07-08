"""GeoJSON <-> Shapefile (ESRI). Shapefiles are multi-file, so they travel as a .zip."""
import tempfile
import zipfile
from pathlib import Path

import geopandas as gpd


def geojson_to_shapefile(src: Path, dst: Path) -> None:
    """Convert GeoJSON to a zipped ESRI Shapefile (.shp/.shx/.dbf/.prj inside a .zip)."""
    gdf = gpd.read_file(src)
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        shp = tmpdir / f"{dst.stem}.shp"
        gdf.to_file(shp, driver="ESRI Shapefile")
        with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in tmpdir.iterdir():
                zf.write(f, f.name)


def shapefile_to_geojson(src: Path, dst: Path) -> None:
    """Convert a zipped Shapefile to GeoJSON (WGS84)."""
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        with zipfile.ZipFile(src) as zf:
            zf.extractall(tmpdir)
        shp = next(tmpdir.rglob("*.shp"), None)
        if shp is None:
            raise ValueError("No .shp file found inside the uploaded .zip.")
        gdf = gpd.read_file(shp)
    if gdf.crs is not None and gdf.crs.to_epsg() not in (None, 4326):
        gdf = gdf.to_crs(4326)
    gdf.to_file(dst, driver="GeoJSON")
