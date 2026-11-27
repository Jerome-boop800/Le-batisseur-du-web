# Fichier de reprise — Maquette Fab Auto

Fichier mis à jour le 25 novembre 2026 en fin de journée (étoiles or, pied de page lumineux, lumière sur le logo). Il sert à reprendre le projet sans rien perdre, dans une nouvelle session Claude ou à la main. **Pour reprendre avec Claude**, il suffit de lui donner ce fichier et le zip des sources en disant : « Reprends la maquette Fab Auto à partir de ce fichier ».

---

## 1. Le projet en bref

| | |
|---|---|
| **Prestataire** | Le Bâtisseur du Web, Colin Jerome |
| **Client** | **Fab Auto**, garage : achat / vente, réparation, reprogrammation, dépannage |
| **Ville retenue** | **27860 Heudicourt**. La carte de visite indique encore « 42 rue d'Éragny, 27140 Gisors » ; Colin a choisi Heudicourt. Rue à confirmer. |
| **Contacts (carte de visite)** | 06 23 55 22 00 · fabauto.gsr@gmail.com · Facebook « Fabauto » · Snapchat « Fabiezz » |
| **Objet** | Maquette cliquable d'un site vitrine et showroom de voitures d'occasion, avec un **espace gérant** pour gérer le stock et les demandes |
| **Formule du devis** | « Showroom Pro » (voir §8) |
| **Étape actuelle** | Maquette envoyée au garagiste pour validation. **Pas encore de développement serveur.** |

**Liens**
- **Maquette en ligne, version noir et rouge :** https://claude.ai/artifact/PpZcfXRtcgs2CZyrDx8d7N (partagée : toute personne disposant du lien)
- **Maquette en ligne, version Bleu clair :** https://claude.ai/artifact/3Tu7RCXkwLSgm1EYg4UJsy (privée tant qu'elle n'est pas partagée par le menu « Partager »)
- **Ancienne maquette, thème clair :** https://claude.ai/artifact/1jCByUE98sgHQwdqMCzXGF (non modifiée)
- **Page de présentation seule (site public) :** https://claude.ai/artifact/NUTatgqYL8ES9TMAmqJGof — sources dans `../maquette-carbon/`
- **Fichier Figma :** https://www.figma.com/design/kOQSINbT7oOAjGkXbqxftM — notes dans `../figma-fab-auto/REPRISE-FIGMA.md`
- **Proposition commerciale (PDF) :** https://drive.google.com/file/d/1ryGq8b3YV5ae-3zmwVKAzTcVg1n43BAp/view
- **Sources sur le Drive :** `maquette-fab-auto-sources-v3 (reprise).zip`, à la racine de « Mon Drive »

---

## 2. Ce que contient la maquette

La barre noire « MAQUETTE » en haut sert seulement à la démo. Elle a trois onglets, plus le bouton « Réinitialiser » qui remet les données de démo.

### Site client (public)
- **Accueil :** titre « Des occasions contrôlées et garanties chez Fab Auto. », véhicule « À la une », recherche rapide (marque, budget, énergie), derniers arrivages, engagements, infos pratiques.
- **Nos véhicules (showroom) :** 7 filtres (marque, énergie, boîte, carrosserie, prix max, km max, année min), tri, puces de filtres retirables. Sur mobile, les filtres sont dans un panneau.
- **Fiche véhicule :** galerie, caractéristiques, Crit'Air, équipements, garantie, bouton « Partager », et formulaire « Ce véhicule m'intéresse » qui crée une demande dans l'espace gérant. Une voiture vendue affiche un bandeau « Vendu » et des modèles proches.
- **Le garage :** les 4 métiers de la carte de visite et un achat en 4 étapes.
- **Contact :** formulaire général. **Mentions légales :** modèle à compléter.
- **Pied de page :** coordonnées, réseaux sociaux, lien discret « Espace gérant », « Site réalisé par Le Bâtisseur du Web ».

### Espace gérant · téléphone
- **Connexion :** identifiants préremplis pour la démo.
- **Stock :** 4 indicateurs (en vente, réservés, vendus sur 30 jours, demandes à traiter), recherche, filtres.
  - Chaque voiture a les boutons **« Marquer vendu »** puis **« Retirer du site »** (et « Remettre en ligne »), plus **« Prix · statut »** : prix avec baisses rapides −200, −500 et −1 000 €, statut, visibilité sur le site.
- **Ajouter / Modifier :**
  - photos (appareil photo ou galerie, allégées automatiquement), formulaire complet, brouillon conservé ;
  - écran de succès « Annonce publiée » ;
  - suppression avec confirmation dans la page.
- **Demandes :** liste filtrable et détail. Le détail montre les coordonnées, le véhicule, la reprise, le financement, le statut et des notes internes.
- **Barre d'onglets en bas :** Stock / + Ajouter / Demandes.

### Espace gérant · ordinateur
- **Menu à gauche** avec le logo.
- **Stock en tableau :** colonnes triables, prix modifiable directement dans le tableau, menu de statut, sélection multiple avec actions groupées, alerte pour les voitures en stock depuis plus de 45 jours.
- **Ajouter / Modifier :** formulaire et, à droite, **aperçu de l'annonce mis à jour en direct**. Les photos se glissent-déposent.
- **Demandes :** vue maître-détail, comme une messagerie.
- Même application et mêmes données que la version téléphone. La vue ordinateur ne s'affiche qu'à partir de 900 px de large.

### Règles métier en place
- **Statuts :** `disponible`, `reserve`, `vendu`. « En stock » sur le site = disponibles + réservés.
- **Voiture vendue :** elle reste affichée « Vendu » **7 jours** sur le site, puis disparaît (`SOLD_VISIBLE_DAYS`). « Retirer du site » la masque tout de suite sans la supprimer, pour garder l'historique.
- **Repasser une voiture en disponible ou réservée** la remet automatiquement en ligne.
- **Badge « Nouveau » :** voiture ajoutée depuis moins de 7 jours.
- **Demandes :** une demande passe « En cours » quand le gérant l'ouvre lui-même, jamais par simple affichage de la liste.

---

## 3. Architecture technique de la maquette

HTML, CSS et JS vanilla, sans aucune librairie. Le tout est assemblé en **un seul fichier** `dist/index.html` (environ 290 Ko). Les données de démo sont dans `localStorage` (clé `garage-maquette-v1`). Il n'y a aucun serveur.

```
maquette/
├── build.py                  # assemble src/ → dist/index.html
├── REPRISE.md                # ce fichier
├── src/
│   ├── index.template.html   # squelette : barre de démo, #public-root, #gerant-stage/.phone/#gerant-root
│   ├── tokens.css            # couleurs (clair + sombre), typo, boutons, pastilles, Crit'Air, logo, cadre téléphone
│   ├── core.js               # IDENTITÉ DU GARAGE, données de démo, Store, routeur, utilitaires
│   ├── carart.js             # illustrations SVG des voitures (6 carrosseries × 4 vues)
│   ├── public.js / .css      # site client (classes préfixées p-)
│   └── gerant.js / .css      # espace gérant téléphone + ordinateur (classes préfixées g- / g-d-)
└── dist/index.html           # fichier publié
```

**Commandes**
```bash
python3 build.py                                   # produit dist/index.html (version à publier)
```
```bash
python3 build.py tmp-test/index.html --standalone  # version testable en local (ajoute doctype + viewport)
```
Pour publier, utiliser l'outil Artifact sur `dist/index.html` à l'URL « thème Carbon » ci-dessus, **avec le dossier `dist/img/`** passé dans `files` (photos et texture carbone, chemins `img/…`).

**Points d'entrée utiles**
- **Identité du garage :** objet `GARAGE` en haut de `core.js` (nom, adresse, ville, téléphone, e-mail, réseaux, horaires). Le logo est dans `LOGO_SVG` et `Brand`.
- **Couleur de marque :** `--brand` dans `tokens.css` (rouge `#d0141d`, `#ff5a5f` en sombre), `--logo-bg` anthracite.
- **Données de démo :** `SEED_VEHICLES` (12 voitures) et `SEED_LEADS` (5 demandes) dans `core.js`.
- **API globale :** `window.App` (Store, fmt, esc, Media, UI, Router, Session, GerantView, siteVisibility…). Le site public est `window.PublicSite.render(route, el)`, l'espace gérant `window.GerantApp.render(route, el)` (avec `desktopReady: true`).
- **Routes** (hash simples) : `#accueil #showroom #vehicule-v3 #garage #contact #mentions #gerant #gerant-stock #gerant-ajout #gerant-modifier-v3 #gerant-demandes #gerant-demande-d2`.

**Conventions de Colin :** variables et fonctions en anglais, commentaires en français, indentation 2 espaces, `App.esc()` sur toute donnée saisie, objectifs WCAG et Lighthouse 90+, mobile d'abord. Pas d'`alert`, `confirm` ou `prompt` (bloqués dans l'aperçu).

---

## 3 bis. Thème « Carbon Showroom » (24/11/2026)

- **Palette unique sombre** dans `tokens.css` : carbone, chrome, rouge Fab Auto (`--brand`), jaune atelier (`--yellow`). Le site et l'espace gérant en héritent.
- **Accueil réécrit** (`public.js`, `pageHome`) : hero showroom photo, carte « À la une », recherche rapide (marque, budget, énergie, carrosserie), bandeau d'engagements sur texture carbone, **carrousel 3D** des véhicules (`bindReel` : glisser, flèches, clavier, filtres par carrosserie), univers atelier jaune/noir, infos pratiques.
- **Page « Atelier »** (`pageGarage`) : affiche « Prenez soin de votre véhicule. », hexagones de services, cartes Reprogrammation et Dépannage, achat en 4 étapes.
- **Photos de démonstration réalistes** sur les 12 véhicules (`img/photo-*.webp`, générées pour imiter des photos prises au téléphone sur le parking du garage). Choix validé avec Colin le 25/11 : **vraies photos partout, y compris dans le carrousel, sans détourage**, pour que les visiteurs voient l'état réel des voitures. Le détourage automatique (fond « showroom ») a été testé et reste une option à chiffrer.
- Clé de stockage passée à `garage-maquette-v3`.
- Styles ajoutés en fin de `public.css` et `gerant.css` (section « Thème Carbon Showroom »).

## 3 ter. Porte de garage, atelier acier et version Bleu clair (25/11/2026)

- **Atelier** : plus de jaune. Univers acier brossé + couleur de la version (`--yellow` est redirigé vers `--brand` dans `.p-atelier`), photo `img/atelier-acier.webp`.
- **Porte de garage** (`atelierPoster` + `bindGarage` dans `public.js`, styles « Atelier acier + porte de garage » dans `public.css`) :
  - accueil : la porte se lève au défilement ; sur grand écran la scène reste en place (`.p-garage.is-pinned`, `overflow: clip` sur `.p-atelier` pour que `position: sticky` fonctionne) ;
  - page Atelier : la porte s'ouvre seule à l'arrivée ;
  - animations réduites : porte masquée.
- **Version Bleu clair** : `src/theme-bleu.css`, ajouté par `python3 build.py --theme=bleu` (sortie `dist-bleu/`). Showroom clair `img/hero-showroom-clair.webp`, tout le rouge en bleu sauf le logo.
- **Publication** : `dist/index.html` → lien noir et rouge ; `dist-bleu/index.html` → lien Bleu clair, en passant le dossier `img/` dans `files`.
- **Livrables** (`../livrables/`) : un PDF de présentation et un fichier hors ligne par version, sources zippées. Régénérer avec `outils/captures.js` puis `outils/make_pdf.py <dossier> <pdf> rouge|bleu`.

## 3 quater. Finitions validées le 25/11/2026

- **Hero** : bulle « À la une » retirée.
- **Carbone** : motif dessiné en CSS (`--carbon-weave` dans `tokens.css`), continu sur toute la largeur (bandeau des engagements, pied de page, menu du gérant).
- **Carrousel** : boucle infinie (`offsetOf` / `mod` dans `bindReel`), flèches jamais désactivées.
- **Boutons « touche en relief »** (fin de `public.css`, fin de `gerant.css`) : coins arrondis 14 px, épaisseur visible, enfoncement à l'appui ; point lumineux qui traverse le bouton de gauche à droite (en boucle sur les boutons principaux du site, et à chaque appui partout). L'écouteur de l'appui est dans `core.js` (classe `is-zap`).

## 3 quinquies. Point d'arrêt du 25/11/2026 — à reprendre ici

**Validé et en ligne** (maquettes publiées et livrables régénérés) :
- **Étoiles en or poli façon bijou** : vraie image `img/etoile-or.webp` (96 px, détourée), générée d'après la référence du client. L'original en grand est dans `figma-fab-auto/assets/etoile-or-hd.png`. 5 étoiles sur l'affiche de l'atelier, 5 au-dessus de « Nos services » (`GOLD_STAR` et `chromeStars()` dans `public.js`, halo animé `p-star-shine` dans `public.css`).
- **Pied de page** : boutons « Appeler » et « Écrire » en `btn-primary` ; signature géante « FAB AUTO » en **liseré seul** de la couleur des boutons (bleu ou rouge selon la version), reflet blanc qui glisse sur le contour (`::after` + masque, `p-sig-shine`), et **lumière qui monte du sol** derrière les lettres avec une fine rampe lumineuse (`::before` + fond de `.p-signature`).

**Validé et publié le 25/11 en fin d'après-midi** (livrables régénérés) :
- **Lumière blanche sur le logo** (fin de `public.css`, animation `p-logo-sweep`) : un trait de lumière part du pictogramme, puis passe sur « FAB » puis « AUTO », environ 1 s toutes les 6 s. Validé par le client et en ligne sur les deux maquettes.

**Pour reprendre (dans l'ordre)** :
1. (Fait le 25/11) Lumière du logo validée.
2. Pour toute nouvelle modification, publier les deux maquettes (même fichier, même lien) :
   - noir et rouge : `maquette-fab-auto/dist/index.html` → https://claude.ai/artifact/PpZcfXRtcgs2CZyrDx8d7N (public)
   - bleu clair : `maquette-fab-auto/dist-bleu/index.html` → https://claude.ai/artifact/3Tu7RCXkwLSgm1EYg4UJsy (encore **privé** : le client doit le passer en « Toute personne disposant du lien »)
3. Puis régénérer les livrables dans `livrables/` : construire les versions autonomes (`python3 build.py <dossier>/index.html --standalone`, et `--theme=bleu`) avec une copie de `dist/img` (ou `dist-bleu/img`) à côté, lancer `node livrables/outils/captures.js <dossier>`, puis `python3 livrables/outils/make_pdf.py <dossier> <pdf> rouge|bleu`, refaire les deux HTML hors ligne (images `img/…` remplacées par des data URI) et le zip `maquette-fab-auto-sources-v5.zip`.
4. Toujours ouvert : le connecteur Google Drive du compte pro est en lecture seule ; il faut le reconnecter avec tous les droits pour déposer les livrables sur le Drive pro et refaire le brouillon de mail dans le Gmail pro.


## 4. Contrôles déjà faits (24/11/2026)

- **Audit complet**, téléphone (390 px) et ordinateur (1440 px), clair et sombre : 0 erreur console, 0 débordement horizontal, 0 image sans texte alternatif, 0 bouton sans nom.
- **Filtres et tri du showroom :** chaque option testée, résultats cohérents.
- **Parcours croisés vérifiés :**
  - une voiture ajoutée côté gérant apparaît sur le site ;
  - une demande envoyée depuis le site arrive côté gérant ;
  - « Marquer vendu » puis « Retirer du site » fonctionnent, et le lien direct vers l'annonce affiche alors « plus en ligne ».
- **Version téléphone :** identique au pixel près après l'ajout de la version ordinateur.

---

## 5. À faire valider ou à obtenir auprès du garagiste

1. **Adresse exacte à Heudicourt.** La carte indique Gisors.
2. **Horaires réels.** Ceux affichés sont des exemples.
3. **Logo vectoriel** (SVG, PDF ou AI, souvent chez l'imprimeur de ses cartes). Le logo actuel est redessiné d'après la photo de la carte.
4. **Promesses commerciales inventées pour la démo :** garantie jusqu'à 12 mois, reprise, financement (crédit, LOA), réponse sous 24 h, carte grise faite, « contrôlées et garanties ».
5. **Mentions légales :** forme juridique, SIREN/SIRET, RCS, TVA, directeur de la publication, hébergeur.
6. **Vraies photos des voitures.** Les illustrations SVG ne servent que pour la démo.
7. **Retours sur la maquette :** pages, textes, fonctions en trop ou manquantes.

## 6. Idées et points ouverts

- Renommer « Prix · statut » en **« Modifier le prix »** (Colin a hésité sur le sens du bouton).
- Ajouter l'**alerte « en stock depuis plus de 45 jours »** sur la version téléphone (elle n'existe que sur ordinateur).
- **Ancien prix barré** visible sur le site après une baisse : il faudrait ajouter un champ `previousPrice` dans `core.js`.
- Sur Android, le bouton photo propose appareil photo et galerie : l'attribut `capture` a été retiré exprès.

---

## 7. Passage en production (après validation de la maquette)

Choix recommandé et argumenté avec Colin :
- **PHP 8 + MySQL fait sur mesure sur OVHcloud** (hébergement mutualisé). Pas de WordPress : moins de maintenance, une surface d'attaque réduite, et un outil réutilisable pour d'autres garages.
- **Une seule application web**, sous la forme d'une application web installable (PWA : icône sur l'écran du téléphone, plein écran, notifications de nouvelles demandes, sans App Store). Elle est **responsive** : présentation téléphone sous 900 px, présentation ordinateur au-dessus. Espace gérant à l'adresse `/gerant`.
- **Sécurité minimale :**
  - mots de passe hachés (`password_hash`) ;
  - limitation des tentatives de connexion ;
  - jeton CSRF ;
  - requêtes préparées (PDO) ;
  - contrôle des fichiers envoyés (type réel, taille, renommage, réencodage en WebP/JPEG) ;
  - HTTPS ;
  - en-têtes de sécurité et CSP ;
  - option : code de connexion par e-mail.
- **Formulaires :** e-mail envoyé au patron avec « Répondre à » vers le client, accusé de réception au client, demande enregistrée en base, anti-spam (champ piège + limitation, éventuellement Cloudflare Turnstile), consentement RGPD.
- **Modèle de données :** reprendre les champs de `SEED_VEHICLES` et `SEED_LEADS`.
  - Table `vehicles` : `id, ref, make, model, version, year, month, km, fuel, gearbox, cv, hp, color, color_hex, body, doors, seats, critair, price, price_type, first_hand, warranty_months, status, featured, hidden_from_site, description, added_at, sold_at`.
  - Tables liées `vehicle_photos` et `vehicle_equipment`.
  - Table `leads` : `id, vehicle_id, name, phone, email, message, trade_in, trade_in_desc, financing, status, created_at`.
  - Table `lead_notes`.
  - Table `users`.
- **SEO :** données structurées `AutoDealer` et `Car` (déjà générées par la maquette), sitemap généré automatiquement, une URL par véhicule (par exemple `/vehicule/peugeot-208-vo-0142`).

## 8. Devis retenu pour le rendez-vous du 28/11/2026 (DEV-2026-11-001)

Fichier : `livrables/Fab-Auto-devis-DEV-2026-11-001.pdf` (généré par `livrables/outils/make_devis.py`). Une seule formule, **Showroom Pro**, sans options à la carte, au choix :

| | Achat | Location 36 mois |
|---|---|---|
| Création / mise en service | 5 775 € HT (30/40/30 %) | 690 € HT |
| Mensuel | 69 € HT (Forfait Sérénité, 12 mois d'engagement) | 239 € HT tout compris |
| Total sur 3 ans | 8 259 € HT | 9 294 € HT |

- L'application gérant installable (icône téléphone et PC) est **incluse sans supplément** (geste commercial décidé par Colin).
- À compléter à la main sur le devis : **SIRET** et **mention de TVA** (lignes laissées en pointillés).

### Ancienne proposition (PROP-2026-11-001, 23/11/2026)

| Formule | Achat | Location 36 mois |
|---|---|---|
| Vitrine | 1 750 € HT + 29 €/mois | 290 € + 79 €/mois |
| Showroom | 3 850 € HT + 49 €/mois | 490 € + 159 €/mois |
| **Showroom Pro** | **5 775 € HT + 69 €/mois** | **690 € + 239 €/mois** |

Options : messagerie intégrée 1 050 € (ou +35 €/mois), estimation de reprise 350 €, réservation d'essai 525 €, simulateur de mensualités 175 €, page supplémentaire 175 €.
- **L'application web installable (PWA) n'est pas dans le devis :** compter environ ½ journée en plus (175 €).
- **La version ordinateur de l'espace gérant** est comprise dans l'espace gérant (même application).
- **À compléter sur le devis :** le SIRET et la mention de TVA (art. 293 B du CGI si micro-entreprise).
