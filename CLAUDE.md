# Karate Training — conventions

Plan produit : `plan.md`. Avancer phase par phase (MVP → V2 → V3), ne construire que la phase demandée.

## Stack
- PWA statique, **sans framework ni build** : HTML + CSS + JS (modules ES natifs).
- Hébergement cible : Cloudflare Pages (dossier racine = site).
- Tout en local : IndexedDB (programmes), localStorage seulement pour petits réglages. Pas de backend, pas de comptes.
- Interface en **français** ; noms de techniques en japonais, terminologie Shotokan (JKA).

## Structure
- `index.html`, `css/style.css`, `js/*.js` (modules), `sw.js`, `manifest.webmanifest`
- `data/attacks.json` : bibliothèque d'attaques. Chaque attaque a un `media` par niveau
  (`{ "type": "svg" | "image" | "video", "src": "..." }`). Côté gauche = miroir du côté droit
  sauf si un média `<niveau>-gauche` explicite existe.
- `assets/attacks/*.svg` : silhouettes générées par `tools/gen-silhouettes.mjs`
  (`node tools/gen-silhouettes.mjs`). Ne pas éditer les SVG à la main : modifier les poses dans le script.
- Convention visuelle : l'adversaire fait face à l'utilisateur ; une attaque du bras/jambe **droit**
  de l'adversaire apparaît **à gauche** de l'écran.

## Dev
- Serveur local : `python3 -m http.server 8080` à la racine.
- Après modif d'un fichier servi, incrémenter `CACHE_VERSION` dans `sw.js`.
- Déploiement : `bash tools/deploy.sh` → projet Cloudflare Pages `kumite-trainer` (https://kumite-trainer.pages.dev).
  Ne toucher à aucun autre projet/Worker/domaine Cloudflare de l'utilisateur. Ne plus passer `--force`.
- Support prioritaire : tablette/smartphone en paysage, lisible à 2–4 m.
