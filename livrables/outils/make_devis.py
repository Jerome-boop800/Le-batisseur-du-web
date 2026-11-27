#!/usr/bin/env python3
"""Devis Fab Auto : formule Showroom Pro, au choix à l'achat ou en location.

Usage : python3 make_devis.py <pdf_sortie>
"""
import sys

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

OUT = sys.argv[1]
F = '/usr/share/fonts/truetype/'
pdfmetrics.registerFont(TTFont('Sans', F + 'liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Sans-B', F + 'liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Sans-I', F + 'liberation/LiberationSans-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Sym', F + 'dejavu/DejaVuSans-Bold.ttf'))

W, H = A4
M = 42
CW = W - 2 * M
INK = HexColor('#14171c'); INK2 = HexColor('#4a515c'); INK3 = HexColor('#7c8490')
LINE = HexColor('#dfe2e7'); SOFT = HexColor('#f4f5f7'); DARK = HexColor('#0e1013')
RED = HexColor('#e11d26'); GREEN = HexColor('#1f9d55')

NUM = 'DEV-2026-11-001'
DATE = '27 novembre 2026'
LINK = 'https://claude.ai/artifact/PpZcfXRtcgs2CZyrDx8d7N'
LINK2 = 'https://claude.ai/artifact/3Tu7RCXkwLSgm1EYg4UJsy'


def eur(v):
    s = ('%.2f' % v).replace('.', ',')
    if s.endswith(',00'):
        s = s[:-3]
    i = s.split(',')[0]
    g = ''
    while len(i) > 3:
        g = ' ' + i[-3:] + g
        i = i[:-3]
    return i + g + (',' + s.split(',')[1] if ',' in s else '') + ' €'


CREA, SER, MES, LOY = 5775, 69, 690, 239
c = canvas.Canvas(OUT, pagesize=A4, pageCompression=1)
c.setTitle('Devis Fab Auto — site internet Showroom Pro')
c.setAuthor('Le Bâtisseur du Web')


def txt(x, y, s, font='Sans', size=9.5, color=INK, align='l'):
    c.setFont(font, size); c.setFillColor(color)
    {'l': c.drawString, 'r': c.drawRightString, 'c': c.drawCentredString}[align](x, y, s)


def wrap(s, font, size, width):
    words, lines, cur = s.split(' '), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if pdfmetrics.stringWidth(t, font, size) <= width:
            cur = t
        else:
            lines.append(cur); cur = w
    return lines + [cur]


def para(x, y, s, width, font='Sans', size=9.5, color=INK, lead=1.38):
    for line in wrap(s, font, size, width):
        txt(x, y, line, font, size, color); y -= size * lead
    return y


def check(x, y, color=GREEN):
    txt(x, y, '✓', 'Sym', 9, color)


def head_band(title, sub):
    c.setFillColor(DARK); c.rect(0, H - 118, W, 118, fill=1, stroke=0)
    c.setFillColor(RED); c.rect(M, H - 48, 26, 2.2, fill=1, stroke=0)
    txt(M + 34, H - 51, 'LE BÂTISSEUR DU WEB', 'Sans-B', 8.5, HexColor('#b9bfc8'))
    txt(M, H - 82, title, 'Sans-B', 22, white)
    txt(M, H - 100, sub, 'Sans', 10, HexColor('#b9bfc8'))
    txt(W - M, H - 51, NUM, 'Sans-B', 10, white, 'r')
    txt(W - M, H - 66, DATE + ' · valable 30 jours', 'Sans', 8.5, HexColor('#b9bfc8'), 'r')


def section(y, label):
    c.setFillColor(RED); c.rect(M, y + 2.5, 3, 9, fill=1, stroke=0)
    txt(M + 10, y + 3, label.upper(), 'Sans-B', 9, INK)
    c.setStrokeColor(LINE); c.setLineWidth(.6); c.line(M, y - 5, W - M, y - 5)
    return y - 22


def footer(page):
    c.setStrokeColor(LINE); c.line(M, 40, W - M, 40)
    txt(M, 28, 'Le Bâtisseur du Web · Colin Jerome · lebatisseurduweb.fr@gmail.com', 'Sans', 7.5, INK3)
    txt(W - M, 28, NUM + ' · page %d / 2' % page, 'Sans', 7.5, INK3, 'r')


# ======================= PAGE 1 =======================
head_band('Devis · Site internet Fab Auto', 'Formule Showroom Pro, au choix à l’achat ou en location')
y = H - 150
# Parties
bw = (CW - 16) / 2
for i, (lab, lines) in enumerate([
    ('PRESTATAIRE', ['Le Bâtisseur du Web', 'Colin Jerome, développeur web', 'lebatisseurduweb.fr@gmail.com', 'SIRET : ………………………………………']),
    ('CLIENT', ['Fab Auto', 'Garage automobile', '27860 Heudicourt', '06 23 55 22 00 · fabauto.gsr@gmail.com']),
]):
    x = M + i * (bw + 16)
    c.setFillColor(SOFT); c.roundRect(x, y - 70, bw, 82, 6, fill=1, stroke=0)
    txt(x + 12, y - 2, lab, 'Sans-B', 7.5, INK3)
    for k, l in enumerate(lines):
        txt(x + 12, y - 18 - k * 14, l, 'Sans-B' if k == 0 else 'Sans', 10 if k == 0 else 8.6, INK if k == 0 else INK2)
y -= 98

y = section(y, 'Objet')
y = para(M, y, 'Création du site internet de Fab Auto d’après la maquette présentée : un site showroom pour vendre les véhicules '
         'd’occasion et présenter l’atelier, et un espace gérant pour tout gérer depuis le téléphone ou l’ordinateur.', CW, size=9.5, color=INK2)
txt(M, y - 4, 'Maquette :', 'Sans-B', 8.5, INK)
txt(M + 52, y - 4, LINK, 'Sans', 8.5, RED)
c.linkURL(LINK, (M + 52, y - 8, M + 52 + pdfmetrics.stringWidth(LINK, 'Sans', 8.5), y + 6), relative=0)
y -= 28

y = section(y, 'Ce qui est compris')
blocks = [
    ('Le site', [
        'Design sur-mesure d’après la maquette, avec deux séries de corrections',
        'Pages : accueil, showroom, fiche véhicule, atelier (réparation, reprogrammation, dépannage), contact, mentions légales',
        'Adapté au téléphone, bouton d’appel toujours visible, plan d’accès et horaires',
    ]),
    ('Le showroom', [
        'Tout le stock en ligne, avec filtres complets (marque, prix, carburant, année, kilométrage, boîte…) et tri',
        'Carrousel « Nos dernières voitures rentrées » mis à jour automatiquement',
        'Fiche détaillée par véhicule : photos plein écran, caractéristiques, équipements, garantie, partage',
    ]),
    ('L’espace gérant (téléphone et ordinateur)', [
        'Application installable avec l’icône Fab Auto, sur le téléphone et l’ordinateur, sans passer par un store',
        'Ajouter, modifier ou retirer un véhicule ; photos optimisées automatiquement ; prix modifiable en un geste',
        'Statuts disponible, réservé, vendu ; un véhicule vendu disparaît du site',
    ]),
    ('Les demandes des clients', [
        'Bouton « Ce véhicule m’intéresse », questions reprise et financement, accusé de réception automatique',
        'Demandes enregistrées et suivies dans l’espace gérant : nouvelle, en cours, conclue',
    ]),
    ('Visibilité et qualité', [
        'Référencement local Google, une page par véhicule ; sécurité, RGPD, accessibilité et rapidité',
        'Mise en ligne, prise en main d’une heure et guide d’utilisation',
    ]),
]
for title, items in blocks:
    txt(M, y, title, 'Sans-B', 9.5, INK); y -= 14
    for it in items:
        check(M + 2, y)
        y = para(M + 16, y, it, CW - 16, size=8.8, color=INK2, lead=1.32) - 2
    y -= 5

y -= 2
c.setFillColor(SOFT); c.roundRect(M, y - 34, CW, 42, 6, fill=1, stroke=0)
para(M + 12, y - 8, 'Hypothèses : site en français, jusqu’à environ 100 véhicules en ligne en même temps. Les textes, le logo et les photos du garage '
     'sont fournis par Fab Auto. Le délai de réalisation court à partir de leur réception.', CW - 24, size=8.2, color=INK2)
footer(1)
c.showPage()

# ======================= PAGE 2 =======================
head_band('Deux façons de payer', 'Même site, même service : vous choisissez l’achat ou la location')
y = H - 146
cw2 = (CW - 18) / 2
cards = [
    ('ACHAT', 'Le site vous appartient', eur(CREA) + ' HT', 'création, paiement unique en 3 fois',
     'puis ' + eur(SER) + ' HT / mois', 'Forfait Sérénité · engagement 12 mois',
     ['30 % à la signature : ' + eur(CREA * .30) + ' HT', '40 % à la maquette validée : ' + eur(CREA * .40) + ' HT',
      '30 % à la mise en ligne : ' + eur(CREA * .30) + ' HT', 'Propriétaire dès le dernier règlement',
      'Le coût le plus bas sur la durée']),
    ('LOCATION 36 MOIS', 'Tout compris, sans gros investissement', eur(LOY) + ' HT / mois', 'loyer fixe pendant 36 mois',
     '+ ' + eur(MES) + ' HT de mise en service', 'une seule fois, à la signature',
     ['Création, hébergement et Forfait Sérénité compris', 'Dépense prévisible, en charge chaque mois',
      'Le site vous est cédé au bout de 36 mois', 'Rachat anticipé possible à tout moment',
      'Nom de domaine à votre nom dès le départ']),
]
ch = 222
for i, (lab, tag, big, bsub, mid, msub, pts) in enumerate(cards):
    x = M + i * (cw2 + 18)
    c.setStrokeColor(LINE); c.setLineWidth(1); c.setFillColor(white); c.roundRect(x, y - ch, cw2, ch, 8, fill=1, stroke=1)
    c.setFillColor(DARK); c.roundRect(x, y - 44, cw2, 44, 8, fill=1, stroke=0); c.rect(x, y - 44, cw2, 10, fill=1, stroke=0)
    txt(x + 14, y - 19, lab, 'Sans-B', 10, white)
    txt(x + 14, y - 34, tag, 'Sans', 8.5, HexColor('#b9bfc8'))
    txt(x + 14, y - 74, big, 'Sans-B', 20, RED)
    txt(x + 14, y - 88, bsub, 'Sans', 8.3, INK3)
    txt(x + 14, y - 108, mid, 'Sans-B', 11, INK)
    txt(x + 14, y - 121, msub, 'Sans', 8.3, INK3)
    c.setStrokeColor(LINE); c.line(x + 14, y - 132, x + cw2 - 14, y - 132)
    yy = y - 148
    for p in pts:
        check(x + 14, yy); txt(x + 28, yy, p, 'Sans', 8.6, INK2); yy -= 16
y -= ch + 22

y = section(y, 'Le Forfait Sérénité (compris dans les deux cas)')
items = ['Hébergement du site en France (OVHcloud), nom de domaine et certificat HTTPS',
         'Adresse e-mail professionnelle, sauvegardes régulières et restauration',
         'Mises à jour de sécurité et surveillance du site',
         '1 h 30 de petites modifications par mois (textes, photos, horaires…)',
         'Assistance par e-mail, réponse sous 48 h ouvrées']
for it in items:
    check(M + 2, y); txt(M + 16, y, it, 'Sans', 8.4, INK2); y -= 14
y -= 8

y = section(y, 'Comparaison sur 3 ans (montants HT)')
rows = [('', 'Achat', 'Location'),
        ('À la signature', eur(CREA * .30), eur(MES)),
        ('La première année', eur(CREA + 12 * SER), eur(MES + 12 * LOY)),
        ('Total sur 3 ans', eur(CREA + 36 * SER), eur(MES + 36 * LOY))]
cx = [M, M + 210, M + 350]
for r, row in enumerate(rows):
    if r:
        c.setFillColor(SOFT if r % 2 else white); c.rect(M, y - 5, 490, 17, fill=1, stroke=0)
    for k, v in enumerate(row):
        txt(cx[k] + (8 if k == 0 else 120), y, v, 'Sans-B' if r == 0 or k == 0 else 'Sans', 9, INK if r else INK3, 'l' if k == 0 else 'r')
    y -= 17
y = para(M, y - 6, 'Achat : création + 36 mois de Forfait Sérénité. Location : mise en service + 36 loyers. Dans les deux cas, '
         'le site appartient à Fab Auto au bout de 3 ans ; ensuite, seul le Forfait Sérénité reste (69 € HT par mois), si vous le souhaitez.',
         CW, size=8, color=INK3)
y -= 10

y = section(y, 'Conditions et bon pour accord')
y = para(M, y, 'Montants en euros hors taxes. TVA : ……………………………… Forfait et loyers réglés chaque mois, à terme à échoir. '
         'En location, le site reste la propriété du prestataire jusqu’à la cession. Toute fonctionnalité supplémentaire fera l’objet d’un devis séparé.',
         CW, size=8.2, color=INK2)
y -= 8
txt(M, y, 'Votre choix :', 'Sans-B', 9.5, INK)
for k, lab in enumerate(['Achat', 'Location 36 mois']):
    x = M + 80 + k * 110
    c.setStrokeColor(INK2); c.setLineWidth(.9); c.rect(x, y - 2, 10, 10, fill=0, stroke=1)
    txt(x + 16, y, lab, 'Sans', 9.5, INK)
y -= 20
bh = 74
for i, (lab, lines) in enumerate([('LE PRESTATAIRE', ['Le Bâtisseur du Web, Colin Jerome', 'Date et signature']),
                                  ('LE CLIENT', ['Mention « Bon pour accord »,', 'date, signature et cachet'])]):
    x = M + i * (bw + 16)
    c.setStrokeColor(LINE); c.roundRect(x, y - bh, bw, bh, 6, fill=0, stroke=1)
    txt(x + 10, y - 14, lab, 'Sans-B', 7.5, INK3)
    for k, l in enumerate(lines):
        txt(x + 10, y - 28 - k * 12, l, 'Sans', 8.2, INK2)
footer(2)
c.save()
print(OUT, 'ok')
