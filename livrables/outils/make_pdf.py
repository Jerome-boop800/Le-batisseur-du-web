#!/usr/bin/env python3
"""Compose le PDF de présentation de la maquette Fab Auto à partir des captures.

Usage : python3 make_pdf.py <dossier_captures> <pdf_sortie> [rouge|bleu]
Le dossier doit contenir les captures (d-*.jpg, m-*.jpg, g-*.jpg) et la photo du hero dans img/.
"""
import io
import os
import sys

from PIL import Image
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

SRC, OUT = sys.argv[1], sys.argv[2]
THEME = sys.argv[3] if len(sys.argv) > 3 else 'rouge'
THEMES = {
    'rouge': ('https://claude.ai/artifact/PpZcfXRtcgs2CZyrDx8d7N', '#e11d26', 'img/hero-showroom.webp', 'Version noir et rouge'),
    'bleu': ('https://claude.ai/artifact/3Tu7RCXkwLSgm1EYg4UJsy', '#1673ff', 'img/hero-showroom-clair.webp', 'Version bleu clair'),
}
URL, ACCENT, HERO, VERSION = THEMES[THEME]
BG = HexColor('#0b0d10'); INK = HexColor('#f4f5f7'); INK2 = HexColor('#b9bfc8'); INK3 = HexColor('#868e9a'); RED = HexColor(ACCENT)
LOGO_RED = HexColor('#e11d26')   # « AUTO » du logo : toujours rouge
W = 842; M = 36; CW = W - 2 * M; HEAD = 92
PHONE_CROP = (880, 25, 1410, 1030)   # cadre du téléphone dans la capture 1440×900 à ×1,25

c = canvas.Canvas(OUT, pageCompression=1)
c.setTitle('Fab Auto — Présentation de la maquette du site')
c.setAuthor('Le Bâtisseur du Web')


def path(name):
    return os.path.join(SRC, name)


def jpg(im, q=82):
    b = io.BytesIO(); im.convert('RGB').save(b, 'JPEG', quality=q, optimize=True); b.seek(0)
    return ImageReader(b)


def header(h, kicker, title, note=None):
    c.setFillColor(BG); c.rect(0, 0, W, h, fill=1, stroke=0)
    c.setFillColor(RED); c.rect(M, h - 40, 30, 2, fill=1, stroke=0)
    c.setFillColor(INK2); c.setFont('Helvetica-Bold', 9); c.drawString(M + 40, h - 43, kicker.upper())
    c.setFillColor(INK); c.setFont('Helvetica-Bold', 22); c.drawString(M, h - 72, title)
    if note:
        c.setFillColor(INK3); c.setFont('Helvetica', 9.5); c.drawRightString(W - M, h - 72, note)


def footer():
    c.setFillColor(INK3); c.setFont('Helvetica', 8)
    c.drawString(M, 16, 'Fab Auto · Maquette du site · Le Bâtisseur du Web')
    c.setFillColor(RED); c.drawRightString(W - M, 16, 'Version interactive : ' + URL)
    c.linkURL(URL, (W - M - 260, 10, W - M, 26), relative=0)


# ---------- Couverture ----------
H = 595; c.setPageSize((W, H))
hero = Image.open(path(HERO)).convert('RGB')
r = max(W / hero.width, H / hero.height)
hero = hero.resize((int(hero.width * r), int(hero.height * r)))
c.drawImage(jpg(hero), 0, 0, width=hero.width, height=hero.height)
c.setFillColor(Color(0.027, 0.031, 0.039, alpha=0.82)); c.rect(0, 0, W * 0.62, H, fill=1, stroke=0)
c.setFillColor(Color(0.027, 0.031, 0.039, alpha=0.35)); c.rect(W * 0.62, 0, W * 0.38, H, fill=1, stroke=0)
c.setFillColor(RED); c.rect(M, H - 70, 30, 2, fill=1, stroke=0)
c.setFillColor(INK2); c.setFont('Helvetica-Bold', 10); c.drawString(M + 40, H - 73, 'PRÉSENTATION DE LA MAQUETTE · ' + VERSION.upper() + ' · NOVEMBRE 2026')
c.setFillColor(INK); c.setFont('Helvetica', 46); c.drawString(M, H - 150, 'FAB')
c.setFillColor(LOGO_RED); c.setFont('Helvetica-Bold', 46); c.drawString(M + 100, H - 150, 'AUTO')
c.setFillColor(INK); c.setFont('Helvetica-Bold', 20); c.drawString(M, H - 190, 'Votre futur site : showroom et espace gérant')
c.setFillColor(INK2); c.setFont('Helvetica', 11.5)
for i, line in enumerate(['Un site pensé comme un showroom : vos véhicules mis en valeur,',
                          'votre atelier présenté, et un espace pour tout gérer depuis',
                          'votre téléphone ou votre ordinateur.']):
    c.drawString(M, H - 222 - i * 16, line)
bx, by, bw, bh = M, H - 330, 300, 46
c.setFillColor(RED); c.roundRect(bx, by, bw, bh, 4, fill=1, stroke=0)
c.setFillColor(INK); c.setFont('Helvetica-Bold', 13); c.drawCentredString(bx + bw / 2, by + 17, 'ESSAYER LA MAQUETTE INTERACTIVE  >')
c.linkURL(URL, (bx, by, bx + bw, by + bh), relative=0)
c.setFillColor(INK3); c.setFont('Helvetica', 9); c.drawString(M, by - 16, 'Cliquez sur le bouton, ou ouvrez ce lien dans votre navigateur :')
c.setFillColor(RED); c.setFont('Helvetica-Bold', 10); c.drawString(M, by - 31, URL)
c.linkURL(URL, (M, by - 35, M + 330, by - 20), relative=0)
c.setFillColor(INK2); c.setFont('Helvetica-Bold', 10); c.drawString(M, 150, 'DANS CE DOCUMENT')
c.setFont('Helvetica', 10.5); c.setFillColor(INK)
for i, line in enumerate(['1. Accueil', '2. Showroom (tous les véhicules)', '3. Fiche véhicule', '4. Atelier',
                          '5. Version téléphone du site', '6. Espace gérant sur téléphone', '7. Espace gérant sur ordinateur']):
    c.drawString(M + (0 if i < 4 else 190), 132 - (i % 4) * 16, line)
c.setFillColor(INK3); c.setFont('Helvetica', 8)
c.drawString(M, 24, 'Maquette de présentation : photos de démonstration et textes à valider ensemble. Réalisé par Le Bâtisseur du Web.')
c.showPage()


# ---------- Pages pleine longueur (site sur ordinateur) ----------
def tall(fname, kicker, title, note):
    im = Image.open(path(fname)); s = CW / im.width; ih = im.height * s
    h = HEAD + ih + 44; c.setPageSize((W, h)); header(h, kicker, title, note)
    c.drawImage(jpg(im), M, 34, width=CW, height=ih); footer(); c.showPage()


tall('d-accueil.jpg', '1 · Site client · ordinateur', 'Accueil', 'Hero showroom, carrousel des dernières voitures rentrées, atelier')
tall('d-showroom.jpg', '2 · Site client · ordinateur', 'Showroom : tout le stock', '7 filtres, tri, mise à jour en temps réel par le gérant')
tall('d-vehicule.jpg', '3 · Site client · ordinateur', 'Fiche véhicule', 'Photos, caractéristiques, garantie, formulaire « Ce véhicule m’intéresse »')
tall('d-atelier.jpg', '4 · Site client · ordinateur', 'Atelier', 'La porte de garage s’ouvre, puis réparation, reprogrammation, dépannage')

# ---------- Site sur téléphone ----------
m = Image.open(path('m-accueil.jpg')); v = Image.open(path('m-vehicule.jpg'))
cols = 4; gap = 14; cw = (CW - gap * (cols - 1)) / cols; s = cw / m.width
slice_px = int(m.height / 3) + 1; sh = slice_px * s; vh = v.height * s
h = HEAD + max(sh, vh) + 70; c.setPageSize((W, h))
header(h, '5 · Site client · téléphone', 'Le site sur téléphone', 'Accueil (en 3 parties) et fiche véhicule')
for i in range(3):
    part = m.crop((0, i * slice_px, m.width, min(m.height, (i + 1) * slice_px))); ph = part.height * s
    c.drawImage(jpg(part), M + i * (cw + gap), h - HEAD - ph, width=cw, height=ph)
c.drawImage(jpg(v), M + 3 * (cw + gap), h - HEAD - vh, width=cw, height=vh)
c.setFillColor(INK3); c.setFont('Helvetica', 8.5)
for i, line in enumerate(['Accueil (1/3)', 'Accueil (2/3)', 'Accueil (3/3)', 'Fiche véhicule']):
    c.drawString(M + i * (cw + gap), h - HEAD + 8, line)
footer(); c.showPage()

# ---------- Espace gérant sur téléphone ----------
ims = [Image.open(path('g-phone-%s.jpg' % n)).crop(PHONE_CROP) for n in ['stock', 'modifier', 'demandes']]
gap = 20; pw = (CW - 2 * gap) / 3; s = pw / ims[0].width; ph = ims[0].height * s
h = HEAD + ph + 80; c.setPageSize((W, h))
header(h, '6 · Espace gérant · téléphone', 'Le garage se gère depuis le téléphone', 'Stock, modification d’une annonce, demandes clients')
for i, (im, label) in enumerate(zip(ims, ['Mon stock', 'Modifier le prix ou le statut', 'Demandes des clients'])):
    x = M + i * (pw + gap); c.drawImage(jpg(im, 86), x, 54, width=pw, height=ph)
    c.setFillColor(INK2); c.setFont('Helvetica-Bold', 10); c.drawCentredString(x + pw / 2, 40, label)
footer(); c.showPage()

# ---------- Espace gérant sur ordinateur ----------
ims = [Image.open(path('g-desktop-%s.jpg' % n)) for n in ['stock', 'modifier', 'demandes']]
s = CW / ims[0].width; ih = ims[0].height * s; cap = 22
h = HEAD + 3 * (ih + cap) + 40; c.setPageSize((W, h))
header(h, '7 · Espace gérant · ordinateur', 'La même application, sur grand écran', 'Tableau du stock, annonce avec aperçu en direct, messagerie des demandes')
y = h - HEAD
for im, label in zip(ims, ['Le stock en tableau : prix modifiable, statuts, actions groupées',
                           'Modifier une annonce, avec l’aperçu du site en direct',
                           'Les demandes des clients, comme une messagerie']):
    c.setFillColor(INK2); c.setFont('Helvetica-Bold', 10); c.drawString(M, y - 12, label)
    y -= cap; c.drawImage(jpg(im, 86), M, y - ih, width=CW, height=ih); y -= ih
footer(); c.showPage()
c.save()
print(OUT, os.path.getsize(OUT) // 1024, 'Ko')
