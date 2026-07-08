import json
from pathlib import Path

import geopandas as gpd


def geojson_to_coco(src: Path, dst: Path) -> None:
    gdf = gpd.read_file(src)
    minx, miny, maxx, maxy = gdf.total_bounds

    coco = {
        "images": [
            {
                "id": 1,
                "file_name": src.name,
                "width": float(maxx - minx),
                "height": float(maxy - miny),
            }
        ],
        "categories": [{"id": 1, "name": "feature", "supercategory": "geometry"}],
        "annotations": [],
    }

    ann_id = 1
    for geom in gdf.geometry:
        if geom is None:
            continue
        parts = list(geom.geoms) if geom.geom_type.startswith("Multi") else [geom]
        for poly in parts:
            if poly.geom_type != "Polygon":
                continue
            xs, ys = poly.exterior.coords.xy
            seg: list[float] = []
            for x, y in zip(xs, ys):
                seg.extend([float(x), float(y)])
            bx0, by0, bx1, by1 = poly.bounds
            coco["annotations"].append(
                {
                    "id": ann_id,
                    "image_id": 1,
                    "category_id": 1,
                    "bbox": [float(bx0), float(by0), float(bx1 - bx0), float(by1 - by0)],
                    "area": float(poly.area),
                    "segmentation": [seg],
                    "iscrowd": 0,
                }
            )
            ann_id += 1

    with open(dst, "w", encoding="utf-8") as f:
        json.dump(coco, f)
