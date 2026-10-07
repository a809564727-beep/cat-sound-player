#!/usr/bin/env python3
"""从 Wikimedia Commons 下载可自由使用的猫咪照片到 img/cats/，并生成 img/credits.json。

用法:  python3 scripts/fetch_images.py [--only ragdoll,siamese] [--width 900]
需要能访问 commons.wikimedia.org / upload.wikimedia.org。
只收录 CC / 公有领域许可的图片；请在下载后人工检查每张图是否确为对应品种，
不合适的删除或手动替换（文件名 img/cats/<id>.jpg，并同步 credits.json）。
"""
import argparse, json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "img", "cats")
UA = {"User-Agent": "MeowWikiImageFetcher/1.0 (educational project)"}
API = "https://commons.wikimedia.org/w/api.php"

QUERY = {
 "british-shorthair": "British Shorthair cat", "golden-shaded": "British Shorthair golden shaded cat",
 "silver-shaded": "British Shorthair silver shaded cat", "ragdoll": "Ragdoll cat", "maine-coon": "Maine Coon cat",
 "siamese": "Siamese cat", "persian": "Persian cat", "exotic-shorthair": "Exotic Shorthair cat",
 "scottish-fold": "Scottish Fold cat", "american-shorthair": "American Shorthair cat", "bengal": "Bengal cat",
 "abyssinian": "Abyssinian cat", "russian-blue": "Russian Blue cat", "norwegian-forest": "Norwegian Forest cat",
 "siberian": "Siberian cat", "sphynx": "Sphynx cat", "devon-rex": "Devon Rex cat", "american-curl": "American Curl cat",
 "munchkin": "Munchkin cat", "birman": "Birman cat", "turkish-van": "Turkish Van cat", "singapura": "Singapura cat",
 "japanese-bobtail": "Japanese Bobtail cat", "chinese-li-hua": "Chinese Li Hua cat", "orange-cat": "orange tabby cat",
 "tuxedo-cow": "black and white bicolor cat", "calico": "calico cat", "tortoiseshell": "tortoiseshell cat",
 "himalayan": "Himalayan cat", "egyptian-mau": "Egyptian Mau cat",
}
BAD = re.compile(r"kitten|drawing|painting|logo|map|stamp|skeleton|diagram|\bsvg\b|pedigree|show\b", re.I)
OK_LICENSE = re.compile(r"^(CC0|CC BY|CC-BY|Public domain|PD)", re.I)

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
        return r.read()

def search(q, width):
    p = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrlimit": 15,
         "gsrsearch": f"{q} filetype:bitmap", "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": width}
    d = json.loads(get(API + "?" + urllib.parse.urlencode(p)))
    return sorted(d.get("query", {}).get("pages", {}).values(), key=lambda x: x.get("index", 99))

def strip(s): return re.sub(r"<[^>]+>", "", s or "").strip()

def pick(pages):
    for pg in pages:
        ii = (pg.get("imageinfo") or [{}])[0]
        m = ii.get("extmetadata", {})
        lic = strip(m.get("LicenseShortName", {}).get("value"))
        if not OK_LICENSE.match(lic) or BAD.search(pg["title"]): continue
        if ii.get("width", 0) < 900 or ii.get("height", 0) < 600 or ii.get("width", 0) < ii.get("height", 1): continue
        return pg, ii, lic, strip(m.get("Artist", {}).get("value")) or "未知"
    return None

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--only"); ap.add_argument("--width", type=int, default=900)
    a = ap.parse_args(); os.makedirs(OUT, exist_ok=True)
    cf = os.path.join(ROOT, "img", "credits.json")
    credits = json.load(open(cf)) if os.path.exists(cf) else {}
    ids = a.only.split(",") if a.only else list(QUERY)
    for cid in ids:
        try:
            r = pick(search(QUERY[cid], a.width))
            if not r: print("✗ 没找到合适图片:", cid); continue
            pg, ii, lic, author = r
            open(os.path.join(OUT, cid + ".jpg"), "wb").write(get(ii["thumburl"]))
            credits[cid] = {"title": pg["title"], "page": ii["descriptionurl"], "author": author, "license": lic}
            print("✓", cid, "←", pg["title"], f"[{lic}]")
        except Exception as e:
            print("✗", cid, e, file=sys.stderr)
    json.dump(credits, open(cf, "w"), ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
