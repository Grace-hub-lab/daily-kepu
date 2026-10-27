// 每日科普 —— 主逻辑
// 原理:根据「今天是今年的第几天」挑选内容,同一天固定、第二天自动换。
// 支持:两层板块筛选、每个板块各自的「今日一条」、偏好设置、收藏、抽背、滑动翻页。

(function () {
  "use strict";

  const el = {
    date: document.getElementById("date"),
    filterBar: document.getElementById("filterBar"),
    subBar: document.getElementById("subBar"),
    illus: document.getElementById("illus"),
    field: document.getElementById("field"),
    title: document.getElementById("title"),
    body: document.getElementById("body"),
    fact: document.getElementById("fact"),
    counter: document.getElementById("counter"),
    total: document.getElementById("total"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next"),
    today: document.getElementById("today"),
    random: document.getElementById("random"),
    card: document.getElementById("card"),
    favBtn: document.getElementById("favBtn"),
    quizToggle: document.getElementById("quizToggle"),
    revealBtn: document.getElementById("revealBtn"),
    quote: document.getElementById("quote"),
    settingsBtn: document.getElementById("settingsBtn"),
    settings: document.getElementById("settings"),
    prefList: document.getElementById("prefList"),
    settingsDone: document.getElementById("settingsDone"),
  };

  // ---------- 板块分组 ----------
  const ALL = "全部";
  const FAV = "★ 收藏";
  const KAOGONG_FIELDS = ["法律", "历史", "地理", "科技", "时政", "经济"];
  // 字段名 -> 板块名
  function groupOf(field) {
    if (KAOGONG_FIELDS.includes(field)) return "考公";
    if (field === "考研政治") return "考研";
    return field; // 百科 / 成语 / 诗词 等,字段名即板块名
  }
  // 板块列表按数据里出现的顺序生成,以后新增板块会自动出现
  const GROUPS = [...new Set(KNOWLEDGE.map((k) => groupOf(k.field)))];

  // ---------- 本地存储 ----------
  const FAV_KEY = "kepu_favs";
  const PREF_KEY = "kepu_prefs";
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* 隐私模式等场景忽略 */ }
  }

  let favs = new Set(load(FAV_KEY, []));
  const isFav = (item) => favs.has(item.title);

  // 偏好:今日一条参与的板块(空数组 = 全部)
  let prefGroups = load(PREF_KEY, []).filter((g) => GROUPS.includes(g));

  // ---------- 状态 ----------
  const view = { group: ALL, sub: null }; // sub 只在「考公」下使用
  let current = 0;      // 当前条目在 KNOWLEDGE 中的下标
  let quizMode = false;

  // ---------- 日期 ----------
  function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }
  function formatDate(date) {
    const week = ["日", "一", "二", "三", "四", "五", "六"];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${week[date.getDay()]}`;
  }

  // ---------- 下标池 ----------
  function poolFor(group, sub) {
    const out = [];
    KNOWLEDGE.forEach((k, i) => {
      let ok;
      if (group === ALL) ok = true;
      else if (group === FAV) ok = favs.has(k.title);
      else if (sub) ok = k.field === sub;
      else ok = groupOf(k.field) === group;
      if (ok) out.push(i);
    });
    return out;
  }
  const pool = () => poolFor(view.group, view.sub);

  // 一个池子里「今天」对应的那一条
  function dailyOf(p) {
    return p[dayOfYear(new Date()) % p.length];
  }

  // 首页「今日知识」:按偏好板块挑
  function todayIndex() {
    let p = KNOWLEDGE.map((_, i) => i);
    if (prefGroups.length) {
      const filtered = p.filter((i) => prefGroups.includes(groupOf(KNOWLEDGE[i].field)));
      if (filtered.length) p = filtered;
    }
    return dailyOf(p);
  }

  // ---------- 渲染 ----------
  function renderIllus(item) {
    el.illus.innerHTML =
      (typeof FIELD_ICONS !== "undefined" && FIELD_ICONS[item.field]) || item.svg || "";
  }

  function renderQuote(realIndex) {
    if (!el.quote || typeof QUOTES === "undefined" || !QUOTES.length) return;
    el.quote.textContent = QUOTES[realIndex % QUOTES.length];
  }

  function applyQuizState(reset) {
    el.card.classList.toggle("quiz", quizMode);
    if (reset) el.card.classList.remove("revealed");
  }

  function viewLabel() {
    if (view.sub) return view.sub;
    return view.group === ALL ? "" : view.group;
  }

  function show(realIndex, animate) {
    current = realIndex;
    const item = KNOWLEDGE[current];

    if (animate) {
      el.card.style.animation = "none";
      void el.card.offsetWidth;
      el.card.style.animation = "rise 0.4s ease";
    }

    renderIllus(item);
    el.field.textContent = item.field;
    el.title.textContent = item.title;
    el.body.textContent = item.body;
    el.fact.textContent = item.fact;

    el.favBtn.textContent = isFav(item) ? "★" : "☆";
    el.favBtn.classList.toggle("active", isFav(item));
    el.favBtn.setAttribute("aria-pressed", String(isFav(item)));

    const p = pool();
    const label = viewLabel();
    el.counter.textContent = `${label ? label + " " : ""}第 ${p.indexOf(current) + 1} / ${p.length} 条`;

    const isToday = view.group === ALL && current === todayIndex();
    el.today.textContent = isToday ? "✓ 今日知识" : "回到今天";

    renderQuote(current);
    applyQuizState(true);
  }

  function showEmpty() {
    renderIllus({ field: "百科" });
    el.field.textContent = FAV;
    el.title.textContent = "还没有收藏任何内容";
    el.body.textContent = "点击卡片右上角的星标 ☆ 即可收藏。收藏保存在本机,下次打开还在。";
    el.fact.textContent = "切回其他板块,挑几条收藏起来吧。";
    el.favBtn.textContent = "☆";
    el.favBtn.classList.remove("active");
    el.counter.textContent = "收藏 第 0 / 0 条";
    el.today.textContent = "回到今天";
    renderQuote(0);
    el.card.classList.remove("quiz", "revealed");
  }

  // ---------- 翻页 ----------
  function move(step) {
    const p = pool();
    if (p.length === 0) return;
    let idx = p.indexOf(current);
    if (idx === -1) idx = 0;
    show(p[(idx + step + p.length) % p.length], true);
  }

  function randomInPool() {
    const p = pool();
    if (p.length === 0) return;
    if (p.length === 1) return show(p[0], true);
    let r = current;
    while (r === current) r = p[Math.floor(Math.random() * p.length)];
    show(r, true);
  }

  // ---------- 筛选栏 ----------
  function makeChip(text, active, onClick, extraClass) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (extraClass ? " " + extraClass : "") + (active ? " active" : "");
    btn.textContent = text;
    btn.setAttribute("aria-pressed", String(active));
    btn.addEventListener("click", onClick);
    return btn;
  }

  function renderFilterBar() {
    el.filterBar.innerHTML = "";
    [ALL, ...GROUPS, FAV].forEach((g) => {
      const chip = makeChip(g, view.group === g, () => setView(g, null));
      el.filterBar.appendChild(chip);
    });
    // 把当前选中的标签滚到可见位置
    const active = el.filterBar.querySelector(".chip.active");
    if (active) {
      // 只横向滚动筛选栏,不影响整页
      el.filterBar.scrollLeft = active.offsetLeft - (el.filterBar.clientWidth - active.offsetWidth) / 2;
    }

    // 考公的二级小类
    if (view.group === "考公") {
      el.subBar.hidden = false;
      el.subBar.innerHTML = "";
      el.subBar.appendChild(makeChip("全部考公", !view.sub, () => setView("考公", null), "chip-sm"));
      KAOGONG_FIELDS.forEach((f) => {
        el.subBar.appendChild(makeChip(f, view.sub === f, () => setView("考公", f), "chip-sm"));
      });
    } else {
      el.subBar.hidden = true;
      el.subBar.innerHTML = "";
    }
  }

  function setView(group, sub) {
    view.group = group;
    view.sub = sub;
    renderFilterBar();
    const p = pool();
    if (p.length === 0) return showEmpty();
    if (group === ALL) return show(todayIndex(), true);
    // 在小类之间切换时尽量保留当前条目,否则显示该板块的「今日一条」
    show(sub && p.includes(current) ? current : dailyOf(p), true);
  }

  // ---------- 收藏 ----------
  function toggleFav() {
    if (view.group === FAV && pool().length === 0) return;
    const item = KNOWLEDGE[current];
    if (!item) return;
    if (favs.has(item.title)) favs.delete(item.title);
    else favs.add(item.title);
    save(FAV_KEY, [...favs]);
    el.favBtn.textContent = isFav(item) ? "★" : "☆";
    el.favBtn.classList.toggle("active", isFav(item));
    el.favBtn.setAttribute("aria-pressed", String(isFav(item)));
    if (view.group === FAV) {
      const np = pool();
      if (np.length === 0) return showEmpty();
      if (!np.includes(current)) show(np[0], true);
      else el.counter.textContent = `收藏 第 ${np.indexOf(current) + 1} / ${np.length} 条`;
    }
  }

  // ---------- 设置面板 ----------
  function renderPrefList() {
    el.prefList.innerHTML = "";
    GROUPS.forEach((g) => {
      const count = KNOWLEDGE.filter((k) => groupOf(k.field) === g).length;
      const label = document.createElement("label");
      label.className = "pref-item";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.value = g;
      box.checked = prefGroups.includes(g);
      const text = document.createElement("span");
      text.textContent = g;
      const num = document.createElement("span");
      num.className = "pref-count";
      num.textContent = `${count} 条`;
      label.append(box, text, num);
      el.prefList.appendChild(label);
    });
  }

  function openSettings() {
    renderPrefList();
    el.settings.hidden = false;
    el.settingsDone.focus();
  }

  function closeSettings() {
    prefGroups = [...el.prefList.querySelectorAll("input:checked")].map((b) => b.value);
    save(PREF_KEY, prefGroups);
    el.settings.hidden = true;
    el.settingsBtn.focus();
    // 回到首页看新的「今日一条」
    setView(ALL, null);
  }

  // ---------- 事件 ----------
  el.prev.addEventListener("click", () => move(-1));
  el.next.addEventListener("click", () => move(1));
  el.random.addEventListener("click", randomInPool);
  el.today.addEventListener("click", () => setView(ALL, null));
  el.favBtn.addEventListener("click", toggleFav);

  el.quizToggle.addEventListener("change", () => {
    quizMode = el.quizToggle.checked;
    applyQuizState(true);
  });
  el.revealBtn.addEventListener("click", () => el.card.classList.add("revealed"));

  el.settingsBtn.addEventListener("click", openSettings);
  el.settingsDone.addEventListener("click", closeSettings);
  el.settings.addEventListener("click", (e) => {
    if (e.target === el.settings) closeSettings(); // 点遮罩关闭
  });

  document.addEventListener("keydown", (e) => {
    if (!el.settings.hidden) {
      if (e.key === "Escape") closeSettings();
      return;
    }
    if (e.target && e.target.tagName === "INPUT") return;
    if (e.key === "ArrowLeft") move(-1);
    if (e.key === "ArrowRight") move(1);
    if (e.key === " " && quizMode) { e.preventDefault(); el.card.classList.add("revealed"); }
    if (e.key === "f" || e.key === "F") toggleFav();
  });

  // 手机手势:左滑下一条,右滑上一条
  let touchX = 0, touchY = 0, touchT = 0;
  el.card.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touchX = t.clientX; touchY = t.clientY; touchT = Date.now();
  }, { passive: true });
  el.card.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - touchT < 800) {
      const dir = dx < 0 ? "swipe-left" : "swipe-right";
      el.card.classList.add(dir);
      setTimeout(() => el.card.classList.remove(dir), 200);
      move(dx < 0 ? 1 : -1);
    }
  }, { passive: true });

  // ---------- 初始化 ----------
  el.date.textContent = formatDate(new Date());
  el.total.textContent = `共 ${KNOWLEDGE.length} 条 · 左右滑动翻页`;
  renderFilterBar();
  show(todayIndex(), false);
})();
