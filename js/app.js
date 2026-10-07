(function () {
  "use strict";
  const { CATS, byId, bgOf, art, photo, fav, heartSvg } = window.Meow;
  const $ = (s, el) => (el || document).querySelector(s);
  const STATES = [["idle", "😺 发呆"], ["sleep", "😴 睡觉"], ["play", "🎾 玩耍"], ["happy", "😻 开心"]];
  const FILTERS = [
    ["all", "全部", () => true],
    ["long", "长毛", (c) => c.hair === "长毛"],
    ["short", "短毛", (c) => c.hair === "短毛"],
    ["special", "无毛 / 卷毛 / 折耳", (c) => c.hair === "无毛" || /卷|折耳/.test(c.name + c.tags.join(""))],
    ["small", "小型", (c) => /小|迷你/.test(c.size)],
    ["big", "大型", (c) => /大/.test(c.size)],
    ["quiet", "安静温顺", (c) => c.rating.吵闹 <= 2 && c.rating.活跃 <= 3],
    ["easy", "新手友好", (c) => c.rating.好打理 >= 4],
    ["fav", "♥ 我的收藏", (c) => fav.has(c.id)]
  ];
  const SORTS = [
    ["default", "默认排序", null],
    ["affection", "最亲人", (a, b) => b.rating.亲人 + b.rating.粘人 - (a.rating.亲人 + a.rating.粘人)],
    ["active", "最活泼", (a, b) => b.rating.活跃 - a.rating.活跃],
    ["easy", "最好打理", (a, b) => b.rating.好打理 - a.rating.好打理 || a.rating.掉毛 - b.rating.掉毛],
    ["quiet", "最安静", (a, b) => a.rating.吵闹 - b.rating.吵闹],
    ["name", "名称 A-Z", (a, b) => a.name.localeCompare(b.name, "zh")]
  ];
  const state = { id: CATS[0].id, filter: "all", q: "", sort: "default", mode: "photo", cat: "idle" };
  const initState = (i) => (i % 5 === 2 ? "sleep" : i % 7 === 3 ? "happy" : "idle");
  const mobile = () => matchMedia("(max-width:1100px)").matches;

  /* ---------- URL 同步 ---------- */
  function readUrl() {
    const p = new URLSearchParams(location.search);
    if (p.get("q")) state.q = p.get("q");
    if (FILTERS.some((f) => f[0] === p.get("f"))) state.filter = p.get("f");
    if (SORTS.some((s) => s[0] === p.get("sort"))) state.sort = p.get("sort");
    const h = decodeURIComponent(location.hash.slice(1));
    if (byId(h)) state.id = h;
  }
  function writeUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.filter !== "all") p.set("f", state.filter);
    if (state.sort !== "default") p.set("sort", state.sort);
    const s = p.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + "#" + state.id);
  }

  /* ---------- 列表 ---------- */
  function list() {
    const f = FILTERS.find((x) => x[0] === state.filter)[2];
    const q = state.q.trim().toLowerCase();
    const items = CATS.filter((c) => f(c) && (!q || [c.name, c.en, c.origin, c.hair, c.size, c.intro, ...c.tags, ...c.traits].join(" ").toLowerCase().includes(q)));
    const sorter = SORTS.find((s) => s[0] === state.sort)[2];
    return sorter ? items.slice().sort(sorter) : items;
  }

  function renderChips() {
    $("#chips").innerHTML = FILTERS.map(([k, t]) => {
      const extra = k === "fav" && fav.size() ? ` (${fav.size()})` : "";
      return `<button class="chip${k === state.filter ? " on" : ""}" data-f="${k}" role="tab" aria-selected="${k === state.filter}">${t}${extra}</button>`;
    }).join("");
  }

  function renderGrid() {
    const items = list();
    $("#grid").innerHTML = items.map((c) => {
      const st = initState(CATS.indexOf(c));
      return `<div class="card${c.id === state.id ? " on" : ""}" data-id="${c.id}" tabindex="0" role="button" aria-label="查看${c.name}详情" style="--bgc:${bgOf(c)}">
        <button class="fav${fav.has(c.id) ? " on" : ""}" data-fav="${c.id}" aria-pressed="${fav.has(c.id)}" aria-label="收藏${c.name}">${heartSvg}</button>
        <div class="stage" data-st="${st}">${photo(c, st)}<span class="hair-badge">${c.hair}</span></div>
        <h3>${c.name}</h3><div class="en">${c.en}</div>
        <div class="meta"><span class="tag">${c.size}</span><span class="tag alt">${c.tags[0]}</span></div></div>`;
    }).join("");
    $("#count").textContent = `共 ${items.length} 种猫咪` + (state.q ? `（搜索“${state.q}”）` : "");
    $("#empty").hidden = items.length > 0;
    $("#empty-cat").innerHTML = items.length ? "" : art(CATS[0], "sleep", "没有结果");
    renderChips();
    writeUrl();
  }

  /* ---------- 详情侧栏 ---------- */
  function renderDetail(animate) {
    const c = byId(state.id);
    const bars = Object.entries(c.rating).map(([k, v]) =>
      `<div class="bar"><span>${k}</span><span class="tr"><span class="fl" data-w="${v * 20}"></span></span><em>${v}/5</em></div>`).join("");
    const photoMode = state.mode === "photo";
    const d = $("#detail");
    d.style.setProperty("--bgc", bgOf(c));
    d.innerHTML = `
      <div class="d-hero ${photoMode ? "mode-photo" : "mode-anim"}">
        <button class="d-close" data-close aria-label="关闭">✕</button>
        <button class="fav d-fav${fav.has(c.id) ? " on" : ""}" data-fav="${c.id}" aria-pressed="${fav.has(c.id)}" aria-label="收藏">${heartSvg}</button>
        <div class="d-stage">
          <div class="d-photo">${photo(c, "idle", true)}</div>
          <div class="d-anim">${art(c, state.cat)}</div>
        </div>
        <div class="tabs" role="tablist"><button data-mode="photo" class="${photoMode ? "on" : ""}">📷 照片</button><button data-mode="anim" class="${photoMode ? "" : "on"}">🎬 动态</button></div>
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
        <h4 class="d-h">你可能不知道</h4><div class="note fun">💡 ${c.fun}</div>
        <a class="btn full" href="cat.html?id=${c.id}">查看完整详情页 →</a>
        <div class="d-nav"><button data-nav="-1">← 上一只</button><button data-nav="1">下一只 →</button></div>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => d.querySelectorAll(".fl").forEach((el) => (el.style.width = el.dataset.w + "%"))));
    document.querySelectorAll(".card").forEach((el) => el.classList.toggle("on", el.dataset.id === state.id));
  }

  function select(id, opts) {
    opts = opts || {};
    state.id = id; state.cat = "idle";
    renderDetail(true);
    if (opts.open && mobile()) openSheet();
    writeUrl();
    if (!opts.open) $("#detail").scrollTop = 0;
  }
  function openSheet() { document.body.classList.add("sheet-open"); $("#backdrop").hidden = false; $("#detail").scrollTop = 0; }
  function closeSheet() { document.body.classList.remove("sheet-open"); $("#backdrop").hidden = true; }
  const setSt = (box, st) => { const s = box.querySelector(".cat"); if (s) s.setAttribute("class", "cat st-" + st); };

  /* ---------- 事件 ---------- */
  $("#grid").addEventListener("click", (e) => {
    const f = e.target.closest("[data-fav]");
    if (f) { fav.toggle(f.dataset.fav); e.stopPropagation(); return; }
    const card = e.target.closest(".card");
    if (card) select(card.dataset.id, { open: true });
  });
  $("#grid").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) { e.preventDefault(); select(e.target.dataset.id, { open: true }); }
  });
  $("#grid").addEventListener("mouseover", (e) => { const s = e.target.closest(".stage.no-photo"); if (s && !s.contains(e.relatedTarget)) setSt(s, "play"); });
  $("#grid").addEventListener("mouseout", (e) => { const s = e.target.closest(".stage.no-photo"); if (s && !s.contains(e.relatedTarget)) setSt(s, s.dataset.st); });

  $("#detail").addEventListener("click", (e) => {
    const t = e.target;
    const hero = $("#detail .d-hero");
    const mode = t.closest("[data-mode]");
    if (mode) {
      state.mode = mode.dataset.mode;
      hero.classList.toggle("mode-photo", state.mode === "photo"); hero.classList.toggle("mode-anim", state.mode === "anim");
      document.querySelectorAll("#detail .tabs button").forEach((b) => b.classList.toggle("on", b === mode));
      return;
    }
    const stb = t.closest(".st");
    if (stb) {
      state.cat = stb.dataset.st; setSt($("#detail .d-anim"), state.cat);
      document.querySelectorAll("#detail .st").forEach((b) => b.classList.toggle("on", b === stb));
      if (state.mode !== "anim") $("#detail [data-mode=anim]").click();
      return;
    }
    const f = t.closest("[data-fav]");
    if (f) { fav.toggle(f.dataset.fav); return; }
    if (t.closest("[data-close]")) { closeSheet(); return; }
    const nav = t.closest("[data-nav]");
    if (nav) step(+nav.dataset.nav);
  });
  $("#detail").addEventListener("nophoto", () => { state.mode = "anim"; const h = $("#detail .d-hero"); h.classList.remove("mode-photo"); h.classList.add("mode-anim"); });
  $("#backdrop").addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "/") { e.preventDefault(); $("#q").focus(); }
  });
  function step(d) {
    const items = list().length ? list() : CATS;
    const i = items.findIndex((c) => c.id === state.id);
    select(items[(i + d + items.length) % items.length].id, { open: document.body.classList.contains("sheet-open") });
  }
  fav.onChange(() => { if (state.filter === "fav") renderGrid(); else renderChips(); });

  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    state.filter = b.dataset.f; renderGrid();
  });
  let timer;
  $("#q").addEventListener("input", (e) => { clearTimeout(timer); timer = setTimeout(() => { state.q = e.target.value; renderGrid(); }, 120); });
  $("#sort").innerHTML = SORTS.map(([k, t]) => `<option value="${k}">${t}</option>`).join("");
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });
  $("#reset").addEventListener("click", () => { state.q = ""; state.filter = "all"; state.sort = "default"; $("#q").value = ""; $("#sort").value = "default"; renderGrid(); });

  /* ---------- 榜单 ---------- */
  const RANKS = [
    ["💗 最亲人榜", "亲人 + 粘人，最爱陪着你", (c) => c.rating.亲人 + c.rating.粘人],
    ["🧹 最省心榜", "好打理 + 低掉毛 + 安静", (c) => c.rating.好打理 + (6 - c.rating.掉毛) + (6 - c.rating.吵闹)],
    ["⚡ 最活力榜", "活跃度爆表，家里的小马达", (c) => c.rating.活跃 * 2 + c.rating.吵闹]
  ];
  $("#ranks").innerHTML = RANKS.map(([t, d, fn]) => {
    const top = CATS.slice().sort((a, b) => fn(b) - fn(a) || a.name.localeCompare(b.name, "zh")).slice(0, 5);
    return `<div class="rank"><h3>${t}</h3><p>${d}</p><ul>${top.map((c, i) =>
      `<li data-go="${c.id}" tabindex="0"><span class="no">${i + 1}</span><span class="av" style="--bgc:${bgOf(c)}">${photo(c, "idle")}</span><div><b>${c.name}</b><small>${c.hair} · ${c.size}</small></div><span class="sc">${fn(c)}</span></li>`).join("")}</ul></div>`;
  }).join("");
  const goRank = (li) => {
    state.filter = "all"; state.q = ""; $("#q").value = "";
    renderGrid(); select(li.dataset.go, { open: true });
    if (!mobile()) document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
  };
  $("#ranks").addEventListener("click", (e) => { const li = e.target.closest("[data-go]"); if (li) goRank(li); });
  $("#ranks").addEventListener("keydown", (e) => { const li = e.target.closest("[data-go]"); if (li && e.key === "Enter") goRank(li); });

  /* ---------- Hero ---------- */
  [["hero-a", "ragdoll", "idle"], ["hero-b", "orange-cat", "sleep"], ["hero-c", "tuxedo-cow", "play"]].forEach(([el, id, st]) => {
    const c = byId(id); const box = document.getElementById(el);
    box.style.background = bgOf(c); box.innerHTML = photo(c, st, true);
  });

  /* ---------- 初始化 ---------- */
  readUrl();
  $("#q").value = state.q; $("#sort").value = state.sort;
  renderGrid();
  renderDetail(false);
})();
