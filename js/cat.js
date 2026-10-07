/* 程序化绘制的动态猫咪（SVG + CSS 动画）
   CatArt.render(v, { state, uid }) → SVG 字符串
   state: idle(发呆) | sleep(睡觉) | play(玩耍) | happy(开心) */
(function () {
  "use strict";

  /* ---------- 颜色工具 ---------- */
  const h2r = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); };
  const r2h = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const x = h2r(a), y = h2r(b); return r2h(x.map((v, i) => v + (y[i] - v) * t)); };
  const dark = (c, t) => mix(c, "#000000", t);
  const light = (c, t) => mix(c, "#ffffff", t);
  const lum = (c) => { const [r, g, b] = h2r(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  /* ---------- 耳朵 ---------- */
  const EARS = {
    normal: { o: "M56,74 L58,28 Q78,32 94,54 Z", i: "M62,64 L63,41 Q75,45 85,56 Z" },
    big:    { o: "M52,76 L45,10 Q74,20 94,54 Z", i: "M59,66 L54,28 Q72,34 86,56 Z" },
    tuft:   { o: "M54,74 L51,20 Q78,28 94,54 Z", i: "M60,64 L58,36 Q74,42 86,56 Z", tip: "M51,20 L46,6 L58,17 Z" },
    fold:   { o: "M55,68 Q58,40 95,48 Q86,72 55,68 Z", i: "" },
    curl:   { o: "M58,72 Q34,44 52,16 Q62,30 70,38 Q84,44 94,54 Z", i: "M62,62 Q49,44 55,31 Q65,44 78,52 Z" }
  };

  /* ---------- 尾巴 ---------- */
  const TAILS = {
    long:   { d: "M136,186 C180,194 196,146 174,118 C168,108 174,100 182,108", w: 15 },
    thin:   { d: "M136,186 C180,194 196,146 174,118 C168,108 174,100 182,108", w: 10 },
    fluffy: { d: "M138,184 C174,192 192,152 172,120", w: 28 },
    short:  { d: "M142,186 Q158,188 160,174", w: 12 },
    bob:    { d: "M144,187 L150,185", w: 8, pom: [156, 182] }
  };

  const SPOTS_BODY = [[62, 146], [86, 138], [116, 138], [140, 146], [68, 168], [98, 160], [130, 166], [56, 186], [146, 184], [100, 182]];
  const SPOTS_HEAD = [[70, 62], [130, 62], [56, 84], [144, 84], [100, 58], [82, 54], [118, 54]];

  function ruffPath(cx, cy, rx, ry, n, amp) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const k = i % 2 === 0 ? 1 + amp : 1;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k].map((x) => x.toFixed(1)).join(","));
    }
    return "M" + pts.join(" L") + " Z";
  }

  /* ---------- 花纹 ---------- */
  function patterns(v, uid, f, f2, f3) {
    const o = { body: "", head: "", tailOv: "", earL: null, earR: null, paw: null, tail: null, defs: "" };
    const stripe = (c, w, op) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none" opacity="${op}"`;
    const spot = (x, y, s, c) =>
      `<ellipse cx="${x}" cy="${y}" rx="${7 * s}" ry="${5.6 * s}" fill="${c}"/><ellipse cx="${x}" cy="${y}" rx="${3.2 * s}" ry="${2.5 * s}" fill="${mix(f, c, 0.35)}"/>`;
    const dots = (pts, s, c, ring) => pts.map(([x, y]) => (ring ? spot(x, y, s, c) : `<ellipse cx="${x}" cy="${y}" rx="${5 * s}" ry="${4 * s}" fill="${c}"/>`)).join("");

    switch (v.pat) {
      case "tabby":
        o.head = `<g ${stripe(f2, 3.6, 0.85)}><path d="M100,54 L100,70"/><path d="M89,57 L92,70"/><path d="M111,57 L108,70"/><path d="M54,92 L68,95"/><path d="M55,102 L68,102"/><path d="M146,92 L132,95"/><path d="M145,102 L132,102"/></g>`;
        o.body = `<g ${stripe(f2, 4.2, 0.8)}><path d="M54,150 Q68,152 76,144"/><path d="M52,166 Q68,166 80,156"/><path d="M54,182 Q70,180 84,170"/><path d="M146,150 Q132,152 124,144"/><path d="M148,166 Q132,166 120,156"/><path d="M146,182 Q130,180 116,170"/></g>`;
        o.tailOv = `<path d="__D__" stroke="${f2}" stroke-width="__W__" fill="none" opacity="0.85" pathLength="100" stroke-dasharray="6 9"/>`;
        break;
      case "mau":
        o.head = `<g ${stripe(f2, 3.4, 0.85)}><path d="M100,54 L100,68"/><path d="M90,56 L92,68"/><path d="M110,56 L108,68"/><path d="M60,92 Q64,98 70,100"/><path d="M140,92 Q136,98 130,100"/></g>` + dots(SPOTS_HEAD.slice(0, 2), 0.7, f2, false);
        o.body = dots(SPOTS_BODY, 1.05, f2, true);
        o.tailOv = `<path d="__D__" stroke="${f2}" stroke-width="__W__" fill="none" opacity="0.9" pathLength="100" stroke-dasharray="7 9"/>`;
        break;
      case "spotted":
        o.head = `<g ${stripe(f2, 3.2, 0.8)}><path d="M100,54 L100,66"/><path d="M90,56 L92,66"/><path d="M110,56 L108,66"/></g>` + dots(SPOTS_HEAD.slice(0, 4), 0.8, f2, true);
        o.body = dots(SPOTS_BODY, 1.25, f2, true);
        o.tailOv = `<path d="__D__" stroke="${f2}" stroke-width="__W__" fill="none" opacity="0.9" pathLength="100" stroke-dasharray="6 8"/>`;
        break;
      case "ticked":
        o.defs = `<linearGradient id="tkb-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f2}" stop-opacity=".62"/><stop offset=".6" stop-color="${f2}" stop-opacity="0"/></linearGradient>
          <linearGradient id="tkh-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f2}" stop-opacity=".62"/><stop offset=".62" stop-color="${f2}" stop-opacity="0"/></linearGradient>`;
        o.head = `<rect x="40" y="46" width="120" height="70" fill="url(#tkh-${uid})"/>`;
        o.body = `<rect x="30" y="112" width="140" height="82" fill="url(#tkb-${uid})"/>`;
        o.tailOv = `<path d="__D__" stroke="${f2}" stroke-width="__W__" stroke-linecap="butt" fill="none" opacity=".6" pathLength="100" stroke-dasharray="0 68 32"/>`;
        break;
      case "points":
        o.defs = `<radialGradient id="mk-${uid}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${f2}" stop-opacity=".95"/><stop offset=".62" stop-color="${f2}" stop-opacity=".7"/><stop offset="1" stop-color="${f2}" stop-opacity="0"/></radialGradient>
          <linearGradient id="bk-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f2}" stop-opacity=".28"/><stop offset=".6" stop-color="${f2}" stop-opacity="0"/></linearGradient>`;
        o.head = `<ellipse cx="100" cy="102" rx="36" ry="32" fill="url(#mk-${uid})"/>`;
        o.body = `<rect x="30" y="112" width="140" height="82" fill="url(#bk-${uid})"/>`;
        o.earL = o.earR = f2; o.paw = v.whitePaws ? light(f, 0.4) : f2; o.tail = f2;
        break;
      case "bicolor":
        o.head = `<ellipse cx="68" cy="64" rx="34" ry="28" fill="${f2}"/><ellipse cx="146" cy="62" rx="20" ry="26" fill="${f2}"/>`;
        o.body = `<ellipse cx="62" cy="150" rx="30" ry="34" fill="${f2}"/><ellipse cx="146" cy="172" rx="26" ry="30" fill="${f2}"/><ellipse cx="112" cy="126" rx="22" ry="12" fill="${f2}"/>`;
        o.earL = f2; o.earR = f2; o.tail = f2;
        break;
      case "calico":
        o.head = `<ellipse cx="68" cy="66" rx="32" ry="28" fill="${f2}"/><ellipse cx="140" cy="64" rx="24" ry="28" fill="${f3}"/>`;
        o.body = `<ellipse cx="64" cy="152" rx="30" ry="30" fill="${f3}"/><ellipse cx="144" cy="170" rx="28" ry="26" fill="${f2}"/><ellipse cx="108" cy="128" rx="18" ry="10" fill="${f2}"/>`;
        o.earL = f2; o.earR = f3;
        o.tail = v.tail === "bob" ? f : f3;
        o.tailOv = v.tail === "bob" ? "" : `<path d="__D__" stroke="${f2}" stroke-width="__W__" stroke-linecap="butt" fill="none" pathLength="100" stroke-dasharray="0 55 25 20"/>`;
        break;
      case "tortie":
        o.head = `<ellipse cx="64" cy="76" rx="26" ry="28" fill="${f2}"/><ellipse cx="136" cy="62" rx="20" ry="18" fill="${f3}"/><ellipse cx="100" cy="58" rx="8" ry="16" fill="${f2}"/>`;
        o.body = `<ellipse cx="60" cy="150" rx="22" ry="26" fill="${f2}"/><ellipse cx="140" cy="148" rx="24" ry="22" fill="${f3}"/><ellipse cx="96" cy="176" rx="28" ry="16" fill="${f2}"/><ellipse cx="122" cy="134" rx="12" ry="10" fill="${f2}"/>`;
        o.earL = f2;
        o.tailOv = `<path d="__D__" stroke="${f2}" stroke-width="__W__" stroke-linecap="butt" fill="none" pathLength="100" stroke-dasharray="14 14"/>`;
        break;
      case "van":
        o.head = `<ellipse cx="100" cy="56" rx="54" ry="26" fill="${f2}"/>`;
        o.earL = o.earR = f2; o.tail = f2;
        break;
      case "hairless":
        o.head = `<g ${stripe(dark(f, 0.2), 2, 0.5)}><path d="M80,58 Q100,52 120,58"/><path d="M84,66 Q100,61 116,66"/><path d="M62,98 Q66,104 72,106"/><path d="M138,98 Q134,104 128,106"/></g>`;
        o.body = `<g ${stripe(dark(f, 0.2), 2, 0.4)}><path d="M60,150 Q72,154 82,148"/><path d="M140,150 Q128,154 118,148"/><path d="M70,172 Q82,174 90,168"/><path d="M130,172 Q118,174 110,168"/></g>`;
        break;
      default:
        break;
    }
    if (v.curly) {
      const wave = (x, y) => `<path d="M${x},${y} q4,-5 8,0 t8,0 t8,0" />`;
      o.head += `<g ${stripe(dark(f, 0.25), 2, 0.4)}>${wave(72, 62)}${wave(100, 58)}${wave(118, 66)}${wave(62, 84)}${wave(128, 84)}</g>`;
      o.body += `<g ${stripe(dark(f, 0.25), 2, 0.4)}>${wave(56, 146)}${wave(110, 140)}${wave(70, 166)}${wave(112, 170)}${wave(60, 184)}${wave(124, 186)}</g>`;
    }
    return o;
  }

  /* ---------- 眼睛 ---------- */
  function eyeOpen(cx, cy, almond, rot) {
    const rx = almond ? 11.5 : 10.5, ry = almond ? 7.8 : 11.4;
    const t = almond ? ` transform="rotate(${rot} ${cx} ${cy})"` : "";
    return `<g class="blink" style="transform-origin:${cx}px ${cy}px"><g${t}>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fffdf8" stroke="#2b2220" stroke-width="1.6"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx - 2.2}" ry="${ry - 1.6}" fill="url(#__IR__)"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${almond ? 2.4 : 3}" ry="${ry - (almond ? 1.8 : 2.6)}" fill="#1b1414"/>
      <circle cx="${cx - 3}" cy="${cy - (almond ? 2.2 : 3.6)}" r="${almond ? 2 : 2.5}" fill="#fff"/>
      <circle cx="${cx + 3}" cy="${cy + (almond ? 1.8 : 3.4)}" r="1.15" fill="#fff" opacity=".85"/></g></g>`;
  }

  /* ---------- 主函数 ---------- */
  function render(v, opts) {
    opts = opts || {};
    const state = opts.state || "idle";
    const uid = opts.uid || "c" + Math.random().toString(36).slice(2, 7);
    const delay = (opts.delay != null ? opts.delay : -((uid.length * 0.37) % 3)).toFixed(2);

    const f = v.f, f2 = v.f2 || dark(f, 0.3), f3 = v.f3 || dark(f, 0.5);
    const lt = v.lt || light(f, 0.55);
    const hairless = !!v.hairless;
    const line = dark(f, hairless ? 0.28 : 0.34);
    const lineOp = 0.5;
    const almond = v.eyeShape === "almond";
    const flat = v.head === "flat";
    const hd = { round: [46, 40], wedge: [42, 37], flat: [49, 35] }[v.head || "round"];
    const [hrx, hry] = hd;
    const ey = flat ? 97 : v.head === "wedge" ? 94 : 95;
    const ex = almond ? 78 : 80;
    const nose = v.nose || (lum(f) < 0.28 ? "#c98b8b" : "#ef8f8a");
    const whisk = lum(f) > 0.55 ? "#b9aca2" : "#f1e8e0";
    const bw = v.bw || 1, bh = v.bh || 1;
    const earType = EARS[v.ear || "normal"];
    const tailT = TAILS[v.tail || "long"];
    const P = patterns(v, uid, f, f2, f3);
    const earInner = hairless ? "#e49a92" : "#f4b6b0";
    const bodyT = `translate(100 192) scale(${bw} ${bh}) translate(-100 -192)`;
    const bodyD = "M50,192 Q38,150 62,128 Q100,110 138,128 Q162,150 150,192 Z";

    const tailColor = P.tail || f;
    const tailD = tailT.d, tailW = tailT.w;
    const fixTail = (s) => s.replace(/__D__/g, tailD).replace(/__W__/g, tailW - 1);
    const pawFill = P.paw || f;

    /* defs */
    const defs = `<defs>
      <radialGradient id="ir-${uid}" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="${light(v.eye, 0.4)}"/><stop offset=".65" stop-color="${v.eye}"/><stop offset="1" stop-color="${dark(v.eye, 0.32)}"/></radialGradient>
      <radialGradient id="hl-${uid}" cx=".35" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="sh-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
      <clipPath id="cb-${uid}"><path d="${bodyD}" transform="${bodyT}"/></clipPath>
      <clipPath id="ch-${uid}"><ellipse cx="100" cy="92" rx="${hrx}" ry="${hry}"/></clipPath>
      ${P.defs}</defs>`;

    /* 尾巴 */
    let tail = `<g class="tail" style="--d:${delay}s">
      <path d="${tailD}" stroke="${dark(tailColor, 0.3)}" stroke-opacity="${lineOp}" stroke-width="${tailW + 2.6}" stroke-linecap="round" fill="none"/>
      <path d="${tailD}" stroke="${tailColor}" stroke-width="${tailW}" stroke-linecap="round" fill="none"/>
      ${fixTail(P.tailOv)}`;
    if (tailT.pom) {
      const [px, py] = tailT.pom;
      tail += `<circle cx="${px}" cy="${py}" r="11" fill="${f}" stroke="${line}" stroke-opacity="${lineOp}" stroke-width="1.4"/><circle cx="${px + 2}" cy="${py - 2}" r="5" fill="${f2}" opacity=".95"/>`;
    }
    tail += `</g>`;

    /* 身体 */
    const showChest = v.chest || v.pat === "points";
    const body = `<g class="breath" style="--d:${delay}s"><g transform="${bodyT}">
      <path d="${bodyD}" fill="${f}" stroke="${line}" stroke-opacity="${lineOp}" stroke-width="1.5"/>
      <g clip-path="url(#cb-${uid})">${P.body}${showChest ? `<ellipse cx="100" cy="160" rx="25" ry="32" fill="${lt}"/>` : ""}
        <rect x="30" y="100" width="140" height="100" fill="url(#sh-${uid})"/></g>
      <g stroke="${line}" stroke-opacity="${lineOp}" stroke-width="1.4">
        <ellipse cx="78" cy="190" rx="14" ry="9" fill="${pawFill}"/><ellipse cx="122" cy="190" rx="14" ry="9" fill="${pawFill}"/></g>
      <g stroke="${line}" stroke-opacity=".45" stroke-width="1.3" stroke-linecap="round" fill="none">
        <path d="M74,186 L74,192"/><path d="M82,186 L82,192"/><path d="M118,186 L118,192"/><path d="M126,186 L126,192"/></g>
      </g></g>`;

    /* 头 */
    const ear = (side) => {
      const e = earType;
      const fill = (side === "l" ? P.earL : P.earR) || f;
      const inner = e.i ? `<path d="${e.i}" fill="${earInner}"/>` : "";
      const tuft = e.tip ? `<path d="${e.tip}" fill="${side === "l" ? (P.earL || f2) : (P.earR || f2)}" stroke="${line}" stroke-opacity=".4" stroke-width="1"/>` : "";
      const g = `<path d="${e.o}" fill="${fill}" stroke="${line}" stroke-opacity="${lineOp}" stroke-width="1.5" stroke-linejoin="round"/>${inner}${tuft}`;
      return side === "l"
        ? `<g class="ear ear-l" style="--d:${delay}s">${g}</g>`
        : `<g class="ear ear-r" style="--d:${delay}s"><g transform="translate(200 0) scale(-1 1)">${g}</g></g>`;
    };

    const ruff = v.fl
      ? `<path d="${ruffPath(100, 98, hrx + 5, hry + 4, 14, 0.07)}" fill="${f}" stroke="${line}" stroke-opacity="${lineOp}" stroke-width="1.5" stroke-linejoin="round"/>
         <path d="M58,126 L52,142 L66,134 L72,148 L84,138 L100,150 L116,138 L128,148 L134,134 L148,142 L142,126 Z" fill="${v.chest ? lt : f}" stroke="${line}" stroke-opacity="${lineOp}" stroke-width="1.5" stroke-linejoin="round"/>`
      : "";

    const eyesOpen = eyeOpen(ex, ey, almond, -14).replace("__IR__", `ir-${uid}`) +
      eyeOpen(200 - ex, ey, almond, 14).replace("__IR__", `ir-${uid}`);
    const dk = "#2b2220";
    const eyesSleep = `<g class="e-sleep" fill="none" stroke="${dk}" stroke-width="2.8" stroke-linecap="round"><path d="M${ex - 9},${ey + 1} Q${ex},${ey + 8} ${ex + 9},${ey + 1}"/><path d="M${200 - ex - 9},${ey + 1} Q${200 - ex},${ey + 8} ${200 - ex + 9},${ey + 1}"/></g>`;
    const eyesHappy = `<g class="e-happy" fill="none" stroke="${dk}" stroke-width="3" stroke-linecap="round"><path d="M${ex - 9},${ey + 4} Q${ex},${ey - 7} ${ex + 9},${ey + 4}"/><path d="M${200 - ex - 9},${ey + 4} Q${200 - ex},${ey - 7} ${200 - ex + 9},${ey + 4}"/></g>`;

    const noseY = flat ? 104 : 106;
    const face = `
      <ellipse cx="100" cy="${noseY + 4}" rx="${flat ? 21 : 18}" ry="${flat ? 13 : 11.5}" fill="${lt}" opacity="${hairless ? 0.35 : 0.92}"/>
      <ellipse cx="64" cy="${noseY + 2}" rx="8" ry="5" fill="#ff9aa2" opacity=".28"/><ellipse cx="136" cy="${noseY + 2}" rx="8" ry="5" fill="#ff9aa2" opacity=".28"/>
      <g class="e-open">${eyesOpen}</g>${eyesSleep}${eyesHappy}
      <path d="M94.5,${noseY - 2.5} Q100,${noseY - 5} 105.5,${noseY - 2.5} Q100,${noseY + 5} 94.5,${noseY - 2.5} Z" fill="${nose}" stroke="${dark(nose, 0.3)}" stroke-width="1" stroke-linejoin="round"/>
      <path d="M100,${noseY + 2} L100,${noseY + 6} M100,${noseY + 6} Q96,${noseY + 11} 91,${noseY + 8} M100,${noseY + 6} Q104,${noseY + 11} 109,${noseY + 8}" fill="none" stroke="${dk}" stroke-opacity=".75" stroke-width="1.8" stroke-linecap="round"/>
      <g stroke="${whisk}" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".95">
        <path d="M72,${noseY + 1} L36,${noseY - 8}"/><path d="M72,${noseY + 5} L34,${noseY + 5}"/><path d="M73,${noseY + 9} L38,${noseY + 19}"/>
        <path d="M128,${noseY + 1} L164,${noseY - 8}"/><path d="M128,${noseY + 5} L166,${noseY + 5}"/><path d="M127,${noseY + 9} L162,${noseY + 19}"/></g>`;

    const head = `<g class="head" style="--d:${delay}s">
      ${ruff}${ear("l")}${ear("r")}
      <ellipse cx="100" cy="92" rx="${hrx}" ry="${hry}" fill="${f}" stroke="${line}" stroke-opacity="${lineOp}" stroke-width="1.5"/>
      <g clip-path="url(#ch-${uid})">${P.head}</g>
      <ellipse cx="100" cy="92" rx="${hrx}" ry="${hry}" fill="url(#hl-${uid})"/>
      ${face}</g>`;

    /* 特效 */
    const heart = (x, y, s, i) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="fxp fx${i}" d="M0,-3 C-6,-10 -14,0 0,10 C14,0 6,-10 0,-3Z" fill="#ff6f91"/></g>`;
    const star = (x, y, s, i) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="fxp fx${i}" d="M0,-8 Q1.5,-1.5 8,0 Q1.5,1.5 0,8 Q-1.5,1.5 -8,0 Q-1.5,-1.5 0,-8Z" fill="#ffc93c"/></g>`;
    const zz = (x, y, s, i) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="fxp fx${i}" d="M-5,-5 H5 L-5,5 H5" fill="none" stroke="#7a8bd9" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    const fx = `
      <g class="fx zzz">${zz(142, 52, 1.1, 1)}${zz(154, 38, 0.8, 2)}${zz(162, 26, 0.6, 3)}</g>
      <g class="fx hearts">${heart(150, 58, 0.9, 1)}${heart(48, 50, 0.7, 2)}${heart(158, 34, 0.6, 3)}</g>
      <g class="fx sparkle">${star(150, 56, 0.9, 1)}${star(46, 52, 0.7, 2)}${star(160, 100, 0.6, 3)}</g>`;

    const svg = `<svg class="cat st-${state}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${(opts.label || "猫咪").replace(/"/g, "")}" style="--d:${delay}s">
      ${defs}
      <ellipse class="shadow" cx="100" cy="195" rx="${60 * bw}" ry="5.5" fill="#000" opacity=".12"/>
      <g class="all">${tail}${body}${head}${fx}</g></svg>`;
    return svg;
  }

  window.CatArt = { render, mix, light, dark };
})();
