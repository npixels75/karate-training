# Plan — App d'entraînement karaté contre adversaire virtuel

Nov 6, 2026 · @Benoit

## 1. Concept

Une app plein écran posée face à soi (TV, tablette, ordinateur) qui joue le rôle d'un partenaire d'entraînement. Elle affiche des attaques (image, silhouette ou courte vidéo) à un rythme fixe ou aléatoire ; le karatéka réagit par le blocage, l'esquive ou la contre-attaque adaptée. Tout est paramétrable : rythme, types d'attaques, durée, rounds, sons.

Objectifs d'entraînement visés :

- Temps de réaction et lecture de l'attaque
- Automatisme blocage → contre (uke → tsuki/geri)
- Endurance par rounds, comme en kumite
- Gestion de l'imprévu (aléatoire, feintes)

## 2. Boucle d'entraînement de base

1. Choix d'un programme (ou réglage rapide).
2. Compte à rebours de départ (3-2-1, signal sonore).
3. Pendant le round : une attaque apparaît → reste visible X secondes → écran neutre (garde de l'adversaire) → attaque suivante après un délai fixe ou aléatoire.
4. Fin de round : signal, temps de repos affiché.
5. Fin de séance : résumé (nombre d'attaques, répartition, durée totale).

## 3. Paramètres

| Paramètre | Options proposées |
| --- | --- |
| Mode de déclenchement | Régulier (toutes les X s) · Aléatoire (entre min et max) · Rafales (2-4 attaques enchaînées) |
| Intervalle | Fixe : 1 à 10 s · Aléatoire : plage min-max |
| Durée d'affichage | 0,3 à 3 s (plus court = plus dur) |
| Attaques actives | Sélection par catégorie : poings (oi-zuki, gyaku-zuki, kizami-zuki, uraken), pieds (mae-geri, mawashi-geri, yoko-geri, ushiro-geri), saisies |
| Niveau | Jodan · Chudan · Gedan |
| Côté | Gauche · Droite · Les deux |
| Pondération | Fréquence relative de chaque attaque (ex. plus de mawashi-geri) |
| Rounds | Nombre, durée du round, durée du repos |
| Sons | Bip, kiai, annonce vocale du nom (FR ou japonais), muet |
| Affichage | Image seule, image + nom, nom seul (mode « annonce ») |
| Difficulté progressive | Accélération du rythme au fil du round |

Les réglages sont enregistrables en programmes nommés (« Échauffement », « Kumite 3×2 min », « Réflexes jodan »…).

## 4. Modes d'entraînement

- **Libre** : attaques selon les paramètres, sans consigne de réponse.
- **Défense imposée** : l'app affiche l'attaque puis, après un court délai, la défense attendue (ex. gedan-barai) pour vérifier ou apprendre.
- **Combinaisons** : enchaînements prédéfinis (ex. kizami-zuki → gyaku-zuki → mawashi-geri) à parer dans l'ordre.
- **Feintes** : certaines images sont des fausses attaques ; consigne de ne pas réagir. Travaille la retenue et la lecture.
- **Couleurs / codes** : au lieu d'une image, une couleur ou une flèche indique la réponse (ex. rouge = esquive, bleu = contre). Utile pour le travail cognitif pur.
- **Kumite simulé** : rounds avec rythme qui varie, pauses « mate », annonce de fin.
- **Kihon guidé** : l'app annonce des techniques à exécuter (pas seulement des attaques à parer), en série.

## 5. Contenu visuel des attaques

Plusieurs options, de la plus simple à la plus riche :

1. **Silhouettes vectorielles (SVG)** : légères, nettes à distance, faciles à colorer et à inverser gauche/droite par miroir. Bon choix pour le MVP.
2. **Photos maison** : un partenaire photographié en fin de mouvement pour chaque attaque. Très réaliste, demande une séance photo.
3. **Courtes vidéos / GIF** (0,5–1 s) : montrent l'amorce du geste, donc la vraie lecture d'attaque. Plus lourd mais le plus proche du réel.
4. **Avatar 3D animé** (Three.js) : un adversaire qui bouge en garde, avance, attaque. Projet plus ambitieux, pour une V3.

Conseils : fond contrasté, sujet en taille réelle ou presque, lisible à 3 m, cohérence gauche/droite (attaque du bras droit de l'adversaire = côté gauche de l'écran).

## 6. Idées complémentaires

- **Mesure du temps de réaction** via la caméra : détection de mouvement (MediaPipe Pose dans le navigateur) pour mesurer le délai entre l'apparition de l'attaque et le début de la réponse. Statistiques par attaque et par côté.
- **Vérification de la défense** : avec MediaPipe, reconnaître grossièrement si le bras est monté (age-uke) ou descendu (gedan-barai). Ambitieux, à garder pour plus tard.
- **Annonce vocale** des techniques en japonais : idéal pour apprendre le vocabulaire ; synthèse vocale du navigateur ou fichiers audio enregistrés.
- **Pré-signal** optionnel : petit son ou clignotement juste avant l'attaque pour les débutants, retiré aux niveaux supérieurs.
- **Historique et progression** : séances enregistrées, temps total, régularité, graphique des temps de réaction.
- **Niveaux par ceinture** : jeux d'attaques et vitesses adaptés (blanche → noire).
- **Mode télécommande** : piloter pause/reprise depuis le téléphone pendant que l'écran principal est sur la TV.
- **Montre connectée** : vibration en début/fin de round.
- **Mode duo** : deux pratiquants, l'app désigne qui défend.
- **Échauffement et retour au calme** intégrés au programme.
- **Partage de programmes** via un lien ou un fichier JSON.

## 7. Architecture technique proposée

- **PWA** (HTML/JS, installable, fonctionne hors ligne) : même approche que DialedIn, aucun store nécessaire.
- **Moteur de séance** : un séquenceur qui calcule à l'avance la liste des événements (attaque, délai, repos) à partir des paramètres, avec une graine aléatoire pour pouvoir rejouer une séance.
- **Timing précis** : `requestAnimationFrame` pour l'affichage, Web Audio API pour des sons sans latence.
- **Écran actif** : Wake Lock API pour éviter la mise en veille, mode plein écran.
- **Stockage** : programmes et historique en IndexedDB (localStorage pour les réglages simples) ; synchronisation éventuelle plus tard (PocketBase sur le NAS ou Cloudflare D1).
- **Médias** : bibliothèque d'attaques décrite en JSON (id, nom FR/JP, catégorie, niveau, côté, fichier image/vidéo/son), facile à étendre.
- **Vision (optionnel)** : MediaPipe Pose / TensorFlow.js, tout en local dans le navigateur.
- **Diffusion TV** : AirPlay / Chromecast de l'onglet, ou PWA ouverte directement sur le navigateur de la TV.
- **Hébergement** : Cloudflare Pages / Workers.

## 7 bis. Faisabilité en HTML / JS / CSS

Conclusion : le MVP et la V2 sont réalisables en web statique pur (hébergement Cloudflare Pages). Seules la télécommande et la synchro entre appareils demandent un petit backend.

| Fonction | Faisabilité web | Remarques |
| --- | --- | --- |
| Séquenceur, modes, rounds, programmes | ✅ Totale | Logique JS simple |
| Images SVG, photos, vidéos courtes | ✅ Totale | Natif |
| Sons sans latence | ✅ Totale | Web Audio API ; un toucher sur « Démarrer » doit débloquer l'audio |
| Écran toujours allumé | ✅ Totale | Wake Lock API, iOS 16.4+ compris |
| Stockage local (programmes, historique) | ✅ Totale | IndexedDB |
| Hors ligne, installable | ✅ Totale | PWA + service worker |
| Avatar 3D | ✅ Totale | Three.js |
| Partage de programmes | ✅ Totale | Export JSON ou lien |
| Détection de mouvement / temps de réaction | 🟡 Avec limites | MediaPipe Pose en local (WASM + WebGL) ; \~30 fps sur ordi ou iPad récent ; trop lourd pour le navigateur d'une TV |
| Reconnaissance précise de la défense | 🟡 Difficile | Faisable mais demande beaucoup de réglages ; à garder en dernier |
| Voix japonaise | 🟡 Variable | speechSynthesis dépend des voix installées ; fichiers audio enregistrés plus sûrs |
| Plein écran | 🟡 Variable | OK sur ordi et Android ; sur iPhone, passer par la PWA installée sur l'écran d'accueil |
| Diffusion TV | 🟡 Latence | AirPlay/Cast ajoute \~100–300 ms ; fausse la mesure de réaction ; la caméra doit tourner sur l'appareil qui calcule |
| Télécommande depuis le téléphone | 🟠 Petit backend | Temps réel entre appareils : WebSocket (Cloudflare Durable Objects) ou WebRTC (PeerJS) |
| Synchro historique multi-appareils | 🟠 Petit backend | Cloudflare D1/KV ou PocketBase sur le NAS |
| Montre connectée | ❌ Non | Pas d'accès depuis le web, Web Bluetooth absent sur iOS ; alternative : vibration du téléphone (Android seulement) ou bip fort |

## 8. Feuille de route

**MVP (1–2 week-ends)**

- Bibliothèque de 8–12 attaques en silhouettes SVG
- Modes régulier et aléatoire, durée d'affichage, rounds/repos
- Sons de base, plein écran, Wake Lock
- Sauvegarde de 3–5 programmes

**V2**

- Combinaisons, feintes, mode défense imposée
- Annonce vocale FR/JP
- Photos ou vidéos maison
- Historique des séances

**V3**

- Mesure du temps de réaction par caméra
- Avatar 3D animé
- Télécommande depuis le téléphone, niveaux par ceinture

## 9. Points d'attention

- **Sécurité** : espace dégagé devant l'écran, distance minimale, écran fixé ; rappel d'échauffement.
- **Lisibilité** : tester à la distance réelle d'entraînement (2–4 m).
- **Latence** : vérifier le décalage en cas de diffusion sur TV (AirPlay/Cast ajoute du retard) ; prévoir un réglage de compensation pour la mesure de réaction.
- **Réalisme** : une image statique n'apprend pas à lire l'amorce d'un geste ; les vidéos courtes sont un vrai plus.
- **Droits** : utiliser ses propres images ou des illustrations créées pour l'app.

## 10. Décisions

| Question | Décision | Conséquence pour le développement |
| --- | --- | --- |
| Style | **Shotokan** | Bibliothèque de techniques Shotokan : oi-zuki, gyaku-zuki, kizami-zuki, uraken-uchi, mae-geri, mawashi-geri, yoko-geri kekomi, ushiro-geri ; défenses age-uke, soto-uke, uchi-uke, gedan-barai, shuto-uke ; noms japonais selon la terminologie Shotokan (JKA) |
| Support | **Tablette ou smartphone** | Interface mobile en priorité, en paysage pendant la séance ; gros boutons utilisables à distance ; PWA installée sur l'écran d'accueil pour le plein écran sur iPhone ; Wake Lock indispensable ; pas de diffusion TV au départ |
| Visuels | **Silhouettes SVG d'abord**, photos et vidéos plus tard | MVP en SVG ; prévoir dès le départ une bibliothèque JSON où chaque attaque accepte un fichier SVG, image ou vidéo, pour passer aux médias réels sans réécrire le code |
| Usage | **Solo** | Pas de comptes ni de backend ; tout en local (IndexedDB) ; mode duo et télécommande sortis de la feuille de route |
| Mesure caméra | **Plus tard** | Hors MVP et V2 ; reste en V3 |
