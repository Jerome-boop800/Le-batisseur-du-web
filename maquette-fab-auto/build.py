#!/usr/bin/env python3
"""Assemble la maquette en un seul fichier dist/index.html (CSS et JS en ligne)."""
import pathlib
import sys

root = pathlib.Path(__file__).parent
src = root / "src"
css_files = ["tokens.css", "public.css", "gerant.css"]
js_files = ["core.js", "carart.js", "public.js", "gerant.js"]


def read(name):
    p = src / name
    return p.read_text(encoding="utf-8") if p.exists() else f"/* {name} absent */"


html = (src / "index.template.html").read_text(encoding="utf-8")
css = "\n".join(read(f) for f in css_files)
# Chaque script dans son propre bloc pour qu'une erreur n'emporte pas les autres
js = "\n</script>\n<script>\n".join(read(f) for f in js_files)
html = html.replace("/*@@CSS@@*/", css).replace("/*@@JS@@*/", js)
args = [a for a in sys.argv[1:] if not a.startswith("--")]
# --standalone : ajoute le squelette HTML (doctype, viewport) pour tester en local.
# Sans ce drapeau, le squelette est ajouté par la plateforme à la publication.
if "--standalone" in sys.argv:
    html = ('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
            '<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style></head><body>'
            + html + '</body></html>')
# Sortie : dist/index.html par défaut, ou le chemin passé en argument
out = pathlib.Path(args[0]) if args else root / "dist" / "index.html"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print(out, len(html.encode()) // 1024, "Ko")
