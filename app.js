// 每日科普 —— 主逻辑
// 原理:根据「今天是今年的第几天」来挑选知识,保证同一天固定显示同一条,第二天自动换下一条。
// 支持:按领域筛选、收藏(本地保存)、抽背模式(先看标题再揭示答案)。

(function () {
  "use strict";

  const el = {
    date: document.getElementById("date"),
    filterBar: document.getElementById("filterBar"),
    illus: document.getElementById("illus"),
    field: document.getElementById("field"),
    title: document.getElementById("title"),
    body: document.getElementById("body"),
    fact: document.getElementById("fact"),
    counter: document.getElementById("counter"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next"),
    today: document.getElementById("today"),
    random: document.getElementById("random"),
    card: document.getElementById("card"),
    favBtn: document.getElementById("favBtn"),
    quizToggle: document.getElementById("quizToggle"),
    revealBtn: document.getElementById("revealBtn"),
    quote: document.getElementById("quote"),
  };

  // 底部金句:每条考点固定配一句(按下标取,翻页跟着换)
  function renderQuote(realIndex) {
    if (!el.quote || typeof QUOTES === "undefined" || !QUOTES.length) return;
    el.quote.textContent = QUOTES[realIndex % QUOTES.length];
  }

  const ALL = "全部";
  const FAV = "★ 收藏";
  const STORE_KEY = "kepu_favs"; // localStorage 键

  let activeField = ALL; // 当前筛选:全部 / 领域名 / 收藏
  let current = 0;        // 当前显示条目在 KNOWLEDGE 中的真实下标
  let quizMode = false;   // 抽背模式开关

  // ---------- 收藏:本地持久化(按标题存,标题唯一) ----------
  function loadFavs() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  }
  function saveFavs(set) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify([...set]));
    } catch (e) { /* 隐私模式等场景忽略 */ }
  }
  let favs = loadFavs();
  const isFav = (item) => favs.has(item.title);

  // ---------- 日期与索引 ----------
  function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }
  function todayIndex() {
    return dayOfYear(new Date()) % KNOWLEDGE.length;
  }
  function formatDate(date) {
    const week = ["日", "一", "二", "三", "四", "五", "六"];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${week[date.getDay()]}`;
  }

  // 当前筛选下的下标池
  function pool() {
    if (activeField === ALL) return KNOWLEDGE.map((_, i) => i);
    if (activeField === FAV)
      return KNOWLEDGE.reduce((a, k, i) => (favs.has(k.title) && a.push(i), a), []);
    return KNOWLEDGE.reduce((a, k, i) => (k.field === activeField && a.push(i), a), []);
  }

  function renderIllus(item) {
    el.illus.innerHTML =
      (typeof FIELD_ICONS !== "undefined" && FIELD_ICONS[item.field]) || item.svg || "";
  }

  // 抽背模式:每切换一条先盖住答案,等用户点「揭示」
  function applyQuizState(reset) {
    el.card.classList.toggle("quiz", quizMode);
    if (reset) el.card.classList.remove("revealed");
  }

  // 渲染指定真实下标的条目
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

    // 收藏星标状态
    el.favBtn.textContent = isFav(item) ? "★" : "☆";
    el.favBtn.classList.toggle("active", isFav(item));

    // 计数
    const p = pool();
    const pos = p.indexOf(current) + 1;
    const label = activeField === ALL ? "" : activeField + " ";
    el.counter.textContent = `${label}第 ${pos} / ${p.length} 条`;

    const isToday = current === todayIndex() && activeField === ALL;
    el.today.textContent = isToday ? "✓ 今日知识" : "回到今天";

    renderQuote(current);
    applyQuizState(true); // 新条目在抽背模式下重新盖住
  }

  function move(step) {
    const p = pool();
    if (p.length === 0) return;
    let idx = p.indexOf(current);
    if (idx === -1) idx = 0;
    const nextIdx = (idx + step + p.length) % p.length;
    show(p[nextIdx], true);
  }

  function randomInPool() {
    const p = pool();
    if (p.length === 0) return;
    if (p.length === 1) return show(p[0], true);
    let r = current;
    while (r === current) r = p[Math.floor(Math.random() * p.length)];
    show(r, true);
  }

  // 空池(收藏为空)时的提示
  function showEmpty() {
    renderIllus({ field: "法律" });
    el.field.textContent = FAV;
    el.title.textContent = "还没有收藏任何考点";
    el.body.textContent = "点击卡片右上角的星标 ☆ 即可收藏。收藏的考点会保存在本机,下次打开还在。";
    el.fact.textContent = "切回「全部」或某个领域,挑几条收藏起来吧。";
    el.favBtn.textContent = "☆";
    el.favBtn.classList.remove("active");
    el.counter.textContent = "收藏 第 0 / 0 条";
    el.today.textContent = "回到今天";
    renderQuote(0);
    el.card.classList.remove("quiz", "revealed");
  }

  function setFilter(fieldName) {
    activeField = fieldName;
    [...el.filterBar.children].forEach((c) =>
      c.classList.toggle("active", c.dataset.field === fieldName)
    );
    const p = pool();
    if (p.length === 0) return showEmpty();
    if (fieldName === ALL) show(todayIndex(), true);
    else show(p.includes(current) ? current : p[0], true);
  }

  function buildFilterBar() {
    const fields = [ALL, FAV, ...new Set(KNOWLEDGE.map((k) => k.field))];
    el.filterBar.innerHTML = "";
    fields.forEach((f) => {
      const btn = document.createElement("button");
      btn.className = "chip" + (f === ALL ? " active" : "");
      btn.textContent = f;
      btn.dataset.field = f;
      btn.addEventListener("click", () => setFilter(f));
      el.filterBar.appendChild(btn);
    });
  }

  // 切换当前条目收藏状态
  function toggleFav() {
    const p = pool();
    if (activeField === FAV && p.length === 0) return; // 空收藏页无可操作
    const item = KNOWLEDGE[current];
    if (!item) return;
    if (favs.has(item.title)) favs.delete(item.title);
    else favs.add(item.title);
    saveFavs(favs);
    el.favBtn.textContent = isFav(item) ? "★" : "☆";
    el.favBtn.classList.toggle("active", isFav(item));
    // 如果正在看收藏页且刚取消了收藏,刷新列表
    if (activeField === FAV) {
      const np = pool();
      if (np.length === 0) return showEmpty();
      if (!np.includes(current)) show(np[0], true);
      else el.counter.textContent = `收藏 第 ${np.indexOf(current) + 1} / ${np.length} 条`;
    }
  }

  // ---------- 事件绑定 ----------
  el.prev.addEventListener("click", () => move(-1));
  el.next.addEventListener("click", () => move(1));
  el.random.addEventListener("click", randomInPool);
  el.today.addEventListener("click", () => setFilter(ALL));
  el.favBtn.addEventListener("click", toggleFav);

  el.quizToggle.addEventListener("change", () => {
    quizMode = el.quizToggle.checked;
    applyQuizState(true);
  });
  el.revealBtn.addEventListener("click", () => el.card.classList.add("revealed"));

  // 键盘(电脑上仍可用,手机无妨)
  document.addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") return;
    if (e.key === "ArrowLeft") move(-1);
    if (e.key === "ArrowRight") move(1);
    if (e.key === " " && quizMode) { e.preventDefault(); el.card.classList.add("revealed"); }
    if (e.key === "f" || e.key === "F") toggleFav();
  });

  // ---------- 手机手势:左右滑动翻页 ----------
  let touchX = 0, touchY = 0, touchT = 0;
  el.card.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touchX = t.clientX; touchY = t.clientY; touchT = Date.now();
  }, { passive: true });

  el.card.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    const dt = Date.now() - touchT;
    // 判定为水平滑动:横向位移足够大、明显大于纵向、且不是长按
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 800) {
      const dir = dx < 0 ? "swipe-left" : "swipe-right";
      el.card.classList.add(dir);
      setTimeout(() => el.card.classList.remove(dir), 200);
      move(dx < 0 ? 1 : -1); // 左滑看下一条,右滑看上一条
    }
  }, { passive: true });

  // ---------- 初始化 ----------
  el.date.textContent = formatDate(new Date());
  buildFilterBar();
  show(todayIndex(), false);
})();
