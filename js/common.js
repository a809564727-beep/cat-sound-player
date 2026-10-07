/* 公共模块：照片 / 动态猫咪回退、收藏、颜色 */
(function () {
  "use strict";
  const CATS = window.CATS;
  const PASTELS = ["#fde6d6", "#e4eefc", "#fdf0c9", "#ece4fb", "#dff3e6", "#fde1e6", "#d9f0f3", "#f7e8d2"];
  let n = 0;

  const byId = (id) => CATS.find((c) => c.id === id);
  const bgOf = (c) => PASTELS[CATS.indexOf(c) % PASTELS.length];
  const art = (c, st, label) =>
    window.CatArt.render(c.v, { state: st || "idle", uid: "u" + ++n, label: label || c.name, delay: -((n * 0.83) % 4) });
  const photoSrc = (c) => `img/cats/${c.id}.jpg`;
  /* 优先显示真实照片；图片缺失时自动回退到动态猫咪 */
  const photo = (c, st, eager) =>
    `<img class="photo" src="${photoSrc(c)}" alt="${c.name}（${c.en}）" ${eager ? "" : 'loading="lazy"'} decoding="async" data-id="${c.id}" data-st="${st || "idle"}">`;

  document.addEventListener("error", (e) => {
    const t = e.target;
    if (!t || t.tagName !== "IMG" || !t.classList.contains("photo")) return;
    const hero = t.closest(".d-hero, .media");
    if (hero) { hero.classList.add("no-photo"); hero.dispatchEvent(new CustomEvent("nophoto", { bubbles: true })); return; }
    const c = byId(t.dataset.id);
    if (!c) return;
    const stage = t.parentElement;
    if (stage) stage.classList.add("no-photo");
    t.outerHTML = art(c, t.dataset.st);
  }, true);

  /* 收藏 */
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem("meow-favs") || "[]")); } catch (e) { /* 忽略 */ }
  const listeners = [];
  const fav = {
    has: (id) => favs.has(id),
    size: () => favs.size,
    toggle(id) {
      favs.has(id) ? favs.delete(id) : favs.add(id);
      try { localStorage.setItem("meow-favs", JSON.stringify([...favs])); } catch (e) { /* 忽略 */ }
      document.querySelectorAll(`[data-fav="${id}"]`).forEach((b) => { b.classList.toggle("on", favs.has(id)); b.setAttribute("aria-pressed", favs.has(id)); });
      listeners.forEach((f) => f(id));
    },
    onChange: (f) => listeners.push(f)
  };
  const heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z"/></svg>';

  /* 相似猫咪：同毛长 + 评分距离 */
  const similar = (c, k) => CATS.filter((x) => x !== c).map((x) => {
    let d = Object.keys(c.rating).reduce((s, key) => s + Math.abs(c.rating[key] - x.rating[key]), 0);
    if (x.hair !== c.hair) d += 3;
    d -= x.tags.filter((t) => c.tags.includes(t)).length * 2;
    return [d, x];
  }).sort((a, b) => a[0] - b[0]).slice(0, k).map((p) => p[1]);

  window.Meow = { CATS, byId, bgOf, art, photo, photoSrc, fav, heartSvg, similar };
})();
