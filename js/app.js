(function () {
  "use strict";
  const CATS = window.CATS;
  const $ = (s, el) => (el || document).querySelector(s);
  const STATES = [["idle", "😺 发呆"], ["sleep", "😴 睡觉"], ["play", "🎾 玩耍"], ["happy", "😻 开心"]];
  const FILTERS = [
    ["all", "全部", () => true],
    ["long", "长毛", (c) => c.hair === "长毛"],
    ["short", "短毛", (c) => c.hair === "短毛"],
    ["special", "无毛 / 卷毛 / 折耳", (c) => c.hair === "无毛" || /卷|折耳/.test(c.name + c.tags.join(""))],
    ["small", "小型", (c) => /小|迷你/.test(c.size)],
    ["big", "大型", (c) => /大/.test(c.size)],
    ["fav", "♥ 我的收藏", (c) => favs.has(c.id)]
  ];
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem("meow-favs") || "[]")); } catch (e) { /* 忽略 */ }
  const saveFavs = () => { try { localStorage.setItem("meow-favs", JSON.stringify([...favs])); } catch (e) { /* 忽略 */ } };

  const state = { id: CATS[0].id, filter: "all", q: "", cat: "idle" };
  let uidN = 0;
  const art = (c, st, label) => window.CatArt.render(c.v, { state: st, uid: "u" + (++uidN), label: label || c.name, delay: -((uidN * 0.83) % 4) });
  const PASTELS = ["#fde6d6", "#e4eefc", "#fdf0c9", "#ece4fb", "#dff3e6", "#fde1e6", "#d9f0f3", "#f7e8d2"];
  const bgOf = (c) => PASTELS[CATS.indexOf(c) % PASTELS.length];
  const initState = (i) => (i % 5 === 2 ? "sleep" : i % 7 === 3 ? "happy" : "idle");
  const heart = (on) => `<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z"/></svg>`;

  /* ---------- 过滤 ---------- */
  function list() {
    const f = FILTERS.find((x) => x[0] === state.filter)[2];
    const q = state.q.trim().toLowerCase();
    return CATS.filter((c) => f(c) && (!q || [c.name, c.en, c.origin, c.hair, c.intro, ...c.tags, ...c.traits].join(" ").toLowerCase().includes(q)));
  }

  /* ---------- 网格 ---------- */
  function renderGrid() {
    const items = list();
    const grid = $("#grid");
    grid.innerHTML = items.map((c) => {
      const i = CATS.indexOf(c);
      return `<div class="card${c.id === state.id ? " on" : ""}" data-id="${c.id}" tabindex="0" role="button" aria-label="查看${c.name}详情" style="--bgc:${bgOf(c)}">
        <button class="fav${favs.has(c.id) ? " on" : ""}" data-fav="${c.id}" aria-label="收藏${c.name}">${heart()}</button>
        <div class="stage" data-st="${initState(i)}">${art(c, initState(i))}</div>
        <h3>${c.name}</h3><div class="en">${c.en}</div>
        <div class="meta"><span class="tag">${c.hair}</span><span class="tag alt">${c.tags[0]}</span></div></div>`;
    }).join("");
    $("#count").textContent = `共 ${items.length} 种猫咪`;
    $("#empty").hidden = items.length > 0;
    $("#empty-cat").innerHTML = items.length ? "" : art(CATS[0], "sleep", "没有结果");
  }

  /* ---------- 详情 ---------- */
  function renderDetail(animate) {
    const c = CATS.find((x) => x.id === state.id);
    const bars = Object.entries(c.rating).map(([k, v]) =>
      `<div class="bar"><span>${k}</span><span class="tr"><span class="fl" data-w="${v * 20}"></span></span><em>${v}/5</em></div>`).join("");
    $("#detail").style.setProperty("--bgc", bgOf(c));
    $("#detail").innerHTML = `
      <div class="d-hero">
        <button class="d-close" data-close aria-label="关闭">✕</button>
        <button class="fav d-fav${favs.has(c.id) ? " on" : ""}" data-fav="${c.id}" aria-label="收藏">${heart()}</button>
        <div class="d-stage" id="d-stage">${art(c, state.cat)}</div>
        <div class="states" role="group" aria-label="切换状态">${STATES.map(([k, t]) => `<button class="st${k === state.cat ? " on" : ""}" data-st="${k}">${t}</button>`).join("")}</div>
      </div>
      <div class="d-body" ${animate ? "" : 'style="animation:none"'}>
        <div class="d-title"><h3>${c.name}</h3><span>${c.en}</span></div>
        <div class="d-tags"><span class="tag">${c.hair}</span><span class="tag">${c.origin}</span>${c.tags.map((t) => `<span class="tag alt">${t}</span>`).join("")}</div>
        <p class="d-intro">${c.intro}</p>
        <div class="facts">
          <div class="fact"><small>体重</small><b>${c.weight}</b></div><div class="fact"><small>寿命</small><b>${c.life}</b></div>
          <div class="fact"><small>体型</small><b>${c.size}</b></div><div class="fact"><small>性格</small><b>${c.traits.join(" · ")}</b></div>
        </div>
        <h4 class="d-h">养护评分</h4><div class="bars">${bars}</div>
        <h4 class="d-h">护理要点</h4><div class="note">${c.care}</div>
        <h4 class="d-h">适合人群</h4><div class="note">${c.fit}</div>
        <h4 class="d-h">你可能不知道</h4><div class="note fun">💡 ${c.fun}</div>
        <div class="d-nav"><button data-nav="-1">← 上一只</button><button data-nav="1">下一只 →</button></div>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll("#detail .fl").forEach((el) => (el.style.width = el.dataset.w + "%"))));
    document.querySelectorAll(".card").forEach((el) => el.classList.toggle("on", el.dataset.id === state.id));
  }

  function select(id, opts) {
    opts = opts || {};
    state.id = id; state.cat = "idle";
    renderDetail(true);
    if (opts.open && matchMedia("(max-width:1100px)").matches) openSheet();
    if (!opts.noHash) history.replaceState(null, "", "#" + id);
    if (!opts.open) $("#detail").scrollTop = 0;
  }
  function openSheet() { document.body.classList.add("sheet-open"); $("#backdrop").hidden = false; $("#detail").scrollTop = 0; }
  function closeSheet() { document.body.classList.remove("sheet-open"); $("#backdrop").hidden = true; }

  /* ---------- 事件 ---------- */
  $("#grid").addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) { toggleFav(fav.dataset.fav); e.stopPropagation(); return; }
    const card = e.target.closest(".card");
    if (card) select(card.dataset.id, { open: true });
  });
  $("#grid").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) { e.preventDefault(); select(e.target.dataset.id, { open: true }); }
  });
  /* 悬停 → 玩耍 */
  const setSt = (stage, st) => { const s = stage.querySelector(".cat"); if (s) s.setAttribute("class", "cat st-" + st); };
  $("#grid").addEventListener("mouseover", (e) => { const st = e.target.closest(".stage"); if (st && !st.contains(e.relatedTarget)) setSt(st, "play"); });
  $("#grid").addEventListener("mouseout", (e) => { const st = e.target.closest(".stage"); if (st && !st.contains(e.relatedTarget)) setSt(st, st.dataset.st); });

  $("#detail").addEventListener("click", (e) => {
    const t = e.target;
    const stb = t.closest("[data-st]");
    if (stb) { state.cat = stb.dataset.st; setSt($("#d-stage"), state.cat); document.querySelectorAll("#detail .st").forEach((b) => b.classList.toggle("on", b === stb)); return; }
    const fav = t.closest("[data-fav]");
    if (fav) { toggleFav(fav.dataset.fav); return; }
    if (t.closest("[data-close]")) { closeSheet(); return; }
    const nav = t.closest("[data-nav]");
    if (nav) step(+nav.dataset.nav);
  });
  $("#backdrop").addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  function step(d) {
    const items = list().length ? list() : CATS;
    const i = items.findIndex((c) => c.id === state.id);
    select(items[(i + d + items.length) % items.length].id, { open: document.body.classList.contains("sheet-open") });
  }
  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    saveFavs();
    document.querySelectorAll(`[data-fav="${id}"]`).forEach((b) => b.classList.toggle("on", favs.has(id)));
    if (state.filter === "fav") renderGrid();
  }

  /* 搜索 & 筛选 */
  $("#chips").innerHTML = FILTERS.map(([k, t]) => `<button class="chip${k === "all" ? " on" : ""}" data-f="${k}" role="tab">${t}</button>`).join("");
  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    state.filter = b.dataset.f;
    document.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b));
    renderGrid();
  });
  let timer;
  $("#q").addEventListener("input", (e) => { clearTimeout(timer); timer = setTimeout(() => { state.q = e.target.value; renderGrid(); }, 120); });

  /* ---------- 榜单 ---------- */
  const RANKS = [
    ["💗 最亲人榜", "亲人 + 粘人，最爱陪着你", (c) => c.rating.亲人 + c.rating.粘人],
    ["🧹 最省心榜", "好打理 + 低掉毛 + 安静", (c) => c.rating.好打理 + (6 - c.rating.掉毛) + (6 - c.rating.吵闹)],
    ["⚡ 最活力榜", "活跃度爆表，家里的小马达", (c) => c.rating.活跃 * 2 + c.rating.吵闹]
  ];
  $("#ranks").innerHTML = RANKS.map(([t, d, fn], r) => {
    const top = CATS.slice().sort((a, b) => fn(b) - fn(a) || a.name.localeCompare(b.name)).slice(0, 5);
    return `<div class="rank"><h3>${t}</h3><p>${d}</p><ul>${top.map((c, i) =>
      `<li data-go="${c.id}" tabindex="0"><span class="no">${i + 1}</span><span class="av" style="--bgc:${bgOf(c)}">${art(c, "idle")}</span><div><b>${c.name}</b><small>${c.hair} · ${c.size}</small></div><span class="sc">${fn(c)}</span></li>`).join("")}</ul></div>`;
  }).join("");
  $("#ranks").addEventListener("click", (e) => {
    const li = e.target.closest("[data-go]"); if (!li) return;
    state.filter = "all"; state.q = ""; $("#q").value = "";
    document.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x.dataset.f === "all"));
    renderGrid(); select(li.dataset.go, { open: true });
    if (!matchMedia("(max-width:1100px)").matches) document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- Hero ---------- */
  const byId = (id) => CATS.find((c) => c.id === id);
  [["hero-a", "ragdoll", "idle"], ["hero-b", "orange-cat", "sleep"], ["hero-c", "tuxedo-cow", "play"]].forEach(([el, id, st]) => {
    const c = byId(id); const box = document.getElementById(el);
    box.style.background = bgOf(c); box.innerHTML = art(c, st);
  });

  /* ---------- 初始化 ---------- */
  const hash = decodeURIComponent(location.hash.slice(1));
  if (byId(hash)) state.id = hash;
  renderGrid();
  renderDetail(false);
})();
