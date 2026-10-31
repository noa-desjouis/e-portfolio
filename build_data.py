#!/usr/bin/env python3
"""Embed every CSV of this folder into data.js.

Why: browsers block fetch() on pages opened directly from disk (file://).
data.js lets the e-portfolio work by simply double-clicking index.html.
Run this script again after editing any CSV:   python3 build_data.py
"""
import glob, json, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
data = {}
for path in sorted(glob.glob("*.csv")):
    with open(path, encoding="utf-8-sig") as f:
        data[path] = f.read()
with open("data.js", "w", encoding="utf-8") as out:
    out.write("window.PORTFOLIO_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
print("data.js generated from:", ", ".join(data))
