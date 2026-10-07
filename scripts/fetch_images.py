#!/usr/bin/env python3
"""Download freely licensed cat photos from Wikimedia Commons.

Run ``python scripts/fetch_images.py [--only ragdoll,siamese] [--width 1200]``.
Review the downloaded photos manually before publishing them.
"""
import argparse
import html
import json
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "img", "cats")
CF = os.path.join(ROOT, "img", "credits.json")
UA = {"User-Agent": "MeowWikiImageFetcher/1.1 (educational project)"}
API = "https://commons.wikimedia.org/w/api.php"
MIN_REQUEST_INTERVAL = 3.5
_last_request = 0.0

BREEDS = {
    "british-shorthair": ("英国短毛猫", "British Shorthair cat"),
    "golden-shaded": ("金渐层", "British Shorthair golden shaded cat"),
    "silver-shaded": ("银渐层", "British Shorthair silver shaded cat"),
    "ragdoll": ("布偶猫", "Ragdoll cat"),
    "maine-coon": ("缅因猫", "Maine Coon cat"),
    "siamese": ("暹罗猫", "Siamese cat"),
    "persian": ("波斯猫", "Persian cat"),
    "exotic-shorthair": ("异国短毛猫", "Exotic Shorthair cat"),
    "scottish-fold": ("苏格兰折耳猫", "Scottish Fold cat"),
    "american-shorthair": ("美国短毛猫", "American Shorthair cat"),
    "bengal": ("孟加拉猫", "Bengal cat"),
    "abyssinian": ("阿比西尼亚猫", "Abyssinian cat"),
    "russian-blue": ("俄罗斯蓝猫", "Russian Blue cat"),
    "norwegian-forest": ("挪威森林猫", "Norwegian Forest cat"),
    "siberian": ("西伯利亚猫", "Siberian cat"),
    "sphynx": ("斯芬克斯猫", "Sphynx cat"),
    "devon-rex": ("德文卷毛猫", "Devon Rex cat"),
    "american-curl": ("美国卷耳猫", "American Curl cat"),
    "munchkin": ("曼赤肯猫", "Munchkin cat"),
    "birman": ("伯曼猫", "Birman cat"),
    "turkish-van": ("土耳其梵猫", "Turkish Van cat"),
    "singapura": ("新加坡猫", "Singapura cat"),
    "japanese-bobtail": ("日本短尾猫", "Japanese Bobtail cat"),
    "chinese-li-hua": ("中国狸花猫", "Chinese Li Hua cat"),
    "orange-cat": ("橘猫", "orange tabby cat"),
    "tuxedo-cow": ("奶牛猫", "black and white tuxedo cat"),
    "calico": ("三花猫", "calico cat"),
    "tortoiseshell": ("玳瑁猫", "tortoiseshell cat"),
    "himalayan": ("喜马拉雅猫", "Himalayan cat"),
    "egyptian-mau": ("埃及猫", "Egyptian Mau cat"),
}

BAD = re.compile(r"kitten|drawing|painting|logo|map|stamp|skeleton|diagram|\bsvg\b|pedigree", re.I)
PREFERRED_FILES = {
    # Manually selected exact Commons pages to avoid text-search false positives.
    "persian": "File:Persian Cats.jpg",
    "japanese-bobtail": "File:Japanese Bobtail and normal tailed cat.JPG",
    "tuxedo-cow": "File:Tuxedo Cat.jpg",
    "himalayan": "File:Himalayan Cat.jpg",
    "egyptian-mau": "File:Egyptian Mau - Full Face.jpg",
}
AUTHOR_OVERRIDES = {
    "bengal": "William Crochot (Medium69)",
    "american-curl": "Cljk (uploader; page states own photograph)",
    "japanese-bobtail": "Chris 73",
    "russian-blue": "Andrzej Barabasz (Chepry)",
}


def get(url):
    global _last_request
    for attempt in range(5):
        elapsed = time.monotonic() - _last_request
        if elapsed < MIN_REQUEST_INTERVAL:
            time.sleep(MIN_REQUEST_INTERVAL - elapsed)
        request = urllib.request.Request(url, headers=UA)
        _last_request = time.monotonic()
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 503) or attempt == 4:
                raise
            retry_after = error.headers.get("Retry-After", "")
            try:
                delay = max(10, float(retry_after))
            except ValueError:
                delay = 30 * (attempt + 1)
            time.sleep(min(delay, 120))


def strip_markup(value):
    return html.unescape(re.sub(r"<[^>]+>", " ", value or "")).strip()


def allowed_license(value):
    license_name = (value or "").strip()
    if re.match(r"^(?:CC0\b|Public domain\b|PD(?:[- ]|$))", license_name, re.I):
        return True
    # Permit attribution and attribution-sharealike licenses. Avoid NC/ND terms.
    return bool(re.match(r"^CC[- ]BY(?:-SA)?(?:\s|$)", license_name, re.I))


def search(query, width):
    params = {
        "action": "query",
        "format": "json",
        "maxlag": 5,
        "generator": "search",
        "gsrnamespace": 6,
        "gsrlimit": 30,
        "gsrsearch": f"{query} filetype:bitmap",
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata",
        "iiurlwidth": width,
    }
    url = API + "?" + urllib.parse.urlencode(params)
    data = json.loads(get(url).decode("utf-8"))
    pages = data.get("query", {}).get("pages", {}).values()
    return sorted(pages, key=lambda page: page.get("index", 999))


def get_file_page(title, width):
    params = {
        "action": "query",
        "format": "json",
        "maxlag": 5,
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata",
        "iiurlwidth": width,
    }
    url = API + "?" + urllib.parse.urlencode(params)
    data = json.loads(get(url).decode("utf-8"))
    return list(data.get("query", {}).get("pages", {}).values())


def choose(pages):
    for page in pages:
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        license_name = strip_markup(meta.get("LicenseShortName", {}).get("value"))
        if not allowed_license(license_name) or BAD.search(page.get("title", "")):
            continue
        if info.get("width", 0) < 900 or info.get("height", 0) < 600:
            continue
        thumb = info.get("thumburl")
        if not thumb:
            continue
        artist = strip_markup(meta.get("Artist", {}).get("value"))
        credit = strip_markup(meta.get("Credit", {}).get("value"))
        if len(artist) > 160:
            match = re.search(r"photograph was taken by\s*(.*?)\s*\(([^)]*)\)", artist, re.I | re.S)
            if match:
                artist = f"{match.group(2).strip()} ({match.group(1).strip()})"
        return page, info, meta, license_name, artist or credit or "未注明作者（见原始页面）"
    return None


def load_credits():
    if not os.path.exists(CF):
        return {}
    try:
        with open(CF, "r", encoding="utf-8") as file:
            return json.load(file)
    except (json.JSONDecodeError, UnicodeDecodeError):
        # A previous interrupted run may have truncated this generated file.
        return {}


def save_credits(credits):
    os.makedirs(os.path.dirname(CF), exist_ok=True)
    fd, temp_path = tempfile.mkstemp(dir=os.path.dirname(CF), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as file:
            json.dump(credits, file, ensure_ascii=False, indent=2)
            file.write("\n")
        os.replace(temp_path, CF)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="comma-separated IDs to fetch")
    parser.add_argument("--width", type=int, default=1200)
    args = parser.parse_args()
    os.makedirs(OUT, exist_ok=True)
    credits = load_credits()
    ids = args.only.split(",") if args.only else list(BREEDS)

    for cat_id in ids:
        if cat_id not in BREEDS:
            print(f"SKIP {cat_id}: unknown cat ID")
            continue
        breed_name, query = BREEDS[cat_id]
        try:
            pages = get_file_page(PREFERRED_FILES[cat_id], args.width) if cat_id in PREFERRED_FILES else search(query, args.width)
            result = choose(pages)
            if not result:
                print(f"NO MATCH {cat_id}: no suitable freely licensed image found")
                continue
            page, info, meta, license_name, author = result
            author = AUTHOR_OVERRIDES.get(cat_id, author)
            image_bytes = get(info["thumburl"])
            filename = f"{cat_id}.jpg"
            image_path = os.path.join(OUT, filename)
            with open(image_path, "wb") as image_file:
                image_file.write(image_bytes)

            page_url = info.get("descriptionurl", "")
            credits[cat_id] = {
                "breed": breed_name,
                "filename": filename,
                "title": page.get("title", ""),
                "author": author,
                "original_page_url": page_url,
                "license": license_name,
                "license_url": strip_markup(meta.get("LicenseUrl", {}).get("value")),
                "source_website": "Wikimedia Commons",
                "source_url": page_url,
                "width": info.get("width"),
                "height": info.get("height"),
            }
            save_credits(credits)
            print(f"OK {cat_id} <- {page.get('title')} [{license_name}]")
        except Exception as error:  # continue so one unavailable breed does not stop the batch
            print(f"FAILED {cat_id}: {error}", file=sys.stderr)


if __name__ == "__main__":
    main()
