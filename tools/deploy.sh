#!/usr/bin/env bash
# Déploie le site sur Cloudflare Pages (projet « kumite-trainer » uniquement).
# Usage : bash tools/deploy.sh
# Seuls les fichiers servis sont envoyés (pas plan.md, tools/, CLAUDE.md…).
set -euo pipefail

PROJECT="kumite-trainer"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$(mktemp -d)"
trap 'rm -rf "$DIST"' EXIT

cd "$ROOT"
cp -R index.html manifest.webmanifest sw.js css js data assets icons "$DIST"/
find "$DIST" -name .DS_Store -delete

npx wrangler pages deploy "$DIST" --project-name "$PROJECT" --branch main --commit-dirty=true
