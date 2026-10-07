(function () {
  "use strict";
  const { CATS, byId, bgOf, art, photo, fav, heartSvg, similar } = window.Meow;
  const STATES = [["idle", "😺 发呆"], ["sleep", "😴 睡觉"], ["play", "🎾 玩耍"], ["happy", "😻 开心"]];
  const id = new URLSearchParams(location.search).get("id");
  const c = byId(id);
  const page = document.getElementById("page");

  if (!c) {
    document.title = "没有找到这只猫咪 · 喵百科";
    page.innerHTML = `<div class="empty"><div class="empty-cat">${art(CATS[0], "sleep")}</div><p>没有找到这只猫咪。</p><a class="btn" href="index.html#explore">返回猫咪图鉴</a></div>`;
    return;
  }
  document.title = `${c.name}（${c.en}）· 喵百科`;
  document.querySelector('meta[name="description"]').content = `${c.name}：${c.intro.slice(0, 80)}…`;

  const i = CATS.indexOf(c), prev = CATS[(i + CATS.length - 1) % CATS.length], next = CATS[(i + 1) % CATS.length];
  const bars = Object.entries(c.rating).map(([k, v]) =>
    `<div class="bar"><span>${k}</span><span class="tr"><span class="fl" data-w="${v * 20}"></span></span><em>${v}/5</em></div>`).join("");
  const sim = similar(c, 4).map((x) => `<a class="card" href="cat.html?id=${x.id}" style="--bgc:${bgOf(x)}"><div class="stage">${photo(x, "idle")}</div><h3>${x.name}</h3><div class="en">${x.en}</div></a>`).join("");

  page.style.setProperty("--bgc", bgOf(c));
  page.innerHTML = `
    <nav class="crumb" aria-label="面包屑"><a href="index.html">首页</a> › <a href="index.html#explore">猫咪图鉴</a> › <span>${c.name}</span></nav>
    <section class="dp-top">
      <div class="media mode-photo" style="--bgc:${bgOf(c)}">
        <div class="d-stage"><div class="d-photo">${photo(c, "idle", true)}</div><div class="d-anim">${art(c, "idle")}</div></div>
        <div class="tabs"><button data-mode="photo" class="on">📷 照片</button><button data-mode="anim">🎬 动态</button></div>
        <div class="states" hidden>${STATES.map(([k, t]) => `<button class="st${k === "idle" ? " on" : ""}" data-st="${k}">${t}</button>`).join("")}</div>
      </div>
      <div class="dp-info">
        <div class="d-title"><h1>${c.name}</h1><span>${c.en}</span></div>
        <div class="d-tags"><span class="tag">${c.hair}</span><span class="tag">${c.origin}</span>${c.tags.map((t) => `<span class="tag alt">${t}</span>`).join("")}</div>
        <p class="d-intro">${c.intro}</p>
        <div class="facts f4">
          <div class="fact"><small>体重</small><b>${c.weight}</b></div><div class="fact"><small>寿命</small><b>${c.life}</b></div>
          <div class="fact"><small>体型</small><b>${c.size}</b></div><div class="fact"><small>毛发</small><b>${c.hair}</b></div>
        </div>
        <div class="dp-actions">
          <button class="btn fav-btn${fav.has(c.id) ? " on" : ""}" data-fav="${c.id}" aria-pressed="${fav.has(c.id)}">${heartSvg}<span>${fav.has(c.id) ? "已收藏" : "收藏"}</span></button>
          <button class="btn btn-ghost" id="share">分享</button>
        </div>
      </div>
    </section>
    <section class="dp-grid">
      <div class="panel"><h2 class="d-h">养护评分</h2><div class="bars">${bars}</div>
        <h2 class="d-h">性格关键词</h2><div class="d-tags">${c.traits.map((t) => `<span class="tag">${t}</span>`).join("")}</div></div>
      <div class="panel"><h2 class="d-h">护理要点</h2><div class="note">${c.care}</div>
        <h2 class="d-h">适合人群</h2><div class="note">${c.fit}</div>
        <h2 class="d-h">你可能不知道</h2><div class="note fun">💡 ${c.fun}</div></div>
    </section>
    <section class="dp-sim"><h2 class="d-h">相似的猫咪</h2><div class="grid">${sim}</div></section>
    <div class="d-nav dp-nav"><a class="btn btn-ghost" href="cat.html?id=${prev.id}">← ${prev.name}</a><a class="btn btn-ghost" href="cat.html?id=${next.id}">${next.name} →</a></div>`;

  requestAnimationFrame(() => requestAnimationFrame(() => page.querySelectorAll(".fl").forEach((el) => (el.style.width = el.dataset.w + "%"))));

  const media = page.querySelector(".media"), states = media.querySelector(".states");
  const setMode = (m) => {
    media.classList.toggle("mode-photo", m === "photo"); media.classList.toggle("mode-anim", m === "anim");
    states.hidden = m !== "anim";
    media.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
  };
  media.addEventListener("nophoto", () => setMode("anim"));
  media.addEventListener("click", (e) => {
    const m = e.target.closest("[data-mode]"); if (m) { setMode(m.dataset.mode); return; }
    const s = e.target.closest(".st");
    if (s) { media.querySelector(".cat").setAttribute("class", "cat st-" + s.dataset.st); media.querySelectorAll(".st").forEach((b) => b.classList.toggle("on", b === s)); }
  });
  page.addEventListener("click", (e) => { const f = e.target.closest("[data-fav]"); if (f) fav.toggle(f.dataset.fav); });
  fav.onChange(() => { const b = page.querySelector(".fav-btn"); b.querySelector("span").textContent = fav.has(c.id) ? "已收藏" : "收藏"; });
  document.getElementById("share").addEventListener("click", async (e) => {
    const url = location.href, btn = e.currentTarget;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else { await navigator.clipboard.writeText(url); btn.textContent = "链接已复制 ✓"; setTimeout(() => (btn.textContent = "分享"), 1800); }
    } catch (err) { /* 用户取消 */ }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") location.href = `cat.html?id=${prev.id}`;
    if (e.key === "ArrowRight") location.href = `cat.html?id=${next.id}`;
  });
})();
