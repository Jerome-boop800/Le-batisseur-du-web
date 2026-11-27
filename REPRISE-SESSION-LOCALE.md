# Reprise Fab Auto — à donner à la nouvelle session (sur le PC de Colin)

Mis à jour le 27 novembre 2026 au soir. **Rendez-vous avec le client Fab Auto le 28 novembre 2026.**

## 1. Récupérer le travail

Tout est sur GitHub : dépôt `Jerome-boop800/Le-batisseur-du-web`, branche **`claude/sharp-hypatia-6tikwq`**.

```bash
git clone https://github.com/Jerome-boop800/Le-batisseur-du-web.git
```

```bash
cd Le-batisseur-du-web
```

```bash
git checkout claude/sharp-hypatia-6tikwq
```

Si le dépôt est déjà sur le PC :

```bash
git fetch origin claude/sharp-hypatia-6tikwq
```

```bash
git checkout claude/sharp-hypatia-6tikwq
```

```bash
git pull
```

Le dossier de reprise détaillé du projet est `maquette-fab-auto/REPRISE.md` : architecture, choix techniques, historique, devis et passage en production. Le lire en premier.

## 2. Où en est-on

**La maquette est terminée et validée par Colin.** Elle existe en deux versions, en ligne :

| Version | Lien | Partage |
|---|---|---|
| Noir et rouge | https://claude.ai/artifact/PpZcfXRtcgs2CZyrDx8d7N | public |
| Bleu clair | https://claude.ai/artifact/3Tu7RCXkwLSgm1EYg4UJsy | **encore privé** : Colin doit le passer en « Toute personne disposant du lien » (menu Partager) |

Les dernières finitions validées : étoiles en or poli (image `img/etoile-or.webp`), « FAB AUTO » du pied de page en liseré lumineux avec la lumière qui monte du sol, boutons du pied de page en relief, et trait de lumière blanche sur le logo.

**Les livrables sont prêts** dans `livrables/` :
- `Fab-Auto-devis-DEV-2026-11-001.pdf` : **nouveau devis**. Une seule formule, Showroom Pro, au choix à l'achat (5 775 € HT + 69 €/mois) ou en location 36 mois (690 € + 239 €/mois). Pas d'options à la carte. L'application gérant installable est incluse sans supplément. Le script est `livrables/outils/make_devis.py`.
- `Fab-Auto-presentation-noir-rouge.pdf` et `Fab-Auto-presentation-bleu-clair.pdf` : présentations de la maquette.
- `Fab-Auto-maquette-noir-rouge.html` et `Fab-Auto-maquette-bleu-clair.html` : maquettes hors ligne, qui s'ouvrent sans internet.
- `maquette-fab-auto-sources-v5.zip` : les sources.

## 3. Ce qu'il reste à faire, dans l'ordre

1. **Dossier Drive pro pour le rendez-vous.** Créer dans le Google Drive de **lebatisseurduweb.fr@gmail.com** (jamais le compte perso) un dossier « Fab Auto – RDV 28-11 ». Y mettre :
   - le devis ;
   - les deux présentations PDF ;
   - les deux maquettes hors ligne ;
   - un fichier « LIENS » avec les deux liens ci-dessus.

   Blocage constaté dans la session cloud : le connecteur Google Drive était connecté au bon compte, mais **en lecture seule**. Google renvoyait « missing a permission ». Pour corriger :
   - sur https://myaccount.google.com/permissions (compte pro), retirer l'accès de « Claude pour Google Drive » ;
   - le reconnecter depuis https://claude.ai/customize/connectors en cochant « voir, modifier, créer et supprimer » ;
   - mettre l'outil de création de fichiers sur « Autorisé ».

   Sur le PC, on peut aussi déposer simplement les fichiers de `livrables/` dans le dossier Google Drive synchronisé, s'il existe.
2. **Devis** : Colin complète à la main son **SIRET** et la **mention de TVA**, laissés en pointillés. Sa société est en cours de création.
3. **Lien bleu clair** : à rendre public avant de l'envoyer au client.
4. **Après le rendez-vous** :
   - envoyer au client un mail depuis le **Gmail pro**, avec le lien de la maquette et le devis ;
   - supprimer ensuite le brouillon et les copies laissés sur le compte perso (colin.jerome2012@gmail.com), en accord avec Colin.
5. **Si le client signe** : passer en production, comme décrit dans `maquette-fab-auto/REPRISE.md`, partie 7. Le site sera en PHP 8 et MySQL sur OVHcloud, avec l'espace gérant en application installable (icône sur le téléphone et l'ordinateur).

## 4. Modifier la maquette

- Les sources sont dans `maquette-fab-auto/src/`. Les principaux fichiers :
  - `public.js` et `public.css` : le site client ;
  - `gerant.*` : l'espace gérant ;
  - `tokens.css` : les couleurs et réglages communs ;
  - `theme-bleu.css` : la version bleu clair.
- Pour reconstruire :
  ```bash
  cd maquette-fab-auto
  ```
  ```bash
  python3 build.py
  ```
  ```bash
  python3 build.py --theme=bleu
  ```
  Le premier crée `dist/index.html` (noir et rouge), le second `dist-bleu/index.html` (bleu clair). Les images sont dans `dist/img/` et `dist-bleu/img/`.
- Pour publier, republier le même fichier aux mêmes liens (outil Artifact). Le lien bleu clair ne se met à jour que depuis une session qui l'a déjà lu : passer son URL comme `url`.
- Pour refaire les PDF : voir `maquette-fab-auto/REPRISE.md`, partie « 3 quinquies ». Les outils sont `livrables/outils/captures.js` (Playwright) et `livrables/outils/make_pdf.py` (reportlab).

## 5. Façon de travailler avec Colin

- Répondre en français, de façon simple et concise.
- Pour tout changement visuel : **montrer un visuel avant d'appliquer**, puis publier seulement après son « ok ».
- Tout ce qui est professionnel passe par ses comptes pro (Drive et Gmail lebatisseurduweb.fr@gmail.com).
