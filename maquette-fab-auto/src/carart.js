/* =========================================================
   Maquette garage — illustrations SVG des véhicules
   Tant que le gérant n'a pas envoyé de photo, chaque véhicule
   est représenté par une « photo de studio » stylisée générée.
   API : window.CarArt.svg(vehicle, view) → chaîne SVG
   view : 'side' | 'detail' | 'interior' | 'rear' (autre → 'side')
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Utilitaires ---------- */
  let uid = 0; // compteur : ids de <defs> uniques à chaque appel
  const f = (v) => Math.round(v * 10) / 10; // arrondi au dixième (SVG léger)
  // Points des chemins : entiers (grandes formes), au dixième dans les roues (pq = 10)
  let pq = 1;
  const pt = (p) => Math.round(p[0] * pq) / pq + ' ' + Math.round(p[1] * pq) / pq;

  function rgb(h) {
    let s = String(h || '').trim().replace('#', '');
    if (s.length === 3) s = s.replace(/./g, (c) => c + c);
    const n = parseInt(s, 16);
    return s.length === 6 && !isNaN(n) ? [n >> 16 & 255, n >> 8 & 255, n & 255] : [125, 131, 139];
  }
  /** Mélange deux couleurs hexadécimales (t = 0 → a, t = 1 → b) */
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  const lum = (h) => { const c = rgb(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; };
  /** Hachage FNV-1a : variations déterministes selon l'id du véhicule */
  function hash(s) {
    let h = 2166136261;
    s = String(s == null ? '' : s);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /** Chemin à coins arrondis : pts = [[x, y, rayon], …] en px */
  function rpath(pts, closed) {
    const N = pts.length;
    const P = (i) => pts[(i + N) % N];
    let d = closed ? '' : 'M' + pt(pts[0]);
    for (let i = closed ? 0 : 1; i < (closed ? N : N - 1); i++) {
      const [x, y, r = 0] = pts[i], p = P(i - 1), n = P(i + 1);
      const d1 = Math.hypot(p[0] - x, p[1] - y) || 1, d2 = Math.hypot(n[0] - x, n[1] - y) || 1;
      const rr = Math.min(r, d1 / 2, d2 / 2);
      const a = [x + (p[0] - x) * rr / d1, y + (p[1] - y) * rr / d1];
      d += (d ? 'L' : 'M') + pt(a);
      if (rr > 0) d += 'Q' + pt([x, y]) + ' ' + pt([x + (n[0] - x) * rr / d2, y + (n[1] - y) * rr / d2]);
    }
    return d + (closed ? 'Z' : 'L' + pt(pts[N - 1]));
  }

  /** Abscisses où le polygone (en mètres) croise la hauteur y */
  function crossX(poly, y) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) out.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    return out;
  }

  /* ---------- Silhouettes paramétriques (mètres, avant à gauche) ----------
     L longueur, H hauteur, wd diamètre de roue, wb empattement, ovF porte-à-faux avant,
     cl hauteur du bas de caisse, noseY/hx/hoodF nez et bord du capot, cowl base du pare-brise,
     belt ligne de caisse (+ rise vers l'arrière), roofF/roofR début/fin de pavillon,
     rear points de la poupe [x, y, rayon], dlo bord arrière des vitres [haut, bas],
     bX montant central, qX montant de custode, tail feu arrière [x avant, y haut, y bas],
     W largeur, rw largeur du pavillon, tr voie (vue arrière). */
  const BODIES = {
    citadine: {
      L: 4.05, H: 1.46, wd: 0.67, wb: 2.54, ovF: 0.79, cl: 0.16, noseY: 0.52, hx: 0.12, hoodF: 0.8,
      cowl: [1.22, 0.97], belt: 1.0, rise: 0.07, roofF: 1.95, roofR: 3.3, drop: 0.07,
      rear: [[3.84, 1.3, 0.14], [3.98, 1.02, 0.3], [4.05, 0.6, 0.12]],
      dlo: [3.16, 3.5], bX: 2.25, tail: [3.8, 1.03, 0.88],
      W: 1.75, rw: 1.16, tr: 1.48, kind: 'hatch'
    },
    compacte: {
      L: 4.28, H: 1.46, wd: 0.69, wb: 2.63, ovF: 0.86, cl: 0.14, noseY: 0.5, hx: 0.15, hoodF: 0.77,
      cowl: [1.45, 0.95], belt: 0.98, rise: 0.08, roofF: 2.25, roofR: 3.55, drop: 0.05,
      rear: [[4.1, 1.3, 0.14], [4.22, 0.99, 0.3], [4.28, 0.6, 0.12]],
      dlo: [3.4, 3.78], bX: 2.55, tail: [3.98, 0.99, 0.85],
      W: 1.79, rw: 1.2, tr: 1.54, kind: 'hatch'
    },
    berline: {
      L: 4.69, H: 1.43, wd: 0.7, wb: 2.87, ovF: 0.86, cl: 0.14, noseY: 0.48, hx: 0.2, hoodF: 0.73,
      cowl: [1.58, 0.92], belt: 0.95, rise: 0.07, roofF: 2.45, roofR: 3.42,
      rear: [[4.08, 1.04, 0.3], [4.62, 1.0, 0.14], [4.69, 0.62, 0.12]],
      dlo: [3.4, 3.88], bX: 2.68, qX: 3.55, tail: [4.42, 0.97, 0.86],
      W: 1.85, rw: 1.2, tr: 1.58, kind: 'sedan'
    },
    suv: {
      L: 4.45, H: 1.64, wd: 0.77, wb: 2.68, ovF: 0.9, cl: 0.25, noseY: 0.7, hx: 0.14, hoodF: 0.97,
      cowl: [1.45, 1.11], belt: 1.13, rise: 0.06, roofF: 2.18, roofR: 3.92,
      rear: [[4.3, 1.5, 0.12], [4.4, 1.12, 0.3], [4.45, 0.7, 0.12]],
      dlo: [3.84, 4.06], bX: 2.47, qX: 3.62, tail: [4.12, 1.15, 1.02],
      W: 1.84, rw: 1.3, tr: 1.58, kind: 'hatch', clad: true, rails: true
    },
    break: {
      L: 4.69, H: 1.48, wd: 0.69, wb: 2.69, ovF: 0.92, cl: 0.14, noseY: 0.5, hx: 0.16, hoodF: 0.76,
      cowl: [1.52, 0.94], belt: 0.96, rise: 0.06, roofF: 2.36, roofR: 4.42,
      rear: [[4.62, 1.36, 0.1], [4.68, 1.0, 0.3], [4.69, 0.6, 0.12]],
      dlo: [4.33, 4.47], bX: 2.62, qX: 3.78, tail: [4.44, 1.0, 0.86],
      W: 1.8, rw: 1.22, tr: 1.54, kind: 'hatch', rails: true
    },
    utilitaire: {
      L: 5.48, H: 1.97, wd: 0.7, wb: 3.5, ovF: 0.95, cl: 0.2, noseY: 0.62, hx: 0.1, hoodF: 1.0,
      cowl: [0.78, 1.15], belt: 1.17, rise: 0, roofF: 1.5, roofR: 5.4,
      rear: [[5.48, 1.94, 0.08], [5.48, 0.42, 0.1]],
      dlo: [1.78, 2.0], bX: 2.04, tail: [5.4, 1.06, 0.55], fd: 1.42,
      W: 1.96, rw: 1.78, tr: 1.62, kind: 'van'
    }
  };

  /* ---------- Teintes communes ---------- */
  const TIRE = '#1a1b1e';
  const TRIM = '#121417';

  /** Dégradés et filtres partagés par toutes les vues extérieures */
  function commonDefs(id, c, H, belt, y0, y1, h) {
    const dark = lum(c) < 0.2;
    const fb = (H - belt) / H;
    const hl = dark ? 0.34 : 0.4;
    const stops = [
      [0, mix(c, '#fff', dark ? 0.3 : 0.22)], [fb - 0.02, mix(c, '#fff', 0.1)],
      [fb + 0.03, mix(c, '#fff', hl)], [fb + 0.14, c],
      [0.8, mix(c, '#000', 0.25)], [1, mix(c, '#000', 0.48)]
    ];
    return '<linearGradient id="' + id + 'bg" x2="0" y2="1"><stop offset="0" style="stop-color:var(--studio-1)"/><stop offset="1" style="stop-color:var(--studio-2)"/></linearGradient>' +
      '<radialGradient id="' + id + 'fl"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id + 'b" gradientUnits="userSpaceOnUse" x1="0" y1="' + f(y0) + '" x2="0" y2="' + f(y1) + '">' +
      stops.map((s) => '<stop offset="' + Math.round(s[0] * 100) / 100 + '" stop-color="' + s[1] + '"/>').join('') + '</linearGradient>' +
      '<linearGradient id="' + id + 'g" x2=".9" y2="1"><stop offset="0" stop-color="#3b4855"/><stop offset=".4" stop-color="#1b232b"/><stop offset=".46" stop-color="#55626f"/><stop offset=".55" stop-color="#1b232b"/><stop offset="1" stop-color="#0d1115"/></linearGradient>' +
      '<linearGradient id="' + id + 't" x2="0" y2="1"><stop offset="0" stop-color="#ff6a5c"/><stop offset=".5" stop-color="#c0141c"/><stop offset="1" stop-color="#6e0a10"/></linearGradient>' +
      '<filter id="' + id + 'f" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="' + (h ? 6 : 7) + '"/></filter>';
  }
  /** Fond de studio : halo sur le mur (position spotX) + flaque de lumière au sol */
  function studio(id, G, poolW, spotX) {
    return '<rect width="800" height="500" fill="url(#' + id + 'bg)"/><ellipse cx="' + spotX + '" cy="200" rx="480" ry="300" fill="url(#' + id + 'fl)" opacity=".6"/>' +
      '<ellipse cx="400" cy="' + G + '" rx="' + poolW + '" ry="70" fill="url(#' + id + 'fl)"/>';
  }

  /** Roue (définie une fois, utilisée deux fois) : pneu, disque, jante à branches */
  function wheelDef(id, R, h) {
    const rr = R * 0.67;
    const style = h % 4, finish = (h >> 3) % 3;
    const rim = finish === 1 ? ['#8a9098', '#4a5057', '#2a2e33'] : ['#f4f6f8', '#bcc2c9', '#7b838c'];
    // [nombre de branches, demi-largeur angulaire au moyeu, à la jante, vrillage, paires]
    const S = [[5, 0.34, 0.15, 0, 0], [5, 0.16, 0.05, 0, 0.17], [6, 0.26, 0.11, 0, 0], [8, 0.22, 0.06, 0.22, 0]][style];
    const hub = rr * 0.22;
    let sp = '';
    pq = 10;
    for (let i = 0; i < S[0] * (S[4] ? 2 : 1); i++) {
      const a = (S[4] ? Math.floor(i / 2) * 2 * Math.PI / S[0] + (i % 2 ? S[4] : -S[4]) : i * 2 * Math.PI / S[0]) - Math.PI / 2;
      const p = (rad, da) => [Math.cos(a + da) * rad, Math.sin(a + da) * rad];
      sp += 'M' + pt(p(hub, -S[1])) + 'L' + pt(p(rr * 0.97, -S[2] + S[3])) + 'L' + pt(p(rr * 0.97, S[2] + S[3])) + 'L' + pt(p(hub, S[1])) + 'Z';
    }
    const cal = (h >> 6) % 3 === 0 ? '#b3242a' : '#3d4248';
    const cr = rr * 0.62;
    const caliper = 'M' + pt([-cr * 0.94, -cr * 0.34]) + 'A' + f(cr) + ' ' + f(cr) + ' 0 0 1 ' + pt([-cr * 0.34, -cr * 0.94]);
    pq = 1;
    return '<radialGradient id="' + id + 'ty"><stop offset=".64" stop-color="#34363b"/><stop offset=".8" stop-color="#1d1e21"/><stop offset="1" stop-color="#0e0f11"/></radialGradient>' +
      '<linearGradient id="' + id + 'rm" gradientUnits="userSpaceOnUse" x1="' + f(-rr) + '" y1="' + f(-rr) + '" x2="' + f(rr) + '" y2="' + f(rr) + '"><stop offset="0" stop-color="' + rim[0] + '"/><stop offset=".5" stop-color="' + rim[1] + '"/><stop offset="1" stop-color="' + rim[2] + '"/></linearGradient>' +
      '<g id="' + id + 'w"><circle r="' + f(R) + '" fill="url(#' + id + 'ty)"/>' +
      '<circle r="' + f(rr) + '" fill="' + (finish === 2 ? '#15171a' : '#2a2e33') + '"/><circle r="' + f(rr * 0.8) + '" fill="#6c727a"/>' +
      '<path d="' + caliper + '" stroke="' + cal + '" stroke-width="' + f(rr * 0.2) + '" stroke-linecap="round" fill="none"/>' +
      '<circle r="' + f(rr * 0.36) + '" fill="#454a50"/>' +
      '<path d="' + sp + '" fill="url(#' + id + 'rm)"/>' +
      '<circle r="' + f(rr * 0.95) + '" fill="none" stroke="url(#' + id + 'rm)" stroke-width="' + f(R * 0.07) + '"/>' +
      '<circle r="' + f(hub * 1.05) + '" fill="url(#' + id + 'rm)"/><circle r="' + f(hub * 0.45) + '" fill="#2b2f35"/></g>';
  }

  /* ---------- Vue de profil (et base du gros plan) ---------- */
  function side(v, B, view) {
    const id = 'c' + (++uid);
    const h = hash(v.id);
    const c = v.colorHex || '#7d838b';
    const dark = lum(c) < 0.2;
    const ev = /lectrique/i.test(v.fuel || '');
    const k = B.kind === 'van' ? 108 : 125;
    const G = 410;
    const x0 = 400 - B.L * k / 2;
    const X = (m) => x0 + m * k, Y = (m) => G - m * k;
    const P = (a) => [X(a[0]), Y(a[1]), (a[2] || 0) * k];
    const R = B.wd / 2, ra = R + 0.045;
    const fw = B.ovF, rw = B.ovF + B.wb;
    const da = Math.sqrt(ra * ra - (R - B.cl) * (R - B.cl));
    const roofMid = (B.roofF + B.roofR) / 2;

    // Contour (mètres) : du bas avant jusqu'au bas arrière, arches ajoutées ensuite
    const outline = [
      [fw - da, B.cl], [0.06, B.cl, 0.1], [0, B.noseY, 0.14], [B.hx, B.hoodF, 0.16],
      [B.cowl[0], B.cowl[1], 0.1], [B.roofF, B.H - 0.025, 0.4], [roofMid, B.H, 0.6],
      [B.roofR, B.H - (B.kind === 'van' ? 0 : B.drop || 0.035), B.kind === 'van' ? 0.08 : 0.3]
    ].concat(B.rear, [[B.L - 0.06, B.cl, 0.1], [rw + da, B.cl]]);
    const frontX = (y) => Math.min.apply(null, crossX(outline, y));
    const rearX = (y) => Math.max.apply(null, crossX(outline, y));
    let body = rpath(outline.map(P), false);
    const arch = (cx, from, to) => 'A' + f(ra * k) + ' ' + f(ra * k) + ' 0 1 0 ' + pt([X(cx + to), Y(B.cl)]);
    body += arch(rw, da, -da) + 'L' + pt([X(fw + da), Y(B.cl)]) + arch(fw, da, -da) + 'Z';

    // Ligne de vitrage (DLO)
    const ws = (y) => B.cowl[0] + (y - B.cowl[1]) * (B.roofF - B.cowl[0]) / (B.H - B.cowl[1]);
    const bR = B.belt + B.rise, top = B.H - 0.085;
    const dloF = ws(B.belt) + 0.1;
    const dlo = rpath([[dloF, B.belt, 0.03], [ws(top) + 0.075, top, 0.12], [B.dlo[0], top - 0.012, 0.1], [B.dlo[1], bR, 0.05]].map(P), true);
    const pillar = (x, w) => '<path d="M' + pt(P([x - w, B.belt])) + 'L' + pt(P([x - w - 0.05, top])) + 'L' + pt(P([x + w - 0.05, top])) + 'L' + pt(P([x + w, bR])) + 'Z" fill="' + TRIM + '"/>';
    const lineC = dark ? mix(c, '#fff', 0.22) : mix(c, '#000', 0.5);
    const strokeC = dark ? mix(c, '#fff', 0.3) : mix(c, '#000', 0.42);
    const v3 = (+v.doors || 5) <= 3;
    const bX = B.bX + (v3 ? 0.35 : 0);

    // Portes (dans le clip de la caisse : les arches découpent les lignes)
    const fd = Math.max(dloF - 0.02, B.fd || 0);
    let doors = 'M' + pt(P([fd, B.belt + 0.01])) + 'L' + pt(P([fd - 0.03, B.cl])) +
      'M' + pt(P([bX + 0.01, B.belt + 0.03])) + 'L' + pt(P([bX - 0.02, B.cl])) +
      'M' + pt(P([fd, B.cl + 0.08])) + 'L' + pt(P([B.kind === 'van' ? 3.2 : B.dlo[1] - 0.05, B.cl + 0.08]));
    let handles = [bX - 0.26];
    if (B.kind === 'van') {
      doors += 'M' + pt(P([3.2, B.belt + 0.55])) + 'L' + pt(P([3.18, B.cl])) + 'M' + pt(P([2.08, B.belt + 0.55])) + 'L' + pt(P([3.2, B.belt + 0.55]));
      handles.push(2.26);
    } else if (!v3) {
      const rd = B.qX ? B.qX : B.dlo[1] - 0.22;
      doors += 'M' + pt(P([rd + 0.02, bR])) + 'L' + pt(P([rd - 0.02, B.cl]));
      handles.push(rd - 0.24);
    }
    const hy = B.belt - 0.09;
    const handle = handles.map((x) => '<rect x="' + f(X(x)) + '" y="' + f(Y(hy)) + '" width="' + f(0.15 * k) + '" height="' + f(0.035 * k) + '" rx="2" fill="' + mix(c, '#000', 0.3) + '" stroke="' + lineC + '" stroke-width=".8"/>').join('');

    // Optiques
    const yT = B.hoodF - 0.03, yB = B.hoodF - (B.kind === 'van' ? 0.24 : 0.15);
    const head = [[frontX(yT) + 0.03, yT, 0.03], [B.hx + 0.5, B.hoodF - 0.005, 0.04], [B.hx + 0.38, yB + 0.05, 0.04], [frontX(yB) + 0.025, yB, 0.04]].map(P);
    const tl = B.tail;
    const tail = [[tl[0], tl[1], 0.03], [rearX(tl[1]) - 0.02, tl[1] + 0.01, 0.03], [rearX(tl[2]) - 0.02, tl[2], 0.03], [tl[0] + 0.07, tl[2] + 0.02, 0.03]].map(P);
    const iy1 = B.cl + 0.2, iy2 = B.cl + 0.08;
    const intake = [[frontX(iy1) + 0.04, iy1, 0.02], [0.55, iy1, 0.03], [0.5, iy2, 0.03], [frontX(iy2) + 0.05, iy2, 0.02]].map(P);

    // Rétroviseur
    const mx = dloF + 0.02, my = B.belt + 0.02;
    const mirror = rpath([[mx, my, 0.02], [mx - 0.02, my + 0.13, 0.04], [mx - 0.2, my + 0.11, 0.05], [mx - 0.17, my + 0.02, 0.03]].map(P), true);

    let s = '<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><defs>' +
      commonDefs(id, c, B.H, B.belt, Y(B.H), Y(0), view === 'detail') +
      '<linearGradient id="' + id + 'hl" x2=".3" y2="1"><stop offset="0" stop-color="#fdfeff"/><stop offset=".6" stop-color="#c9d4df"/><stop offset="1" stop-color="#7f8d9b"/></linearGradient>' +
      wheelDef(id, R * k, h) +
      '<path id="' + id + 'p" d="' + body + '"/><clipPath id="' + id + 'c"><use href="#' + id + 'p"/></clipPath></defs>' +
      studio(id, G, f(B.L * k * 0.7), 400);

    // Groupe voiture (recadré pour le gros plan)
    if (view === 'detail') {
      const s2 = 2.5, fx = X(fw * 0.72), fy = Y(0.6);
      s += '<g transform="translate(' + f(400 - s2 * fx) + ' ' + f(262 - s2 * fy) + ') scale(' + s2 + ')">';
    } else s += '<g>';
    // Ombres portées
    s += '<g filter="url(#' + id + 'f)" fill="#000"><ellipse cx="' + f(X(B.L / 2)) + '" cy="' + (G + 3) + '" rx="' + f(B.L * k * 0.5) + '" ry="13" opacity=".42"/>' +
      [fw, rw].map((x) => '<ellipse cx="' + f(X(x)) + '" cy="' + (G + 1) + '" rx="' + f(R * k * 0.9) + '" ry="5" opacity=".75"/>').join('') + '</g>';
    // Passages de roue (fond sombre)
    s += '<path d="' + [fw, rw].map((x) => 'M' + pt([X(x - da), Y(B.cl)]) + 'A' + f(ra * k) + ' ' + f(ra * k) + ' 0 1 1 ' + pt([X(x + da), Y(B.cl)]) + 'Z').join('') + '" fill="#0c0d0f"/>';
    // Barres de toit
    if (B.rails) {
      const ry = B.H + 0.05;
      s += '<path d="' + rpath([[B.roofF + 0.15, B.H - 0.04], [B.roofF + 0.3, ry, 0.05], [B.roofR - 0.15, ry, 0.05], [B.roofR - 0.05, B.H - 0.06]].map(P), false) + '" fill="none" stroke="#2b2e33" stroke-width="' + f(0.045 * k) + '" stroke-linecap="round"/>';
    }
    // Caisse
    s += '<use href="#' + id + 'p" fill="url(#' + id + 'b)" stroke="' + strokeC + '" stroke-width="1.4"/>';
    // Détails dans le clip de la caisse
    s += '<g clip-path="url(#' + id + 'c)">';
    if (B.clad) {
      s += '<rect x="0" y="' + f(Y(B.cl + 0.16)) + '" width="800" height="' + f(0.2 * k) + '" fill="#26292e"/>';
    } else {
      s += '<rect x="' + f(X(fw)) + '" y="' + f(Y(B.cl + 0.05)) + '" width="' + f(B.wb * k) + '" height="' + f(0.06 * k) + '" fill="#1c1e22" opacity=".55"/>';
    }
    if (B.kind === 'van') s += '<rect x="0" y="' + f(Y(B.cl + 0.32)) + '" width="800" height="' + f(0.1 * k) + '" fill="#2a2d31"/>';
    // Ligne de caractère (reflet) et nervure basse
    s += '<path d="M0 ' + f(Y(B.belt - 0.13)) + 'L800 ' + f(Y(B.belt - 0.11)) + '" stroke="' + mix(c, '#fff', 0.5) + '" stroke-width="1.6" opacity=".55"/>' +
      '<path d="M0 ' + f(Y(B.cl + 0.3)) + 'L800 ' + f(Y(B.cl + 0.33)) + '" stroke="' + mix(c, '#000', 0.35) + '" stroke-width="1.2" opacity=".5"/>' +
      '<path d="' + doors + '" fill="none" stroke="' + lineC + '" stroke-width="1.3"/>';
    if (B.kind === 'van') s += '<path d="M' + pt(P([3.22, B.belt - 0.03])) + 'L' + pt(P([B.L - 0.1, B.belt - 0.03])) + '" stroke="' + TRIM + '" stroke-width="3" opacity=".7"/>';
    s += '</g>';
    // Élargisseurs d'ailes (SUV)
    if (B.clad) s += '<path d="' + [fw, rw].map((x) => 'M' + pt([X(x - da - 0.03), Y(B.cl)]) + 'A' + f((ra + 0.015) * k) + ' ' + f((ra + 0.015) * k) + ' 0 1 1 ' + pt([X(x + da + 0.03), Y(B.cl)])).join('') + '" fill="none" stroke="#26292e" stroke-width="' + f(0.07 * k) + '"/>';
    // Vitrage
    s += '<path d="' + dlo + '" fill="url(#' + id + 'g)" stroke="' + ((h >> 4) % 3 === 0 && B.kind !== 'van' ? '#c9ced4' : TRIM) + '" stroke-width="3" stroke-linejoin="round"/>';
    if (B.kind !== 'van') s += pillar(bX, 0.04);
    if (B.qX) s += pillar(B.qX, 0.025);
    // Poignées, rétroviseur, optiques
    s += handle +
      '<path d="' + mirror + '" fill="' + mix(c, '#fff', 0.08) + '" stroke="' + strokeC + '" stroke-width="1.2"/>' +
      '<path d="' + rpath(head, true) + '" fill="url(#' + id + 'hl)" stroke="' + TRIM + '" stroke-width="1.5"/>' +
      '<path d="M' + pt(head[0]) + 'L' + pt([head[1][0] - 0.06 * k, head[1][1] + 0.025 * k]) + '" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="' + rpath(tail, true) + '" fill="url(#' + id + 't)" stroke="#3a0a0d" stroke-width="1"/>' +
      '<path d="' + rpath(intake, true) + '" fill="#15171a" opacity=".85"/>';
    // Trappe (recharge pour l'électrique) et échappement
    const fx2 = B.kind === 'van' ? rw - 0.1 : Math.max(rw + 0.12, (B.qX || B.dlo[1] - 0.22) + 0.1);
    s += '<rect x="' + f(X(fx2)) + '" y="' + f(Y(B.belt - 0.06)) + '" width="' + f(0.16 * k) + '" height="' + f(0.13 * k) + '" rx="3" fill="none" stroke="' + lineC + '" stroke-width="1.1"/>';
    if (ev) s += '<circle cx="' + f(X(fx2 + 0.08)) + '" cy="' + f(Y(B.belt - 0.125)) + '" r="2" fill="#41c487"/>';
    else s += '<rect x="' + f(X(B.L - 0.36)) + '" y="' + f(Y(B.cl + 0.015)) + '" width="' + f(0.24 * k) + '" height="' + f(0.045 * k) + '" rx="2.5" fill="#3a3d42" stroke="#1a1c1f"/>';
    // Roues
    s += '<use href="#' + id + 'w" x="' + f(X(fw)) + '" y="' + f(Y(R)) + '"/><use href="#' + id + 'w" x="' + f(X(rw)) + '" y="' + f(Y(R)) + '"/>';
    return s + '</g></svg>';
  }

  /* ---------- Vue arrière (de face, éclairage décalé) ---------- */
  function rear(v, B) {
    const id = 'c' + (++uid);
    const h = hash(v.id);
    const c = v.colorHex || '#7d838b';
    const dark = lum(c) < 0.2;
    const ev = /lectrique/i.test(v.fuel || '');
    const k = Math.min(215, 330 / B.H);
    const G = 425;
    const X = (m) => 400 + m * k, Y = (m) => G - m * k;
    const P = (a) => [X(a[0]), Y(a[1]), (a[2] || 0) * k];
    const W2 = B.W / 2, r2 = B.rw / 2, van = B.kind === 'van';
    const half = van
      ? [[-(W2 - 0.06), B.cl, 0.04], [-W2, B.cl + 0.12, 0.06], [-W2, B.H - 0.06, 0.08], [-(W2 - 0.06), B.H, 0.06]]
      : [[-(W2 - 0.2), B.cl + 0.06, 0.06], [-(W2 - 0.05), B.cl + 0.24, 0.14], [-W2, B.belt - 0.22, 0.2], [-(W2 - 0.03), B.belt - 0.03, 0.08], [-(W2 - 0.1), B.belt + 0.04, 0.05], [-r2, B.H - 0.05, 0.12], [-r2 + 0.14, B.H, 0.1]];
    const sym = (arr) => arr.concat(arr.slice().reverse().map((p) => [-p[0], p[1], p[2]]));
    const body = rpath(sym(half).map(P), true);
    const strokeC = dark ? mix(c, '#fff', 0.3) : mix(c, '#000', 0.42);
    const lineC = dark ? mix(c, '#fff', 0.22) : mix(c, '#000', 0.5);
    const tw = 0.22;

    let s = '<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><defs>' +
      commonDefs(id, c, B.H, B.belt, Y(B.H), Y(0), false) +
      '<linearGradient id="' + id + 'hz"><stop offset="0" stop-opacity=".38"/><stop offset=".22" stop-opacity="0"/><stop offset=".7" stop-opacity="0"/><stop offset="1" stop-opacity=".45"/></linearGradient>' +
      '<path id="' + id + 'p" d="' + body + '"/><clipPath id="' + id + 'c"><use href="#' + id + 'p"/></clipPath></defs>' +
      studio(id, G, f(B.W * k * 0.9), 250);
    // Ombre
    s += '<ellipse cx="400" cy="' + (G + 2) + '" rx="' + f((W2 + 0.1) * k) + '" ry="12" fill="#000" opacity=".5" filter="url(#' + id + 'f)"/>';
    // Pneus et soubassement
    s += [-1, 1].map((sg) => '<rect x="' + f(X(sg * B.tr / 2 - tw / 2)) + '" y="' + f(Y(B.cl + 0.25)) + '" width="' + f(tw * k) + '" height="' + f((B.cl + 0.25) * k) + '" rx="' + f(0.05 * k) + '" fill="' + TIRE + '"/>').join('') +
      '<rect x="' + f(X(-B.tr / 2)) + '" y="' + f(Y(B.cl + 0.2)) + '" width="' + f(B.tr * k) + '" height="' + f((B.cl + 0.17) * k) + '" fill="#0b0c0e"/>';
    // Rétroviseurs (en retrait, dépassent sur les côtés)
    const my = B.belt + (van ? 0.12 : 0.05), mh = van ? 0.24 : 0.11, mw = van ? 0.17 : 0.15;
    s += [-1, 1].map((sg) => '<path d="' + rpath([[W2 - 0.12, my, 0.02], [W2 + mw - 0.06, my - 0.01, 0.04], [W2 + mw - 0.03, my + mh, 0.04], [W2 - 0.08, my + mh - 0.02, 0.04]].map((p) => P([p[0] * sg, p[1], p[2]])), true) + '" fill="' + mix(c, '#000', 0.12) + '" stroke="' + strokeC + '"/>').join('');
    if (B.rails) s += [-1, 1].map((sg) => '<rect x="' + f(X(sg * (r2 - 0.1) - 0.03)) + '" y="' + f(Y(B.H + 0.05)) + '" width="' + f(0.06 * k) + '" height="' + f(0.07 * k) + '" rx="2" fill="#2b2e33"/>').join('');
    // Caisse + ombrage latéral
    s += '<use href="#' + id + 'p" fill="url(#' + id + 'b)"/><use href="#' + id + 'p" fill="url(#' + id + 'hz)" stroke="' + strokeC + '" stroke-width="1.4"/>';
    s += '<g clip-path="url(#' + id + 'c)">';
    if (B.clad) s += '<rect x="0" y="' + f(Y(B.cl + 0.2)) + '" width="800" height="' + f(0.2 * k) + '" fill="#26292e"/>';
    // Bouclier : diffuseur sombre et nervure
    s += '<rect x="' + f(X(-W2 + 0.2)) + '" y="' + f(Y(B.cl + 0.09)) + '" width="' + f((B.W - 0.4) * k) + '" height="' + f(0.12 * k) + '" rx="' + f(0.03 * k) + '" fill="#1b1d20"/>' +
      '<path d="M0 ' + f(Y(B.cl + 0.24)) + 'H800" stroke="' + lineC + '" stroke-width="1.2" opacity=".7"/>' +
      '<path d="M0 ' + f(Y(B.belt - 0.2)) + 'H800" stroke="' + mix(c, '#fff', 0.5) + '" stroke-width="1.4" opacity=".5"/>';
    s += '</g>';
    // Vitrage, hayon / malle / portes
    const glass = 'fill="url(#' + id + 'g)" stroke="' + TRIM + '" stroke-width="2.5" stroke-linejoin="round"';
    let plateY;
    if (van) {
      const wy0 = B.belt + 0.1, wy1 = B.H - 0.17;
      s += [-1, 1].map((sg) => '<path d="' + rpath([[sg * 0.05, wy0, 0.04], [sg * (W2 - 0.16), wy0, 0.04], [sg * (W2 - 0.16), wy1, 0.04], [sg * 0.05, wy1, 0.04]].map(P), true) + '" ' + glass + '/>').join('') +
        '<path d="M400 ' + f(Y(B.cl + 0.12)) + 'V' + f(Y(B.H - 0.05)) + '" stroke="' + lineC + '" stroke-width="2"/>' +
        '<rect x="' + f(X(-0.17)) + '" y="' + f(Y(B.belt - 0.12)) + '" width="' + f(0.13 * k) + '" height="' + f(0.035 * k) + '" rx="2" fill="#2a2d31"/>';
      plateY = B.cl + 0.22;
    } else {
      const sedan = B.kind === 'sedan';
      const gy0 = B.belt + (sedan ? 0.16 : 0.07), gy1 = B.H - 0.09;
      const gb = sedan ? W2 - 0.34 : W2 - 0.2, gt = r2 - 0.08;
      s += '<path d="' + rpath([[-gb, gy0, 0.05], [gb, gy0, 0.05], [gt, gy1, 0.08], [-gt, gy1, 0.08]].map(P), true) + '" ' + glass + '/>';
      if (sedan) {
        s += '<path d="M' + pt(P([-(W2 - 0.12), B.belt + 0.08])) + 'Q' + pt(P([0, B.belt + 0.11])) + ' ' + pt(P([W2 - 0.12, B.belt + 0.08])) + '" fill="none" stroke="' + lineC + '" stroke-width="1.4"/>';
        plateY = B.cl + 0.3;
      } else {
        // Becquet, 3e feu stop, essuie-glace, joint de hayon
        s += '<rect x="' + f(X(-gt + 0.02)) + '" y="' + f(Y(B.H - 0.035)) + '" width="' + f((gt * 2 - 0.04) * k) + '" height="' + f(0.05 * k) + '" rx="' + f(0.02 * k) + '" fill="' + TRIM + '"/>' +
          '<rect x="' + f(X(-0.18)) + '" y="' + f(Y(B.H - 0.05)) + '" width="' + f(0.36 * k) + '" height="' + f(0.012 * k + 1) + '" fill="#e0363b"/>' +
          '<path d="M' + pt(P([0.04, gy0 + 0.04])) + 'L' + pt(P([-0.38, gy0 + 0.13])) + '" stroke="' + TRIM + '" stroke-width="2.5" stroke-linecap="round"/>' +
          '<path d="M' + pt(P([-(W2 - 0.2), B.cl + 0.25])) + 'L' + pt(P([-(W2 - 0.16), B.belt + 0.02])) + 'M' + pt(P([W2 - 0.2, B.cl + 0.25])) + 'L' + pt(P([W2 - 0.16, B.belt + 0.02])) + '" stroke="' + lineC + '" stroke-width="1.2" opacity=".8"/>';
        plateY = B.belt - 0.27;
      }
    }
    // Feux arrière
    if (van) {
      s += [-1, 1].map((sg) => '<rect x="' + f(X(sg > 0 ? W2 - 0.13 : -W2 + 0.02)) + '" y="' + f(Y(1.02)) + '" width="' + f(0.11 * k) + '" height="' + f(0.46 * k) + '" rx="' + f(0.02 * k) + '" fill="url(#' + id + 't)" stroke="#3a0a0d"/>').join('');
    } else {
      const ty = B.belt;
      s += [-1, 1].map((sg) => '<path d="' + rpath([[-W2 + 0.03, ty - 0.02, 0.03], [-W2 + 0.42, ty, 0.03], [-W2 + 0.39, ty - 0.11, 0.03], [-W2 + 0.06, ty - 0.15, 0.04]].map((p) => P([p[0] * sg, p[1], p[2]])), true) + '" fill="url(#' + id + 't)" stroke="#3a0a0d"/>').join('');
      if (h % 2) s += '<rect x="' + f(X(-W2 + 0.4)) + '" y="' + f(Y(ty - 0.035)) + '" width="' + f((B.W - 0.8) * k) + '" height="' + f(0.025 * k) + '" fill="#b3161d" opacity=".9"/>';
    }
    // Plaque vierge, catadioptres, échappement
    s += '<rect x="' + f(X(-0.26)) + '" y="' + f(Y(plateY + 0.11)) + '" width="' + f(0.52 * k) + '" height="' + f(0.11 * k) + '" rx="3" fill="#eceef1" stroke="#7d848e"/>' +
      [-1, 1].map((sg) => '<rect x="' + f(X(sg > 0 ? W2 - 0.2 : -W2 + 0.1)) + '" y="' + f(Y(B.cl + 0.2)) + '" width="' + f(0.1 * k) + '" height="' + f(0.025 * k) + '" rx="1.5" fill="#8e1218"/>').join('');
    if (!ev) s += '<ellipse cx="' + f(X(-(W2 - 0.4))) + '" cy="' + f(Y(B.cl + 0.02)) + '" rx="' + f(0.05 * k) + '" ry="' + f(0.03 * k) + '" fill="#2a2c2f" stroke="#8b9098" stroke-width="1.5"/>';
    return s + '</svg>';
  }

  /* ---------- Vue intérieure : planche de bord depuis la banquette ---------- */
  function interior(v) {
    const id = 'c' + (++uid);
    const h = hash(v.id);
    const c = v.colorHex || '#7d838b';
    const tints = ['#2b2e33', '#6b4a38', '#8a8f97', '#a8865f', '#3d4757'];
    const t = tints[h % tints.length];
    const tl = mix(t, '#fff', 0.18), td = mix(t, '#000', 0.35);
    const dash = '#202327';
    let s = '<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><defs>' +
      '<linearGradient id="' + id + 'bg" x2="0" y2="1"><stop offset="0" style="stop-color:var(--studio-1)"/><stop offset="1" style="stop-color:var(--studio-2)"/></linearGradient>' +
      '<linearGradient id="' + id + 'd" x2="0" y2="1"><stop offset="0" stop-color="#3a3e44"/><stop offset=".12" stop-color="' + dash + '"/><stop offset="1" stop-color="#0d0e10"/></linearGradient>' +
      '<linearGradient id="' + id + 's" x2="0" y2="1"><stop offset="0" stop-color="' + tl + '"/><stop offset="1" stop-color="' + td + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'fl"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id + 'sc" x2="1" y2="1"><stop offset="0" stop-color="#1d3550"/><stop offset="1" stop-color="#0b1420"/></linearGradient>' +
      '</defs>';
    // Extérieur (pare-brise) puis habitacle
    s += '<rect width="800" height="500" fill="url(#' + id + 'bg)"/><ellipse cx="400" cy="130" rx="440" ry="190" fill="url(#' + id + 'fl)"/>' +
      '<path d="M0 0H800V46Q400 70 0 46Z" fill="#2a2d32"/>' +
      '<path d="M0 40L96 44L196 214L0 300ZM800 40L704 44L604 214L800 300Z" fill="#25282d"/>' +
      '<rect x="396" y="52" width="8" height="18" fill="#1b1d21"/><rect x="335" y="66" width="130" height="36" rx="10" fill="#1b1d21"/><rect x="341" y="71" width="118" height="26" rx="7" fill="#5d6874" opacity=".75"/>';
    // Planche de bord
    s += '<path d="M0 286L150 204Q400 168 650 204L800 286V500H0Z" fill="url(#' + id + 'd)"/>' +
      '<path d="M150 204Q400 168 650 204" fill="none" stroke="#4a4f56" stroke-width="2"/>' +
      '<path d="M60 268Q400 232 740 268L742 282Q400 246 58 282Z" fill="' + t + '"/>' +
      '<path d="M62 290Q400 254 738 290" fill="none" stroke="' + c + '" stroke-width="2" opacity=".9"/>';
    // Aérateurs
    const vent = (x, y, w) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="24" rx="6" fill="#0d0e10" stroke="#3b3f45"/><path d="M' + (x + 4) + ' ' + (y + 8) + 'h' + (w - 8) + 'M' + (x + 4) + ' ' + (y + 16) + 'h' + (w - 8) + '" stroke="#3b3f45" stroke-width="2"/>';
    s += vent(108, 236, 52) + vent(640, 236, 52) + vent(346, 262, 48) + vent(406, 262, 48);
    // Écran central
    s += '<rect x="330" y="172" width="140" height="82" rx="9" fill="#0d0f12" stroke="#3b3f45" stroke-width="2"/><rect x="336" y="178" width="128" height="70" rx="5" fill="url(#' + id + 'sc)"/>' +
      '<path d="M342 236L370 214L392 224L420 196L458 206" fill="none" stroke="#5b8cff" stroke-width="2.5" stroke-linecap="round"/>' +
      '<rect x="342" y="184" width="36" height="6" rx="3" fill="#9fb6d1" opacity=".6"/><rect x="430" y="232" width="28" height="10" rx="3" fill="#41c487" opacity=".8"/>';
    // Bloc compteurs + volant (conduite à gauche)
    s += '<path d="M170 222Q260 196 350 222V236H170Z" fill="#17191c"/>' +
      '<rect x="190" y="226" width="140" height="50" rx="8" fill="#07090b" stroke="#33373d"/>' +
      '<path d="M206 264A20 20 0 1 1 246 264M274 264A20 20 0 1 1 314 264" fill="none" stroke="#5b8cff" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M226 264L216 250M294 264L306 252" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="252" y="240" width="16" height="22" rx="2" fill="#41c487" opacity=".7"/>';
    s += '<rect x="246" y="300" width="28" height="80" fill="#121417"/>' +
      '<circle cx="260" cy="300" r="88" fill="none" stroke="#2a2d32" stroke-width="19"/>' +
      '<circle cx="260" cy="300" r="94" fill="none" stroke="#565b63" stroke-width="2"/><circle cx="260" cy="300" r="80" fill="none" stroke="#0e0f11" stroke-width="2"/>' +
      '<path d="M174 306L226 312M346 306L294 312M260 336V384" stroke="#2a2d32" stroke-width="16" stroke-linecap="round"/>' +
      '<rect x="224" y="278" width="72" height="56" rx="18" fill="#2a2d32" stroke="#565b63"/>' +
      '<circle cx="182" cy="306" r="4" fill="#5d636b"/><circle cx="338" cy="306" r="4" fill="#5d636b"/>';
    // Console centrale et sélecteur
    s += '<path d="M352 300H448L486 500H314Z" fill="#17191c" stroke="#2c3035"/>' +
      '<rect x="368" y="312" width="64" height="18" rx="5" fill="#0d0e10"/><circle cx="384" cy="321" r="4" fill="#5d636b"/><circle cx="400" cy="321" r="4" fill="#5d636b"/><circle cx="416" cy="321" r="4" fill="#5d636b"/>' +
      '<rect x="380" y="360" width="40" height="56" rx="12" fill="#0d0e10"/><rect x="388" y="350" width="24" height="42" rx="10" fill="#2e3237" stroke="#4a4f56"/><rect x="394" y="356" width="12" height="6" rx="3" fill="' + t + '"/>';
    // Sièges avant (dossiers vus de dos) — sellerie teintée
    const seat = (cx) => '<rect x="' + (cx - 54) + '" y="334" width="108" height="58" rx="22" fill="url(#' + id + 's)" stroke="' + td + '" stroke-width="2"/>' +
      '<rect x="' + (cx - 14) + '" y="388" width="8" height="22" fill="#9aa0a8"/><rect x="' + (cx + 6) + '" y="388" width="8" height="22" fill="#9aa0a8"/>' +
      '<path d="M' + (cx - 125) + ' 520L' + (cx - 112) + ' 430Q' + (cx - 100) + ' 398 ' + cx + ' 396Q' + (cx + 100) + ' 398 ' + (cx + 112) + ' 430L' + (cx + 125) + ' 520Z" fill="url(#' + id + 's)" stroke="' + td + '" stroke-width="2"/>' +
      '<path d="M' + (cx - 70) + ' 520L' + (cx - 64) + ' 440Q' + cx + ' 426 ' + (cx + 64) + ' 440L' + (cx + 70) + ' 520Z" fill="' + td + '" opacity=".55"/>' +
      '<path d="M' + (cx - 62) + ' 456Q' + cx + ' 444 ' + (cx + 62) + ' 456M' + (cx - 66) + ' 482Q' + cx + ' 470 ' + (cx + 66) + ' 482" fill="none" stroke="' + tl + '" stroke-width="1.5" stroke-dasharray="4 4" opacity=".6"/>';
    s += seat(218) + seat(582);
    return s + '</svg>';
  }

  /* ---------- Point d'entrée ---------- */
  function svg(vehicle, view) {
    const v = vehicle || {};
    const B = BODIES[v.body] || BODIES.compacte;
    if (view === 'interior') return interior(v);
    if (view === 'rear') return rear(v, B);
    return side(v, B, view === 'detail' ? 'detail' : 'side');
  }

  window.CarArt = { svg };
})();
