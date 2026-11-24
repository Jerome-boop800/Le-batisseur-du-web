# Reprise — Maquette Figma « Fab Auto · Carbon Showroom »

Mis à jour le 24/11/2026. Pour reprendre avec Claude : « Reprends la maquette Figma Fab Auto à partir de figma-fab-auto/REPRISE-FIGMA.md ».

**Fichier Figma :** https://www.figma.com/design/kOQSINbT7oOAjGkXbqxftM  (fileKey `kOQSINbT7oOAjGkXbqxftM`)

## Direction artistique
- Fond carbone noir, rouge Fab Auto en accent, reflets chrome. Univers « Atelier » en jaune signalisation et bandes noir/jaune (inspiré du visuel « Unleash your drive »).
- Polices : Archivo Black / ExtraBold (titres en capitales), Archivo Narrow Bold (surtitres espacés), Inter (texte), JetBrains Mono (caractéristiques, références).
- Variables Figma (collection « Fab Auto · Carbon ») : carbon/950 #07080A · 900 #0D0F12 · 800 #15181D · 700 #1E2228 · 600 #2A2F37 · chrome/100 #F4F5F7 · 300 #B9BFC8 · 500 #7C8490 · brand/red #E11D26 · brand/red-deep #8E0C12 · atelier/yellow #FFC414 · status/ok #41C487.
- ⚠️ Piège : lier une couleur à une variable remet l'opacité à 100 %. Il faut lier puis copier la peinture et régler `opacity` après coup.

## Contenu du fichier
Le plan Starter est limité à 3 pages.
- **00 · Direction & photos** : 10 photos générées par l'IA de Figma, sans marque, et un tableau « Composants » (id 6:2).
  - Logo (6:3).
  - Bouton (6:28) : variantes Primaire, Contour, Atelier et Verre ; propriétés `Texte#6:0` et `Flèche#6:5`.
  - Puce caractéristique (6:29) : propriété `Valeur#6:10`.
  - Carte véhicule (6:31).
  - Hexagone service (12:91) : variantes Achat · Vente, Réparation, Reprogrammation et Dépannage ; propriété `Libellé#12:0`.
  - Bande signalisation (12:6).
- **01 · Desktop** : cadre « Accueil — Desktop 1440 » (7:6), avec les sections suivantes.
  1. Hero showroom (7:7) : plateau tournant, titre, carte « À la une », bouton 360° et recherche rapide. ✅
  2. Engagements (7:108) : fond texture carbone. ✅
  3. Showroom · Carrousel 3D (10:25) : cartes en perspective, anneau d'orbite rouge et fiche du véhicule actif. ✅
  4. Atelier · Mécanique (13:39) : titre « Prenez soin de votre drive. », hexagones et cartes Reprogrammation / Dépannage. ✅
  5. Achat en 4 étapes · Infos pratiques · Pied de page : **à faire** (script prêt : `etape-suivante.js`).
- **02 · Mobile** : vide, **à faire**.

## Références d'images (imageHash)
| Image | Hash |
|---|---|
| hero-showroom | 6719c69bf82ee1a5ee30864b132c2be51cd45da9 |
| atelier-pont | af258fba7129ac69f3671084c361376913bd958b |
| v1 citadine bleue (208) | 58950ffee35759774aee9238f1f185a220e17feb |
| v3 SUV graphite (Duster) | 0fff1f16185513a58ce26413c8f32ae202136fc4 |
| v4 compacte grise (Golf) | 6d4106cf74c7c1bfd9eb075ebabe330370a45f4a |
| v8 berline électrique (Model 3) | cdc6064e944d3b5c34711db8bf554db4e125a37b |
| v6 SUV noir (C5 Aircross) | c5a08eac3ccf6959bcab8c7cfe8dac4903a3e9f7 |
| texture carbone | 1299a280d3c60bed7e000fb3b76a5427789c22ae |
| reprogrammation | 4ac9a3a18cd29ddd5330c37317a7598af29bb697 |
| dépannage | 0a0f018c1ac6c15118a0d78671a11a5d68527f48 |

Les photos sont des visuels d'ambiance. Elles seront remplacées par les vraies photos du stock.

## Reste à faire
1. Lancer `etape-suivante.js` avec `use_figma` (page « 01 · Desktop ») : achat en 4 étapes, infos pratiques avec carte et horaires, pied de page.
2. Capture de contrôle de la page complète : vérifier la bande « Engagements » après correction et le titre « Prenez soin » qui chevauche la photo (effet voulu, à valider).
3. Fiche véhicule desktop : galerie avec vue 360°, caractéristiques, prix et formulaire « Ce véhicule m'intéresse ».
4. Accueil mobile 390 px (page 02).
5. Faire valider au client les textes non confirmés : garantie 12 mois, réponse sous 24 h, reprise / financement, horaires, zone de dépannage.
