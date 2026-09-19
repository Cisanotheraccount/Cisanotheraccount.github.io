"""Prepare full-detail 2.1 hero JPEGs and preserve the current work photograph.

Run with Python + Pillow. Existing /v-next exports are verified and referenced,
never regenerated. Only public/v2-1/backgrounds is written. The original sRGB
ICC bytes, exposure, saturation and established crop are preserved. Public
derivatives omit EXIF/GPS. Source files are located in the local content library;
normal website builds do not run this script or require those private originals.
The Lightroom work image has its own lossless preparation script:
prepare-landscape-work-background-v21.py. Never re-encode it here.
"""

from hashlib import sha256
from pathlib import Path
import argparse
import io
import json
import os

from PIL import Image, ImageCms, ImageOps, JpegImagePlugin


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/v2-1/backgrounds"
SPECS = {
    "hero": {
        "source": "内容资料/03_摄影与平面设计合集/摄影/首页背景原图/201A3976.jpg",
        "sourceSha256": "5d4f83c4c09adcce5859f836f08d842222ab65e9494e93a70226059d99556af0",
        "sourceSize": (8192, 5464),
        "provenance": "public/v-next/background/provenance.json",
        "variantsKey": "derivatives",
        "widths": (5120, 6144, 8192),
        "prefix": "stars",
        "quality": 98,
        "crop": None,
    },
}


def digest(path):
    result = sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def record(path, size):
    return {
        "url": "/" + path.relative_to(ROOT / "public").as_posix(),
        "width": size[0],
        "height": size[1],
        "bytes": path.stat().st_size,
        "sha256": digest(path),
    }


def verify_jpeg(path, size, icc):
    with Image.open(path) as image:
        image.load()
        require(image.format == "JPEG" and image.mode == "RGB", f"Not RGB JPEG: {path}")
        require(image.size == size, f"Unexpected dimensions: {path}")
        require(image.info.get("icc_profile") == icc, f"Source ICC was not retained: {path}")
        require(not dict(image.getexif()) and not image.info.get("exif"), f"EXIF/GPS found: {path}")
        require(JpegImagePlugin.get_sampling(image) == 0, f"Expected 4:4:4 JPEG: {path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify existing assets/manifest without writing.")
    args = parser.parse_args()
    protected = {
        path: digest(path)
        for folder in (ROOT / "public/v-next/background", ROOT / "public/v-next/work-background")
        for path in folder.rglob("*") if path.is_file()
    }
    manifest = {}
    profiles = {}
    source_paths = []
    for name, spec in SPECS.items():
        source = ROOT / spec["source"]
        source_paths.append((source, spec["sourceSha256"]))
        require(digest(source) == spec["sourceSha256"], f"Original photograph changed: {source}")
        provenance = json.loads((ROOT / spec["provenance"]).read_text())
        require(provenance["sourceSha256"] == spec["sourceSha256"], f"Provenance source mismatch: {name}")
        with Image.open(source) as original:
            icc = original.info.get("icc_profile")
            require(bool(icc), f"Original ICC missing: {name}")
            profile = ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(icc))).strip()
            require("srgb" in profile.lower(), f"Non-sRGB input requires review: {profile}")
            profiles[name] = profile
            photo = ImageOps.exif_transpose(original).convert("RGB")
            require(photo.size == spec["sourceSize"], f"Unexpected oriented source dimensions: {name}")
        if spec["crop"]:
            require(provenance["crop"] == {"x": 0, "y": 1500, "width": 5464, "height": 3900},
                    "Published work crop changed; review star registration before exporting")
            photo = photo.crop(spec["crop"])
        require(photo.size == (provenance["width"], provenance["height"]), f"Crop size mismatch: {name}")
        variants = []
        for previous in provenance[spec["variantsKey"]]:
            path = ROOT / "public" / previous["url"].lstrip("/")
            require(path.is_relative_to(ROOT / "public/v-next"), f"Unexpected legacy asset path: {path}")
            size = (previous["width"], previous["height"])
            require(record(path, size) == previous, f"Published asset hash/bytes changed: {path}")
            verify_jpeg(path, size, icc)
            variants.append(previous)
        destination = OUTPUT / name
        if not args.check:
            destination.mkdir(parents=True, exist_ok=True)
        for width in spec["widths"]:
            require(width <= photo.width, "Upscaling is prohibited")
            size = (width, round(photo.height * width / photo.width))
            path = destination / f'{spec["prefix"]}-{width}.jpg'
            if not args.check:
                temporary = path.with_name(path.name + f".{os.getpid()}.tmp")
                try:
                    # Native-size exports skip resampling, but strip metadata and
                    # use the same verified JPEG/color encoding as smaller sizes.
                    resized = photo if photo.size == size else photo.resize(size, Image.Resampling.LANCZOS)
                    resized.save(temporary, "JPEG", quality=spec["quality"], subsampling=0,
                                 optimize=True, icc_profile=icc)
                    verify_jpeg(temporary, size, icc)
                    if path.exists():
                        require(digest(path) == digest(temporary),
                                f"Refusing to overwrite a different existing 2.1 asset: {path}")
                    else:
                        temporary.replace(path)
                finally:
                    temporary.unlink(missing_ok=True)
            verify_jpeg(path, size, icc)
            variants.append(record(path, size))
        manifest[name] = {"sourceSha256": spec["sourceSha256"], "width": photo.width,
                          "height": photo.height, "variants": variants}

    work = json.loads((OUTPUT / "work/provenance.json").read_text())
    require(work["sourceSha256"] == "43f6a67451e5a89db861f2e97950aaa7fe060e62553ee51d325e02c28d242ebb",
            "Prepare and review the current Lightroom work photograph first")
    require((work["width"], work["height"]) == (8192, 5464), "Work photograph dimensions changed")
    require(len(work["variants"]) == 1, "Expected the unchanged full-resolution Lightroom JPEG")
    variant = work["variants"][0]
    require(variant["url"] == "/v2-1/backgrounds/work/yellowstone-landscape-8192.jpg", "Unexpected work asset")
    require(record(ROOT / "public" / variant["url"].lstrip("/"), (8192, 5464)) == variant,
            "Current work JPEG no longer matches its provenance")
    manifest["work"] = {key: work[key] for key in ("sourceSha256", "width", "height", "variants")}

    for path, before in protected.items():
        require(digest(path) == before, f"Protected 2.0 asset changed: {path}")
    for path, expected in source_paths:
        require(digest(path) == expected, f"Original photograph changed during export: {path}")
    manifest_path = OUTPUT / "manifest.json"
    if args.check:
        require(json.loads(manifest_path.read_text()) == manifest, "Manifest does not match the verified files")
    else:
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"manifest": str(manifest_path.relative_to(ROOT)), "checkOnly": args.check,
                      "protectedFilesUnchanged": len(protected), "originalsUnchanged": True,
                      "iccProfiles": profiles, "publicExifGps": False, "backgrounds": manifest}, indent=2))


if __name__ == "__main__":
    main()
