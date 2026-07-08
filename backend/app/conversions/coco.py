import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import Polygon


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


def coco_to_geojson(src: Path, dst: Path) -> None:
    with open(src, "r", encoding="utf-8") as f:
        coco = json.load(f)

    categories = {c["id"]: c.get("name", str(c["id"])) for c in coco.get("categories", [])}

    geoms = []
    properties = []
    for ann in coco.get("annotations", []):
        polygon = None
        seg = ann.get("segmentation")
        if seg and isinstance(seg, list) and len(seg) > 0 and isinstance(seg[0], list):
            coords = seg[0]
            ring = list(zip(coords[0::2], coords[1::2]))
            if len(ring) >= 3:
                polygon = Polygon(ring)
        if polygon is None:
            bbox = ann.get("bbox")
            if bbox and len(bbox) == 4:
                x, y, w, h = bbox
                polygon = Polygon([(x, y), (x + w, y), (x + w, y + h), (x, y + h)])
        if polygon is None or not polygon.is_valid:
            continue

        geoms.append(polygon)
        properties.append(
            {
                "annotation_id": ann.get("id"),
                "category": categories.get(ann.get("category_id"), None),
                "area": ann.get("area"),
                "iscrowd": ann.get("iscrowd", 0),
            }
        )

    gdf = gpd.GeoDataFrame(properties, geometry=geoms, crs="EPSG:4326")
    gdf.to_file(dst, driver="GeoJSON")
