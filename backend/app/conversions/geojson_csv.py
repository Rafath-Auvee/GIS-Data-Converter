from pathlib import Path

import geopandas as gpd
import pandas as pd


def geojson_to_csv(src: Path, dst: Path) -> None:
    gdf = gpd.read_file(src)
    geom_col = gdf.geometry.name
    df = pd.DataFrame(gdf.drop(columns=[geom_col]))
    df["geometry_wkt"] = gdf.geometry.to_wkt()
    df.to_csv(dst, index=False)


def csv_to_geojson(src: Path, dst: Path) -> None:
    df = pd.read_csv(src)
    cols = {c.lower(): c for c in df.columns}

    if "geometry_wkt" in cols:
        geometry = gpd.GeoSeries.from_wkt(df[cols["geometry_wkt"]])
        gdf = gpd.GeoDataFrame(
            df.drop(columns=[cols["geometry_wkt"]]), geometry=geometry, crs="EPSG:4326"
        )
    else:
        lon = cols.get("longitude") or cols.get("lon") or cols.get("lng") or cols.get("x")
        lat = cols.get("latitude") or cols.get("lat") or cols.get("y")
        if not lon or not lat:
            raise ValueError(
                "CSV needs a 'geometry_wkt' column or longitude/latitude columns."
            )
        gdf = gpd.GeoDataFrame(
            df, geometry=gpd.points_from_xy(df[lon], df[lat]), crs="EPSG:4326"
        )

    gdf.to_file(dst, driver="GeoJSON")
