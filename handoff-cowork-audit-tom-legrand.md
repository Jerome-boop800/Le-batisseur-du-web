# Reprise de travail pour Cowork — Corrections post-audit sécurité (site Tom Legrand)

Bonjour Cowork. Voici le contexte d'un travail commencé dans une autre session. Prends le relais directement sur mes fichiers locaux.

## Contexte
- **Projet concerné :** le site vitrine « Tom Legrand Jardin & Services ».
- **Dossier du code sur mon PC :** `C:\Users\colin\Desktop\Sites et application\Legrand Tom site\SITE-MINI`
- J'ai lancé un **audit de sécurité complet** avec l'outil **Strix** (agent IA de pentest, open-source `usestrix/strix`) sur ce dossier, en mode approfondi (`-m deep`).

## Résultat de l'audit
✅ **Aucune vulnérabilité trouvée.** Le rapport conclut : *"No remediation is required for the static site, as no vulnerabilities were found."*
Le rapport complet est sauvegardé dans le sous-dossier **`strix_runs`** à l'intérieur de `SITE-MINI`.

Il ne reste que **2 petits points d'hygiène facultatifs** (ce ne sont PAS des failles), que je veux corriger maintenant avec toi.

## Ce que je te demande de faire

### Correction 1 — Fichier `_headers`
Dans le fichier `_headers` du projet, il existe une règle `noindex` qui pointe vers une page **`/design-system.html`**. Cette page **n'existe plus** dans le site publié.
➡️ **Supprime cette règle devenue inutile** (la section/les lignes concernant `/design-system.html`), pour garder la configuration propre et exacte.

### Correction 2 — Politique de sécurité CSP (directive `img-src`)
Dans la **Content-Security-Policy** du site (à chercher dans le fichier `_headers`, ou dans une balise `<meta http-equiv="Content-Security-Policy">` d'un fichier HTML), la directive `img-src` contient `data:`.
➡️ **Vérifie d'abord si le site utilise des images intégrées en ligne** (data-URI, c'est-à-dire des images encodées directement dans le code, du type `src="data:image/...")`.
- **Si AUCUNE image data-URI n'est utilisée :** retire `data:` de `img-src` pour resserrer un peu la politique de sécurité.
- **Si des images data-URI sont utilisées :** NE touche à rien (sinon des images disparaîtraient). Dis-le-moi simplement.

## Après les corrections
1. Montre-moi les changements effectués (le `diff`).
2. Vérifie que le site s'affiche toujours correctement (aucune image cassée, aucune erreur console).
3. Aide-moi ensuite à **recommiter et remettre en ligne** la version corrigée.

Merci !
