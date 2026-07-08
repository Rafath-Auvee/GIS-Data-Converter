import tempfile
import zipfile
from pathlib import Path

import rasterio
from rio_cogeo.cogeo import cog_translate
from rio_cogeo.profiles import cog_profiles


def multiband_to_cogs(src: Path, dst: Path) -> None:
    profile = cog_profiles.get("deflate")
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        with rasterio.open(src) as ds:
            meta = ds.meta.copy()
            for b in range(1, ds.count + 1):
                band = ds.read(b)
                single = tmpdir / f"_band_{b}.tif"
                m = meta.copy()
                m.update(count=1)
                with rasterio.open(single, "w", **m) as out:
                    out.write(band, 1)
                cog = tmpdir / f"{src.stem}_band{b}_cog.tif"
                cog_translate(str(single), str(cog), profile, in_memory=False, quiet=True)
                single.unlink()
        with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in sorted(tmpdir.glob("*_cog.tif")):
                zf.write(f, f.name)
