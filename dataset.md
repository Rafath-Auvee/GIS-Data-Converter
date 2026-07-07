# GeoTIFF Benchmark Files - `geotiff_sample_files.tar.gz`

A deep-dive into the PDF's **"GeoTIFF Benchmark Files"**. (For the vector dataset, see the
**`us-states.geojson`** section at the bottom.)

- **Source (from the PDF's Sample Datasets):**
  `https://s3.us-east-2.amazonaws.com/geotiff-benchmark-sample-files/geotiff_sample_files.tar.gz`
- **PDF description:** *"A packaged set of multiple GeoTIFF test files."*
- **Now extracted to:** `data/byte_50m.tif`, `data/int16_50m.tif`, `data/float32_50m.tif`

---

## 1. What is it?

`geotiff_sample_files.tar.gz` is a **compressed archive** (like a `.zip`) that bundles
**three test GeoTIFF images**. Two parts to the name:

- **`.tar`** = *tape archive* - many files packed into one.
- **`.gz`** = *gzip* - that archive is then compressed to shrink it.

So `.tar.gz` = "several files glued together, then zipped." You **extract** it to get the
real files back out (see [section 8](#8-how-to-download--extract)).

Inside are **3 GeoTIFFs of the same scene**, deliberately built to differ in **one thing:
the pixel data type**. That is the whole point of the set.

---

## 2. What is a GeoTIFF? (quick background)

A **raster** is an image = a **grid of pixels**, each holding a number.

- **TIFF** = a high-quality image format (a grid of pixels), but with **no location** info.
- **GeoTIFF** = a TIFF **plus** embedded geographic tags (where on Earth it sits, and in
  which coordinate system). This is *the* standard format for satellite and aerial imagery.

All three benchmark files are **single-band** (one grid = grayscale) and **uncompressed**.

---

## 3. What's inside - the real specs

| File | Dimensions (px) | Data type | Bits/pixel | Pixels | File size |
|---|---|---|---|---|---|
| `byte_50m.tif` | 7458 × 6697 | `uint8` | 8 | ~50 million | ~50 MB |
| `int16_50m.tif` | 5205 × 4800 | `int16` | 16 | ~25 million | ~50 MB |
| `float32_50m.tif` | 3970 × 3147 | `float32` | 32 | ~12.5 million | ~50 MB |

**The clever design:** every file is the **same ~50 MB**, but the pixel counts differ.
Why? Because bigger data types use more bytes **per pixel**:

```
byte    : 1 byte/pixel  × 50.0M pixels ≈ 50 MB
int16   : 2 bytes/pixel × 25.0M pixels ≈ 50 MB
float32 : 4 bytes/pixel × 12.5M pixels ≈ 50 MB
```

So **"50m" means ~50 MB of raw data**, *not* 50 metres and *not* (except by coincidence for
`byte`) 50 megapixels. Keeping the byte-size constant makes them a fair **benchmark** -
each takes similar time to read/write, so you're measuring the *data type*, not the size.

---

## 4. The key concept: pixel data types

Every pixel stores a number. The **data type** decides *what kind* of number, which sets its
**range** and **memory cost**. This is the single most important idea here.

| Type | Full name | Range | Bytes | Typical real-world use |
|---|---|---|---|---|
| **`uint8`** | 8-bit unsigned integer | `0` to `255` | 1 | ordinary photos / imagery, RGB bands |
| **`int16`** | 16-bit signed integer | `-32,768` to `32,767` | 2 | **elevation** (DEM), temperature (can be negative) |
| **`float32`** | 32-bit floating point | tiny decimals to huge | 4 | **scientific** values: NDVI (vegetation), reflectance, rainfall |

Why three different types exist:

- A **satellite photo** only needs `0-255` brightness → `uint8` (small, cheap).
- **Elevation** can be `-400 m` (Dead Sea) to `8848 m` (Everest), including negatives and
  values above 255 → needs `int16`.
- A **vegetation index** like NDVI is a decimal from `-1.0` to `+1.0` → needs `float32`
  (integers can't store `0.734`).

**Trade-off:** richer types cost more memory. `float32` uses **4×** the bytes of `uint8` for
the same number of pixels - which is exactly why the `float32` file has fewer pixels.

---

## 5. Why is it necessary? Why do we need these?

This project's mandatory conversion **#2 is GeoTIFF → COG**. To trust that converter, it must
work on **every kind of raster it will meet in the real world** - not just simple photos.

These three files test exactly that:

1. **Data-type correctness.** Compression, NoData handling, and overview (zoom) generation
   behave **differently** for `uint8`, `int16`, and `float32`. A converter that works on a
   `byte` image can silently corrupt a `float32` one. These files catch that.
2. **Real-world coverage.** `int16` = elevation models, `float32` = scientific rasters
   (NDVI, temperature). If the tool only handled `uint8`, it would fail on half of real GIS
   data.
3. **Performance / stress test.** At ~50 MB each, they are big enough that conversion takes
   *real time* - so they exercise the **async Celery worker** and make the **progress bar**
   actually move (a tiny file finishes instantly and proves nothing).
4. **Fair benchmarking.** Same byte-size across types = an apples-to-apples speed comparison.

In short: **they prove the raster pipeline is robust, not just lucky on easy input.**

---

## 6. What does it do in this project?

| Used by | How |
|---|---|
| **GeoTIFF → COG** (mandatory #2) | Primary target - convert each to a Cloud-Optimized GeoTIFF and confirm all 3 data types produce valid COGs. |
| **Raster → GeoJSON** (mandatory #3) | Can be polygonized to vector shapes. |
| **Reprojection** (mandatory #5) | Can be reprojected to another EPSG (e.g. Web Mercator). |
| **Async worker + progress** (bonus) | Their size makes background processing and live progress meaningful. |

**What is COG (the conversion target)?** A **Cloud-Optimized GeoTIFF** is a normal GeoTIFF
re-laid-out for the web: internally **tiled** and given **overviews** (pre-shrunk zoom
copies), so a map viewer can stream just the little piece it needs instead of the whole
50 MB. Turning these benchmark files into COGs is the exact job of conversion #2.

---

## 7. Data type - summary card

```
uint8    0 .. 255              1 byte    photos, imagery
int16    -32768 .. 32767       2 bytes   elevation, temperature
float32  decimals, huge range  4 bytes   NDVI, scientific data
```

More range / precision  →  more bytes per pixel  →  fewer pixels for the same file size.

---

## 8. How to download & extract

If `data/` is empty, recreate it from the PDF's source:

```bash
mkdir -p data

# Download the archive (slow S3 server; --retry helps)
curl -fL --retry 5 -o geotiff_sample_files.tar.gz \
  https://s3.us-east-2.amazonaws.com/geotiff-benchmark-sample-files/geotiff_sample_files.tar.gz

# Extract the 3 GeoTIFFs into data/
tar -xzf geotiff_sample_files.tar.gz -C data/
```

- `tar -x` = extract, `-z` = decompress gzip, `-f` = from this file, `-C data/` = into `data/`.
- Result: `data/byte_50m.tif`, `data/int16_50m.tif`, `data/float32_50m.tif`.

Inspect a file's type on any machine:

```bash
file data/int16_50m.tif
# -> TIFF image data ... width=5205, height=4800, bps=16 ...   (bps = bits per sample)
```

---

## 9. One-line summary

`geotiff_sample_files.tar.gz` is the PDF's **GeoTIFF Benchmark Files** - three same-sized
(~50 MB) single-band GeoTIFFs that differ only in **pixel data type** (`uint8` / `int16` /
`float32`), used to prove the **GeoTIFF → COG** converter handles every real-world raster
type correctly and to stress-test the async worker.

---

# GeoJSON - `us-states.geojson`

The PDF's **"World Countries Boundary"** dataset (the link it gives is actually **US states** -
a quirk in the PDF). A small, friendly **vector** file - the perfect counterpart to the
**raster** benchmark files above.

- **Source:** `https://raw.githubusercontent.com/python-visualization/folium/master/examples/data/us-states.json`
- **In `data/`:** `data/us-states.geojson` (88 KB, 50 features)

## 1. What it is

`us-states.geojson` describes the **50 US states as shapes**. Where the benchmark files are
*raster* (pixels), this is *vector* (outlines) - the other half of the GIS world.

## 2. What is GeoJSON?

**GeoJSON** = geographic data written as **JSON text**. It is the web standard: human-readable,
and always in **WGS84** (longitude/latitude degrees). It stores **features**, where each
feature = a **shape** + some **facts** about it.

## 3. What's inside - structure walkthrough

Open the file and you see this shape:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "AL",
      "properties": { "name": "Alabama" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [ [ [ -87.359296, 35.00118 ], ... ] ]
      }
    }
  ]
}
```

| Piece | Meaning |
|---|---|
| `FeatureCollection` | the whole file = a list of features |
| `Feature` | one item - **50 of them**, one per state |
| `id` / `properties` | the **attributes**: state code (`"AL"`) and `name` (`"Alabama"`) |
| `geometry` | the **shape**: a `Polygon` (or `MultiPolygon` for states with islands) |
| `coordinates` | the corners, each as `[longitude, latitude]` |

## 4. Vector vs the benchmark (the two GIS families)

| | `us-states.geojson` | benchmark `*.tif` |
|---|---|---|
| Family | **Vector** | **Raster** |
| Made of | shapes (polygons) | pixels (a grid) |
| Zoom in → | crisp math edges | individual squares |
| Stores | boundaries + names | a number per pixel |
| Think of it as | a map outline | a photo |

Seeing both side by side is the fastest way to *get* the vector/raster split.

## 5. Geometry: how a polygon works

A **Polygon** is a **closed loop** of coordinates - the last point equals the first, so the
ring closes. Each coordinate is `[lon, lat]` (note: **longitude first** in GeoJSON). A state
with separate islands (like Hawaii) uses a **MultiPolygon** - many rings as one feature.

## 6. Coordinate system (CRS)

Per the GeoJSON standard, coordinates are **WGS84 / EPSG:4326** - plain longitude/latitude in
degrees. That is exactly why running **Reprojection** on it (to e.g. Web Mercator `3857`) is a
meaningful conversion.

## 7. Why we need it / what it does

Small, real, and instantly recognizable (everyone knows the US map), so it is the ideal input
to demo the **vector** conversions:

| Conversion | What happens |
|---|---|
| **GeoJSON → CSV** | each state becomes a spreadsheet row (name + geometry as WKT text) |
| **GeoJSON → Raster** | the state outlines are "burned" into a pixel grid |
| **Reprojection** | coordinates convert from WGS84 to another EPSG (e.g. Web Mercator) |

At only 88 KB with 50 clean features, conversions finish instantly and the output is easy to
eyeball for correctness.

## 8. How to download

```bash
mkdir -p data
curl -fsSL -o data/us-states.geojson \
  https://raw.githubusercontent.com/python-visualization/folium/master/examples/data/us-states.json
```

Note: the PDF links the `github.com/.../blob/...` **web page**; the actual file is the
`raw.githubusercontent.com/...` URL above.

## 9. One-line summary

`us-states.geojson` is a tiny **GeoJSON** of the **50 US states as polygons** (WGS84) - the
PDF's "World Countries Boundary" sample, and the **vector** counterpart to the raster
benchmark files. It drives GeoJSON→CSV, GeoJSON→Raster, and Reprojection.
