// Génère les silhouettes SVG des attaques dans assets/attacks/.
// Usage : node tools/gen-silhouettes.mjs
//
// Repère : viewBox 400×600, l'adversaire fait face à l'utilisateur.
// Toutes les poses sont dessinées pour le côté DROIT de l'adversaire,
// qui apparaît à GAUCHE de l'écran (x < 200). Le côté gauche est obtenu par miroir.
// Les membres « proches » (qui viennent vers l'utilisateur) ont une extrémité
// plus grosse pour suggérer la perspective.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'attacks');
mkdirSync(OUT, { recursive: true });

const C = {
  body: '#e9e9ee',
  attack: '#ff453a',
  belt: '#1c1c1e',
  shadow: 'rgba(255,255,255,0.10)',
  motion: 'rgba(255,69,58,0.55)',
  outline: '#121216', // = fond de l'app : sépare les membres qui se chevauchent
};
const OL = 7; // épaisseur du contour

const W = { arm: 24, leg: 34 };

// ---------- Primitives ----------
const limb = (pts, w, end, attack = false, kind = 'arm') => ({ pts, w, end, attack, kind });
const fist = (r) => ({ shape: 'circle', r });
const foot = (rx, ry = rx) => ({ shape: 'ellipse', rx, ry });

function drawLimb(l) {
  const color = l.attack ? C.attack : C.body;
  const d = l.pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  const [ex, ey] = l.pts[l.pts.length - 1];
  const endEl = (fill, grow) => {
    if (!l.end) return '';
    return l.end.shape === 'circle'
      ? `<circle cx="${ex}" cy="${ey}" r="${l.end.r + grow}" fill="${fill}"/>`
      : `<ellipse cx="${ex}" cy="${ey}" rx="${l.end.rx + grow}" ry="${l.end.ry + grow}" fill="${fill}"/>`;
  };
  const stroke = (c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return stroke(C.outline, l.w + OL * 2) + endEl(C.outline, OL) + stroke(color, l.w) + endEl(color, 0);
}

function render(p) {
  const [sR, sL, hL, hR] = p.torso; // épaule D, épaule G, hanche G, hanche D
  const torso = `<path d="M${sR[0]} ${sR[1]} L${sL[0]} ${sL[1]} L${hL[0]} ${hL[1]} L${hR[0]} ${hR[1]} Z" fill="${C.body}" stroke="${C.body}" stroke-width="22" stroke-linejoin="round"/>`;
  const neck = `<path d="M${(sR[0] + sL[0]) / 2} ${(sR[1] + sL[1]) / 2} L${p.head[0]} ${p.head[1]}" stroke="${C.body}" stroke-width="26" stroke-linecap="round"/>`;
  const head = `<circle cx="${p.head[0]}" cy="${p.head[1]}" r="${p.headR ?? 34}" fill="${C.body}"/>`;
  const beltY = (hL[1] + hR[1]) / 2 - 18;
  const belt = `<path d="M${hR[0] - 8} ${hR[1] - 18} L${hL[0] + 8} ${hL[1] - 18}" stroke="${C.belt}" stroke-width="12" stroke-linecap="round"/>`
    + (p.backView ? `<circle cx="${(hR[0] + hL[0]) / 2}" cy="${beltY}" r="9" fill="${C.belt}"/>` : '');
  const legs = p.limbs.filter((l) => l.kind === 'leg' && !l.attack);
  const arms = p.limbs.filter((l) => l.kind === 'arm' && !l.attack);
  const atk = p.limbs.filter((l) => l.attack);
  const shadow = `<ellipse cx="200" cy="585" rx="150" ry="12" fill="${C.shadow}"/>`;
  const motion = (p.motion || [])
    .map((d) => `<path d="${d}" fill="none" stroke="${C.motion}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 14"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">`
    + shadow
    + legs.map(drawLimb).join('')
    + torso + belt + neck + head
    + arms.map(drawLimb).join('')
    + motion
    + atk.map(drawLimb).join('')
    + `</svg>\n`;
}

// ---------- Éléments communs ----------
const T0 = [[148, 150], [252, 150], [232, 310], [168, 310]];
const guardArmR = limb([[148, 150], [132, 235], [176, 218]], W.arm, fist(16));
const guardArmL = limb([[252, 150], [286, 212], [256, 168]], W.arm, fist(19));
const hikiteL = limb([[252, 150], [292, 245], [262, 282]], W.arm, fist(15));
const legs = {
  // hidari-kamae : jambe gauche (écran droite) devant
  hidari: [
    limb([[168, 310], [150, 440], [136, 552]], W.leg, foot(18, 12), false, 'leg'),
    limb([[232, 310], [266, 436], [276, 578]], W.leg + 4, foot(24, 15), false, 'leg'),
  ],
  // migi-kamae : jambe droite (écran gauche) devant
  migi: [
    limb([[232, 310], [250, 440], [264, 552]], W.leg, foot(18, 12), false, 'leg'),
    limb([[168, 310], [134, 436], [124, 578]], W.leg + 4, foot(24, 15), false, 'leg'),
  ],
  // zenkutsu-dachi profond, jambe droite devant
  zenkutsuMigi: [
    limb([[232, 315], [262, 440], [282, 548]], W.leg, foot(18, 12), false, 'leg'),
    limb([[168, 315], [118, 430], [108, 580]], W.leg + 6, foot(26, 16), false, 'leg'),
  ],
};

// ---------- Poses ----------
const poses = {};

poses['guard'] = { head: [200, 85], torso: T0, limbs: [...legs.hidari, guardArmR, guardArmL] };

// Oi-zuki : pas en avant, jambe et bras droits devant, hikite à la hanche.
const oi = (fistPos, elbow) => ({
  head: [200, 92],
  torso: [[150, 158], [250, 156], [232, 315], [168, 315]],
  limbs: [...legs.zenkutsuMigi, hikiteL, limb([[150, 158], elbow, fistPos], W.arm + 4, fist(44), true)],
});
poses['oi-zuki-chudan'] = oi([196, 250], [170, 212]);
poses['oi-zuki-jodan'] = oi([192, 112], [168, 150]);

// Gyaku-zuki : jambe gauche devant, bras droit (arrière) frappe, hanches tournées.
const gyaku = (fistPos, elbow) => ({
  head: [210, 90],
  torso: [[160, 152], [246, 160], [234, 312], [176, 308]],
  limbs: [...legs.hidari, hikiteL, limb([[160, 152], elbow, fistPos], W.arm + 4, fist(44), true)],
});
poses['gyaku-zuki-chudan'] = gyaku([206, 252], [182, 210]);
poses['gyaku-zuki-jodan'] = gyaku([204, 112], [178, 150]);

// Kizami-zuki : bras avant (droit, migi-kamae), garde haute, buste en retrait.
const kizami = (fistPos, elbow) => ({
  head: [214, 86],
  torso: [[156, 150], [256, 152], [236, 310], [172, 310]],
  limbs: [...legs.migi, limb([[256, 152], [282, 222], [240, 196]], W.arm, fist(17)),
    limb([[156, 150], elbow, fistPos], W.arm + 2, fist(40), true)],
});
poses['kizami-zuki-chudan'] = kizami([190, 238], [160, 206]);
poses['kizami-zuki-jodan'] = kizami([186, 112], [158, 148]);

// Uraken-uchi : revers du poing, trajectoire circulaire depuis l'extérieur.
poses['uraken-uchi-jodan'] = {
  head: [212, 88],
  torso: [[154, 150], [254, 152], [234, 310], [170, 310]],
  limbs: [...legs.migi, limb([[254, 152], [284, 220], [244, 198]], W.arm, fist(17)),
    limb([[154, 150], [92, 132], [138, 92]], W.arm + 2, fist(34), true)],
  motion: ['M60 190 Q40 110 110 70'],
};

// Mae-geri : jambe arrière droite monte, plante du pied vers l'utilisateur.
const mae = (knee, footPos, head, r = 50) => ({
  head,
  torso: [[150, 150], [250, 152], [234, 312], [170, 312]],
  limbs: [limb([[234, 312], [244, 446], [252, 580]], W.leg + 2, foot(22, 14), false, 'leg'),
    guardArmR, guardArmL,
    limb([[170, 312], knee, footPos], W.leg + 4, foot(r, r * 0.8), true, 'leg')],
});
poses['mae-geri-chudan'] = mae([158, 252], [182, 286], [204, 86]);
poses['mae-geri-jodan'] = mae([154, 196], [180, 168], [214, 92]);
poses['mae-geri-gedan'] = mae([164, 330], [182, 402], [200, 84], 46);

// Mawashi-geri : jambe droite décrit un arc depuis l'extérieur, buste penché.
const mawashi = (knee, footPos) => ({
  head: [256, 112],
  torso: [[172, 168], [268, 186], [244, 330], [186, 322]],
  limbs: [limb([[244, 330], [254, 452], [258, 580]], W.leg + 2, foot(22, 14), false, 'leg'),
    limb([[268, 186], [300, 250], [270, 218]], W.arm, fist(16)),
    limb([[172, 168], [150, 240], [196, 228]], W.arm, fist(16)),
    limb([[186, 322], knee, footPos], W.leg + 4, foot(36, 26), true, 'leg')],
  motion: [`M${knee[0] - 20} ${knee[1] + 60} Q${knee[0] - 40} ${knee[1] - 20} ${footPos[0] - 50} ${footPos[1] - 40}`],
});
poses['mawashi-geri-jodan'] = mawashi([78, 240], [150, 140]);
poses['mawashi-geri-chudan'] = mawashi([72, 318], [150, 262]);

// Yoko-geri kekomi : corps de profil, buste incliné loin, tranchant du pied en avant.
const yoko = (knee, footPos) => ({
  head: [282, 140],
  torso: [[226, 180], [272, 196], [238, 330], [204, 318]],
  limbs: [limb([[238, 330], [258, 452], [262, 580]], W.leg + 2, foot(22, 14), false, 'leg'),
    limb([[272, 196], [300, 268], [262, 238]], W.arm, fist(16)),
    limb([[226, 180], [180, 250], [150, 300]], W.arm, fist(16)),
    limb([[204, 318], knee, footPos], W.leg + 6, foot(62, 26), true, 'leg')],
});
poses['yoko-geri-kekomi-chudan'] = yoko([150, 300], [150, 268]);
poses['yoko-geri-kekomi-jodan'] = yoko([150, 230], [148, 176]);

// Ushiro-geri : dos tourné, regard par-dessus l'épaule, talon vers l'utilisateur.
poses['ushiro-geri-chudan'] = {
  head: [238, 150],
  headR: 32,
  backView: true,
  torso: [[156, 196], [252, 190], [236, 334], [170, 334]],
  limbs: [limb([[236, 334], [246, 456], [250, 580]], W.leg + 2, foot(22, 14), false, 'leg'),
    limb([[252, 190], [290, 262], [270, 300]], W.arm, fist(15)),
    limb([[156, 196], [124, 262], [138, 306]], W.arm, fist(15)),
    limb([[170, 334], [176, 306], [188, 270]], W.leg + 6, foot(46, 40), true, 'leg')],
};

// Ura-mawashi-geri : jambe droite part vers l'extérieur opposé, talon revient au visage.
poses['ura-mawashi-geri-jodan'] = {
  head: [148, 126],
  torso: [[132, 186], [224, 168], [228, 326], [170, 334]],
  limbs: [limb([[170, 334], [158, 456], [152, 580]], W.leg + 2, foot(22, 14), false, 'leg'),
    limb([[132, 186], [104, 256], [136, 236]], W.arm, fist(16)),
    limb([[224, 168], [256, 230], [226, 212]], W.arm, fist(16)),
    limb([[228, 326], [330, 236], [252, 130]], W.leg + 4, foot(34, 28), true, 'leg')],
  motion: ['M352 180 Q350 90 290 82'],
};

// Eri-tori : saisie du col à deux mains, main droite dominante.
poses['eri-tori-chudan'] = {
  head: [200, 96],
  torso: [[150, 160], [250, 160], [232, 316], [168, 316]],
  limbs: [...legs.zenkutsuMigi,
    limb([[250, 160], [262, 214], [228, 236]], W.arm + 2, fist(34)),
    limb([[150, 160], [140, 214], [172, 236]], W.arm + 4, fist(40), true)],
};

for (const [name, pose] of Object.entries(poses)) {
  writeFileSync(join(OUT, `${name}.svg`), render(pose));
}
console.log(`${Object.keys(poses).length} silhouettes → ${OUT}`);

// ---------- Icône de l'app ----------
{
  const inner = render(poses['mawashi-geri-jodan']).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">`
    + `<rect width="512" height="512" fill="${C.outline}"/>`
    + `<circle cx="256" cy="256" r="200" fill="#2a2a32"/>`
    + `<g transform="translate(106 46) scale(0.72)">${inner}</g></svg>\n`;
  const iconDir = join(OUT, '..', '..', 'icons');
  mkdirSync(iconDir, { recursive: true });
  writeFileSync(join(iconDir, 'icon.svg'), icon);
  console.log('icône → icons/icon.svg');
}
