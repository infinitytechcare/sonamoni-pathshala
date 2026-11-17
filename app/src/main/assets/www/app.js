/* সোনামণির পাঠশালা — অ্যাপের সব স্ক্রিন ও খেলা */
(function () {
  'use strict';
  const D = window.DATA;
  const SETS = D.sets;
  const $app = document.getElementById('app');

  // =====================================================================
  // অবস্থা (ফোনেই সংরক্ষিত থাকে)
  // =====================================================================
  const KEY = 'sp_state_v1';
  const todayStr = (d = new Date()) => {
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };
  const defaults = () => ({
    v: 1, name: '', start: todayStr(), lang: 'bn', rate: 0.8, digits: 'en', stars: 0, onboarded: false,
    stats: {}, tasks: {}, duaDone: {}, clean: {}, tests: [], oral: {}, written: {},
  });
  let S;
  try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = defaults(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* জায়গা নেই */ } };

  const L = (bn, en) => (S.lang === 'en' && en != null ? en : bn);
  const N = (n) => (S.lang === 'en' ? String(n) : D.toBn(n));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

  // =====================================================================
  // উচ্চারণ (Android TextToSpeech) ও শব্দ
  // =====================================================================
  const Speech = {
    seq: 0, cb: {},
    has() { return !!window.Android; },
    status(lang) {
      if (!window.Android || !Android.langStatus) return 1;
      try { return Android.langStatus(lang); } catch (e) { return 1; }
    },
    speak(items, done) {
      if (!items || !items.length) return;
      const id = 'u' + (++this.seq);
      if (done) this.cb[id] = done;
      if (window.Android) {
        Android.speak(JSON.stringify({ id, rate: S.rate, items }));
      } else if (window.speechSynthesis) {
        // ব্রাউজারে পরীক্ষার জন্য
        speechSynthesis.cancel();
        items.forEach((it, i) => {
          const u = new SpeechSynthesisUtterance(it.t);
          u.lang = { bn: 'bn-BD', ar: 'ar-SA', en: 'en-US' }[it.l] || 'bn-BD';
          u.rate = S.rate;
          if (i === items.length - 1) u.onend = () => window.onTtsDone(id);
          speechSynthesis.speak(u);
        });
        if (done) setTimeout(() => window.onTtsDone(id), 1500 + items.length * 600);
      } else if (done) setTimeout(() => window.onTtsDone(id), 900);
    },
    stop() {
      this.cb = {};
      if (window.Android) Android.stop(); else if (window.speechSynthesis) speechSynthesis.cancel();
      Audio1.stop();
    },
  };
  window.onTtsDone = (id) => { const f = Speech.cb[id]; delete Speech.cb[id]; if (f) f(); };
  window.onTtsReady = () => { if (cur() && cur().name === 'home') render(); };

  // কুরআনের তিলাওয়াত (APK-র ভেতরের mp3)
  const Audio1 = {
    a: null,
    play(file, done, fail) {
      this.stop();
      const a = new Audio('../audio/' + file + '.mp3');
      this.a = a;
      a.onended = () => { if (this.a === a && done) done(); };
      a.onerror = () => { if (this.a === a) { this.a = null; (fail || (() => toast(L('তিলাওয়াতের ফাইল পাওয়া যায়নি', 'Recitation file not found'))))(); } };
      a.play().catch(() => {});
    },
    stop() { if (this.a) { try { this.a.pause(); } catch (e) {} this.a = null; } },
  };

  let actx = null;
  function beep(kind) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { ok: [660, 880], bad: [220, 180], star: [523, 659, 784, 1047], tap: [500] }[kind] || [500];
      notes.forEach((f, i) => {
        const o = actx.createOscillator(); const g = actx.createGain();
        o.type = kind === 'bad' ? 'square' : 'sine'; o.frequency.value = f;
        const t = actx.currentTime + i * 0.11;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'bad' ? 0.06 : 0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.2);
      });
    } catch (e) { /* শব্দ না হলেও চলবে */ }
  }
  function confetti(n = 24) {
    const fx = document.getElementById('fx');
    const em = ['⭐', '🎉', '🌟', '🎈', '💜', '✨'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.textContent = rnd(em); s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDelay = Math.random() * 0.5 + 's';
      fx.appendChild(s); setTimeout(() => s.remove(), 2400);
    }
  }
  let toastT;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false; clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function addStars(n) { if (n > 0) { S.stars += n; save(); } }

  // =====================================================================
  // স্ক্রিন বদলানোর ব্যবস্থা (Back বাটন সহ)
  // =====================================================================
  const stack = [];
  const cur = () => stack[stack.length - 1];
  const screens = {};
  function go(name, p = {}) { Speech.stop(); stack.push({ name, p, st: {} }); render(); window.scrollTo(0, 0); }
  function replace(name, p = {}) { Speech.stop(); stack.pop(); stack.push({ name, p, st: {} }); render(); window.scrollTo(0, 0); }
  function back() {
    Speech.stop();
    closeModal();
    if (stack.length > 1) { stack.pop(); render(); return true; }
    return false;
  }
  window.appBack = () => { if (document.querySelector('.modal-bg')) { closeModal(); return true; } return back(); };
  function render() {
    const c = cur();
    if (c.cleanup) { c.cleanup(); c.cleanup = null; }
    $app.innerHTML = screens[c.name](c.p, c.st, c);
    if (c.after) { const f = c.after; c.after = null; f(); }
  }
  function topbar(title, opts = {}) {
    const left = stack.length > 1 ? `<button class="ib" onclick="App.back()" aria-label="back">←</button>` : '';
    const right = opts.right || `<span class="stars">⭐ ${N(S.stars)}</span>`;
    return `<div class="top">${left}<h1>${title}</h1>${right}</div>`;
  }

  function modal(html) {
    closeModal();
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal">${html}</div>`;
    bg.addEventListener('click', (e) => { if (e.target === bg) closeModal(); });
    document.body.appendChild(bg);
  }
  function closeModal() { document.querySelectorAll('.modal-bg').forEach((m) => m.remove()); }

  // =====================================================================
  // সহায়ক: বর্ণ/সংখ্যা দেখানো, নাম, অগ্রগতি
  // =====================================================================
  const itemsOf = (set) => SETS[set].items;
  function disp(set, it) {
    if (set === 'num') return S.digits === 'bn' ? it.bnDigit : it.g;
    return it.g;
  }
  function sayOf(set, it) {
    if (set === 'num') return S.lang === 'en' ? it.sayEn : it.say;
    if (set === 'ar' && Speech.status('ar') !== 1) return it.sayBn;
    return it.say;
  }
  function nameOf(set, it) {
    if (set === 'num') return S.lang === 'en' ? it.en : it.name;
    return it.name;
  }
  function rangeLabel(set, r) {
    const it = itemsOf(set);
    if (set === 'ar') return `${it[r[0]].name.replace(/\s*\(.*\)/, '')}–${it[r[1]].name.replace(/\s*\(.*\)/, '')}`;
    if (set === 'num') return `${N(it[r[0]].n)}–${N(it[r[1]].n)}`;
    return `${it[r[0]].g}–${it[r[1]].g}`;
  }
  const setTitle = (set) => L(SETS[set].title, SETS[set].en);
  const statKey = (set, i) => `${set}:${i}`;
  function mark(set, i, right) {
    const k = statKey(set, i);
    const s = S.stats[k] || (S.stats[k] = { c: 0, w: 0 });
    if (right) s.c++; else s.w++;
    s.last = right ? 1 : 0;
  }
  function mastered(set, i) {
    const s = S.stats[statKey(set, i)];
    return !!s && s.c >= 2 && s.last === 1 && s.c >= s.w;
  }
  function setProgress(set) {
    const n = itemsOf(set).length;
    let m = 0; for (let i = 0; i < n; i++) if (mastered(set, i)) m++;
    return m / n;
  }
  function weakness(set, i) {
    const s = S.stats[statKey(set, i)];
    if (!s) return 1.5;
    return s.w * 2 - s.c + (s.last === 0 ? 3 : 0);
  }

  // =====================================================================
  // ১৫ দিনের পরিকল্পনা
  // =====================================================================
  function dayIndex() {
    const a = new Date(S.start + 'T00:00:00'); const b = new Date(todayStr() + 'T00:00:00');
    const d = Math.floor((b - a) / 86400000) + 1;
    return Math.max(1, Math.min(15, d));
  }
  function daysLeft() {
    const a = new Date(S.start + 'T00:00:00'); const b = new Date(todayStr() + 'T00:00:00');
    return Math.max(0, 15 - Math.floor((b - a) / 86400000));
  }
  const tkey = (d, i) => `d${d}-${i}`;
  const isDone = (d, i) => !!S.tasks[tkey(d, i)];
  function dayDone(d) { return D.plan[d - 1].every((_, i) => isDone(d, i)); }
  function completeTask(key, stars = 1) {
    if (!key || S.tasks[key]) return;
    S.tasks[key] = todayStr(); addStars(stars); save();
    beep('star'); confetti(30); toast(L('আজকের একটা পড়া শেষ! ⭐', 'Task finished! ⭐'));
  }
  function taskInfo(t) {
    const s = t.set;
    switch (t.t) {
      case 'learn': return { ic: SETS[s].icon, tl: L(`${rangeLabel(s, t.r)} শিখি`, `Learn ${rangeLabel(s, t.r)}`), sub: setTitle(s) };
      case 'quiz': return { ic: '🎯', tl: L(`${setTitle(s)} — সোজা ও উল্টাপাল্টা খেলা`, `${setTitle(s)} — review game`), sub: rangeLabel(s, t.r) };
      case 'write': return { ic: '✍️', tl: L(`লিখি: ${rangeLabel(s, t.r)}`, `Write: ${rangeLabel(s, t.r)}`), sub: setTitle(s) };
      case 'words': return { ic: '🍎', tl: L(`শব্দ ও অর্থ: ${rangeLabel(s, t.r)}`, `Words: ${rangeLabel(s, t.r)}`), sub: setTitle(s) };
      case 'rhyme': return { ic: '🎵', tl: L(`ছড়া: ${setTitle(s)}`, `Rhyme: ${setTitle(s)}`), sub: '' };
      case 'dua': {
        if (t.id === 'all') return { ic: '🤲', tl: L('সব দোয়া ও সূরা একবার করে', 'Review all duas'), sub: '' };
        const d = D.duas.find((x) => x.id === t.id);
        let sub = d.when;
        if (t.lines) {
          const ns = d.lines.slice(t.lines[0], t.lines[1] + 1).filter((l) => l.n).map((l) => l.n);
          sub = L(`আয়াত ${N(ns[0])}–${N(ns[ns.length - 1])}`, `Ayah ${ns[0]}–${ns[ns.length - 1]}`);
        }
        return { ic: d.icon, tl: L(d.title, d.en), sub };
      }
      case 'masala': {
        if (t.id === 'all') return { ic: '🕌', tl: L('ওজু, নামাজ, গোসলের ফরজ — পুনরাবৃত্তি', 'Review all fard'), sub: '' };
        const m = D.masala.find((x) => x.id === t.id);
        const part = t.part && m.parts.find((p) => p.id === t.part);
        return { ic: m.icon, tl: L(m.title, m.en), sub: part ? part.title : L(`${N(m.count)}টি`, `${m.count}`) };
      }
      case 'weak': return { ic: '💪', tl: L('কঠিনগুলো আবার খেলি', 'Practice the hard ones'), sub: '' };
      case 'test': return { ic: '📝', tl: L('মডেল টেস্ট (১০০ নম্বর)', 'Model test (100 marks)'), sub: '' };
      case 'oral': return { ic: '🎤', tl: L('মৌখিক পরীক্ষার মহড়া (বাবা/মা নেবেন)', 'Oral exam practice (parent)'), sub: '' };
    }
    return { ic: '•', tl: '', sub: '' };
  }
  function openTask(d, i) {
    const t = D.plan[d - 1][i]; const key = tkey(d, i);
    switch (t.t) {
      case 'learn': return go('learn', { set: t.set, r: t.r, task: key });
      case 'quiz': return go('quiz', { set: t.set, r: t.r, mode: 'review', task: key });
      case 'write': return go('write', { set: t.set, r: t.r, task: key });
      case 'words': return go('quiz', { set: t.set, r: t.r, mode: 'words', task: key });
      case 'rhyme': return go('rhyme', { set: t.set, task: key });
      case 'dua': return t.id === 'all' ? go('duas', { task: key }) : go('dua', { id: t.id, lines: t.lines, task: key });
      case 'masala': return t.id === 'all' ? go('quiz', { mode: 'masala', task: key }) : go('masala', { id: t.id, part: t.part, task: key });
      case 'weak': return go('quiz', { mode: 'weak', task: key });
      case 'test': return go('test', { task: key });
      case 'oral': return go('oral', { task: key });
    }
  }

  // =====================================================================
  // হোম
  // =====================================================================
  screens.home = (p, st) => {
    if (!S.onboarded) return onboard();
    const today = dayIndex();
    const sel = st.day || today;
    const tasks = D.plan[sel - 1];
    const doneN = tasks.filter((_, i) => isDone(sel, i)).length;
    let leftover = '';
    if (sel === today) {
      const rows = [];
      for (let d = 1; d < today; d++) D.plan[d - 1].forEach((t, i) => { if (!isDone(d, i)) rows.push(taskRow(d, i)); });
      if (rows.length) leftover = `<div class="sec">⏳ ${L('আগের দিনের বাকি পড়া', 'Left from earlier days')}</div><div class="card">${rows.slice(0, 8).join('')}</div>`;
    }
    let banner = '';
    if (Speech.has()) {
      const b = Speech.status('bn');
      if (b === 0 || b === -1) {
        banner = `<div class="banner">🔇 ${L('ফোনে বাংলা উচ্চারণের ভয়েস নেই। Google Text-to-Speech-এ "বাংলা (বাংলাদেশ)" ভয়েস ডাউনলোড করলে অ্যাপ বর্ণ ও সংখ্যা পড়ে শোনাবে।', 'Bangla voice is not installed. Download "Bangla (Bangladesh)" in Google Text-to-Speech so the app can read aloud.')}
          <button class="btn sm sun" onclick="App.ttsSettings()">${L('ভয়েস ঠিক করুন', 'Fix voice')}</button></div>`;
      }
    }
    const left = daysLeft();
    const tiles = [
      ['num', 't1'], ['en', 't2'], ['bn', 't3'], ['ar', 't4'],
    ].map(([s, c]) => `<button class="tile ${c}" onclick="App.go('subject',{set:'${s}'})">
        <span class="big ${s === 'ar' ? 'ar' : ''}">${SETS[s].icon}</span><span class="nm">${setTitle(s)}</span>
        <div class="bar l"><i style="width:${Math.round(setProgress(s) * 100)}%"></i></div></button>`).join('');
    const duaP = D.duas.filter((d) => S.duaDone[d.id]).length / D.duas.length;
    return `${topbar(L('সোনামণির পাঠশালা', 'Sonamoni Pathshala'), { right: `<span class="stars">⭐ ${N(S.stars)}</span><button class="ib" onclick="App.go('settings')">⚙️</button>` })}
    <div class="page">
      ${banner}
      <div class="hero">
        <div class="hi">${L('আসসালামু আলাইকুম', 'Assalamu alaikum')}${S.name ? ', ' + esc(S.name) : ''}! 👋</div>
        <div class="sub">${L(`পরীক্ষার প্রস্তুতি — ১৫ দিনের ${N(today)} নম্বর দিন`, `Exam prep — day ${today} of 15`)}${left > 0 ? L(` • পরীক্ষার আর ${N(left)} দিন`, ` • ${left} days to exam`) : ''}</div>
        <div class="bar"><i style="width:${Math.round(overallReady() * 100)}%"></i></div>
        <div class="sub" style="margin-top:4px">${L('প্রস্তুতি', 'Ready')}: ${N(Math.round(overallReady() * 100))}%</div>
      </div>
      <div class="days">${range(1, 15).map((d) => `<button class="day ${d === sel ? 'on' : ''} ${dayDone(d) ? 'done' : ''}" onclick="App.pickDay(${d})"><span><small>${L('দিন', 'Day')}</small>${N(d)}</span></button>`).join('')}</div>
      <div class="sec">📅 ${sel === today ? L('আজকের পড়া', "Today's lessons") : L(`দিন ${N(sel)} এর পড়া`, `Day ${sel} lessons`)} — ${N(doneN)}/${N(tasks.length)}</div>
      <div class="card">${tasks.map((_, i) => taskRow(sel, i)).join('')}
        ${cleanRow()}
      </div>
      ${leftover}
      <div class="sec">📚 ${L('সব বিষয়', 'All subjects')}</div>
      <div class="tiles">${tiles}
        <button class="tile t5" onclick="App.go('duas')"><span class="big">🤲</span><span class="nm">${L('দোয়া, সূরা ও কালেমা', 'Duas, Surahs & Kalima')}</span><div class="bar l"><i style="width:${Math.round(duaP * 100)}%"></i></div></button>
        <button class="tile t6" onclick="App.go('masalaList')"><span class="big">🕌</span><span class="nm">${L('ওজু, নামাজ ও গোসলের ফরজ', 'Fard of Wudu, Salah, Ghusl')}</span></button>
        <button class="tile t7" onclick="App.go('clean')"><span class="big">🧼</span><span class="nm">${L('পরিচ্ছন্নতা ও স্কুল', 'Cleanliness & school')}</span></button>
        <button class="tile t8" onclick="App.go('test')"><span class="big">📝</span><span class="nm">${L('মডেল টেস্ট', 'Model test')}</span><span class="mute">${S.tests.length ? L('শেষ: ', 'Last: ') + N(S.tests[S.tests.length - 1].score) + '/' + N(100) : ''}</span></button>
        <button class="tile t9" onclick="App.go('oral')"><span class="big">🎤</span><span class="nm">${L('মৌখিক পরীক্ষা (বাবা/মা)', 'Oral exam (parent)')}</span></button>
        <button class="tile t2" onclick="App.go('quiz',{mode:'weak'})"><span class="big">💪</span><span class="nm">${L('কঠিনগুলো আবার', 'Hard ones again')}</span></button>
      </div>
    </div>`;
  };
  function taskRow(d, i) {
    const t = D.plan[d - 1][i]; const inf = taskInfo(t); const done = isDone(d, i);
    const icCls = t.set === 'ar' && t.t === 'learn' ? 'ar' : '';
    return `<button class="task ${done ? 'done' : ''}" onclick="App.openTask(${d},${i})">
      <span class="ic ${icCls}">${inf.ic}</span>
      <span class="grow"><span class="tl">${inf.tl}</span>${inf.sub ? `<br><span class="mute">${inf.sub}${d !== dayIndex() ? ' • ' + L('দিন ', 'Day ') + N(d) : ''}</span>` : ''}</span>
      <span class="chk">${done ? '✓' : ''}</span></button>`;
  }
  function cleanRow() {
    const c = S.clean[todayStr()] || {};
    const n = D.clean.filter((x) => c[x.id]).length + (c.school ? 1 : 0);
    const done = n >= D.clean.length;
    return `<button class="task ${done ? 'done' : ''}" onclick="App.go('clean')"><span class="ic">🧼</span>
      <span class="grow"><span class="tl">${L('পরিচ্ছন্নতা ও স্কুল (বাবা/মা টিক দিন)', 'Cleanliness & school (parent ticks)')}</span><br><span class="mute">${N(n)}/${N(D.clean.length + 1)}</span></span>
      <span class="chk">${done ? '✓' : ''}</span></button>`;
  }
  function overallReady() {
    const sets = ['num', 'en', 'bn', 'ar'].map(setProgress);
    const dua = D.duas.filter((d) => S.duaDone[d.id]).length / D.duas.length;
    const plan = Object.keys(S.tasks).length / D.plan.reduce((a, d) => a + d.length, 0);
    return Math.min(1, (sets.reduce((a, b) => a + b, 0) + dua + plan) / 6);
  }

  function onboard() {
    return `${topbar(L('সোনামণির পাঠশালা', 'Sonamoni Pathshala'), { right: ' ' })}
    <div class="page">
      <div class="hero center"><div style="font-size:64px">📚⭐</div><div class="hi">${L('স্বাগতম!', 'Welcome!')}</div>
      <div class="sub">${L('১৫ দিনে পরীক্ষার পুরো প্রস্তুতি — সংখ্যা, ইংরেজি, বাংলা, আরবি, দোয়া-কালাম আর ওজু-নামাজের মাসআলা।', '15-day exam prep: numbers, English, Bangla, Arabic, duas and fard rules.')}</div></div>
      <div class="card">
        <div class="field"><label>${L('বাবুর নাম', "Child's name")}</label><input id="ob-name" oninput="App.setName(this.value)" placeholder="${L('যেমন: আয়েশা', 'e.g. Ayesha')}" value="${esc(S.name)}"></div>
        <div class="field"><label>${L('ভাষা', 'Language')}</label>
          <div class="seg"><button class="${S.lang === 'bn' ? 'on' : ''}" onclick="App.setLang('bn')">বাংলা</button><button class="${S.lang === 'en' ? 'on' : ''}" onclick="App.setLang('en')">English</button></div></div>
        <p class="mute">${L('আজ থেকে ১৫ দিনের রুটিন শুরু হবে। পরে ⚙️ সেটিংস থেকে শুরুর তারিখ বদলাতে পারবেন।', 'The 15-day plan starts today. You can change the start date later in ⚙️ Settings.')}</p>
        <button class="btn block" onclick="App.finishOnboard()">${L('শুরু করি 🚀', "Let's start 🚀")}</button>
      </div>
    </div>`;
  }

  // =====================================================================
  // বিষয়ের মেনু
  // =====================================================================
  screens.subject = (p, st) => {
    const set = p.set; const S1 = SETS[set]; const items = S1.items;
    const chunks = [];
    for (let a = 0; a < items.length; a += S1.chunk) chunks.push([a, Math.min(items.length - 1, a + S1.chunk - 1)]);
    // শেষে একটা মাত্র বর্ণ থাকলে আগের ভাগে জুড়ে দিই (যেমন U–Z)
    if (chunks.length > 1 && chunks[chunks.length - 1][0] === chunks[chunks.length - 1][1]) { const l = chunks.pop(); chunks[chunks.length - 1][1] = l[1]; }
    const all = [0, items.length - 1];
    const r = st.r || all;
    const rid = r.join(',');
    const chip = (rr, label) => `<button class="chip ${rr.join(',') === rid ? 'on' : ''}" onclick="App.subRange([${rr}])">${label}</button>`;
    const groupChips = (S1.groups || []).map((g) => chip(g.r, g.t)).join('');
    const hasWords = set !== 'num';
    const m = (e, t, s, act) => `<button class="mode" onclick="${act}"><span class="e">${e}</span><b>${t}</b><small>${s}</small></button>`;
    const R = `[${r}]`;
    return `${topbar(setTitle(set))}
    <div class="page">
      <div class="chips">${chip(all, L('সব', 'All'))}${groupChips}${chunks.map((c) => chip(c, rangeLabel(set, c))).join('')}</div>
      <div class="modes">
        ${m('📖', L('শিখি', 'Learn'), L('সোজা ক্রমে দেখি ও শুনি', 'See & hear in order'), `App.go('learn',{set:'${set}',r:${R}})`)}
        ${m('🔲', L('সব একসাথে', 'All at once'), L('ছুঁয়ে শুনি', 'Tap to hear'), `App.go('grid',{set:'${set}',r:${R}})`)}
        ${m('🔀', L('উল্টাপাল্টা চিনি', 'Mixed-up quiz'), L('শুনে/দেখে ঠিকটা ধরি', 'Find the right one'), `App.go('quiz',{set:'${set}',r:${R},mode:'mix'})`)}
        ${m('➡️', L('সোজা মুখস্থ', 'In order'), L('পরেরটা কী? আগেরটা কী?', "What's next?"), `App.go('quiz',{set:'${set}',r:${R},mode:'order'})`)}
        ${m('✍️', L('লিখি', 'Write'), L('আঙুল দিয়ে লেখা', 'Write with finger'), `App.go('write',{set:'${set}',r:${R}})`)}
        ${m('🎵', L('ছড়া', 'Rhymes'), L('শুনি ও বলি', 'Listen & say'), `App.go('rhyme',{set:'${set}'})`)}
        ${hasWords ? m('🍎', L('শব্দ ও অর্থ', 'Words & meaning'), set === 'en' ? L('A-তে Apple মানে আপেল', 'A for Apple') : L('ছবি দিয়ে শব্দ', 'Picture words'), `App.go('quiz',{set:'${set}',r:${R},mode:'words'})`) : ''}
        ${m('🎤', L('মুখে বলি', 'Say aloud'), L('বাবা/মা দেখাবেন', 'Parent flash cards'), `App.go('flash',{set:'${set}',r:${R}})`)}
      </div>
    </div>`;
  };

  // =====================================================================
  // শিখি — বড় কার্ড
  // =====================================================================
  function cardHtml(set, i) {
    const it = itemsOf(set)[i];
    let body = '';
    if (set === 'num') {
      const tens = Math.floor(it.n / 10); const ones = it.n % 10;
      body = `<div class="glyph ${it.n > 9 ? 'num2' : ''}">${disp(set, it)}</div>
        <div class="gname">${it.name}</div><div class="gsub en">${it.en}${S.digits !== 'bn' ? ' • ' + it.bnDigit : ' • ' + it.g}</div>
        <div class="counter">${'<span class="ten">১০</span>'.repeat(tens)}${'<span class="dot"></span>'.repeat(ones)}</div>`;
    } else if (set === 'en') {
      body = `<div class="glyph">${it.g}<span class="sm">${it.small}</span></div>
        <div class="words">${it.words.map((w) => `<div class="word"><span class="e">${w.e}</span><b class="en">${w.w}</b><small>${w.m}</small></div>`).join('')}</div>
        <div class="gsub" style="margin-top:8px">${it.g} for ${it.words[0].w}, ${it.g} for ${it.words[1].w}</div>`;
    } else if (set === 'bn') {
      body = `<div class="glyph">${it.g}</div><div class="gname">${it.name}</div><div class="gsub">${it.kind}</div>
        <div class="words">${it.words.map((w) => `<div class="word"><span class="e">${w.e}</span><b>${w.w}</b></div>`).join('')}</div>`;
    } else {
      const w = it.words[0];
      body = `<div class="glyph ar">${it.g}</div><div class="gname">${it.name}</div><div class="gsub ar">${it.arName}</div>
        <div class="words one"><div class="word"><span class="e">${w.e}</span><span class="ar">${w.w}</span><b>${w.p}</b><small>${L('অর্থ', 'meaning')}: ${w.m}</small></div></div>`;
    }
    return `<div class="lcard pop"><button class="speak" onclick="App.sayItem('${set}',${i},1)">🔊</button>${body}</div>`;
  }
  function fullSay(set, i) {
    const it = itemsOf(set)[i];
    const base = sayOf(set, it);
    if (set === 'en') return base.concat([{ t: `${it.g} for ${it.words[0].w}`, l: 'en' }, { t: it.words[0].m, l: 'bn' },
      { t: `${it.g} for ${it.words[1].w}`, l: 'en' }, { t: it.words[1].m, l: 'bn' }]);
    if (set === 'bn') return base.concat([{ t: `${it.g}-তে ${it.words[0].w.replace(/\s*\(.*\)/, '')}`, l: 'bn' }]);
    if (set === 'ar' && Speech.status('ar') === 1) return base.concat([{ t: it.words[0].w, l: 'ar' }, { t: it.words[0].m, l: 'bn' }]);
    return base;
  }
  screens.learn = (p, st, c) => {
    const set = p.set; const r = p.r || [0, itemsOf(set).length - 1];
    if (st.i == null) st.i = r[0];
    const i = st.i; const n = r[1] - r[0] + 1; const pos = i - r[0] + 1;
    const last = i >= r[1];
    c.after = () => { if (!st.auto) Speech.speak(fullSay(set, i)); bindSwipe(); };
    const nextBtn = last
      ? (p.task ? `<button class="btn sun" onclick="App.learnDone()">${L('এবার খেলা! 🎯', 'Now play! 🎯')}</button>`
        : `<button class="btn sun" onclick="App.replace('quiz',{set:'${set}',r:[${r}],mode:'mix'})">${L('খেলা 🎯', 'Quiz 🎯')}</button>`)
      : `<button class="btn" onclick="App.learnNav(1)">${L('পরেরটা', 'Next')} ▶</button>`;
    return `${topbar(`${setTitle(set)} • ${rangeLabel(set, r)}`)}
    <div class="page">
      <div class="bar l" style="margin:0 0 12px"><i style="width:${Math.round(pos / n * 100)}%"></i></div>
      ${cardHtml(set, i)}
      <div class="navrow">
        <button class="btn sec2" onclick="App.learnNav(-1)" ${i <= r[0] ? 'disabled style="opacity:.4"' : ''}>◀ ${L('আগেরটা', 'Back')}</button>
        ${nextBtn}
      </div>
      <div class="pg">${N(pos)} / ${N(n)}</div>
      <div class="btns" style="margin-top:12px">
        <button class="btn sec2" onclick="App.autoPlay()">${st.auto ? '⏸ ' + L('থামাও', 'Stop') : '▶ ' + L('সব একটানা শোনো', 'Play all')}</button>
      </div>
    </div>`;
  };
  function bindSwipe() {
    const el = document.querySelector('.lcard'); if (!el) return;
    let x0 = null;
    el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 60) App.learnNav(dx < 0 ? 1 : -1);
    });
  }

  // =====================================================================
  // সব একসাথে (গ্রিড)
  // =====================================================================
  screens.grid = (p) => {
    const set = p.set; const r = p.r || [0, itemsOf(set).length - 1];
    const cells = range(r[0], r[1]).map((i) => {
      const it = itemsOf(set)[i];
      return `<button class="cell ${set === 'ar' ? 'ar' : ''} ${mastered(set, i) ? 'm' : ''}" id="c${i}" onclick="App.gridTap('${set}',${i})">${disp(set, it)}</button>`;
    }).join('');
    return `${topbar(setTitle(set))}
    <div class="page">
      <p class="mute center">${L('যেকোনোটা ছুঁয়ে দাও, শুনতে পাবে। ✓ চিহ্ন মানে শেখা হয়েছে।', 'Tap any to hear it. ✓ means learnt.')}</p>
      <div class="grid ${set === 'num' || set === 'en' ? '' : 'c4'}">${cells}</div>
      <div class="btns" style="margin-top:14px"><button class="btn sec2" onclick="App.gridPlay('${set}',${r[0]},${r[1]})">▶ ${L('সোজা ক্রমে শোনো', 'Play in order')}</button></div>
    </div>`;
  };

  // =====================================================================
  // কুইজ ইঞ্জিন
  // =====================================================================
  function distractIdx(set, i, n, pool) {
    const all = itemsOf(set).length;
    let cand = (pool && pool.length >= n + 1 ? pool : range(Math.max(0, i - 6), Math.min(all - 1, i + 6))).filter((x) => x !== i);
    if (cand.length < n) cand = range(0, all - 1).filter((x) => x !== i);
    const seen = new Set([disp(set, itemsOf(set)[i])]);
    const out = [];
    for (const x of shuffle(cand)) { const d = disp(set, itemsOf(set)[x]); if (!seen.has(d)) { seen.add(d); out.push(x); } if (out.length >= n) break; }
    return out;
  }
  const glyphOpt = (set, i, correct) => ({ html: disp(set, itemsOf(set)[i]), cls: set === 'ar' ? 'ar' : '', ok: correct, item: i });
  const canHear = (set) => {
    if (!Speech.has()) return true;
    const lang = set === 'en' ? 'en' : set === 'num' ? (S.lang === 'en' ? 'en' : 'bn') : set === 'ar' ? 'ar' : 'bn';
    return Speech.status(lang) === 1 || (set === 'ar' && Speech.status('bn') === 1);
  };

  function qHear(set, i, pool) {
    const it = itemsOf(set)[i];
    const opts = [glyphOpt(set, i, true)].concat(distractIdx(set, i, 3, pool).map((x) => glyphOpt(set, x, false)));
    const hear = canHear(set);
    return { set, item: i, say: sayOf(set, it),
      prompt: hear ? L('🔊 শুনে ঠিকটা ছোঁও', '🔊 Listen and tap') : L(`"${nameOf(set, it)}" কোনটি?`, `Which is "${nameOf(set, it)}"?`),
      hint: hear ? L('আবার শুনতে 🔊 চাপো', 'Tap 🔊 to hear again') : L('(বাবা/মা পড়ে শোনান)', '(parent reads aloud)'),
      show: hear ? '<span style="font-size:70px">👂</span>' : '', opts: shuffle(opts) };
  }
  function qSee(set, i, pool) {
    const it = itemsOf(set)[i];
    if (set === 'num') {
      const ds = distractIdx(set, i, 3, pool);
      const o = (x, ok) => ({ html: nameOf(set, itemsOf(set)[x]), cls: 'txt', ok, item: x });
      return { set, item: i, prompt: L('এই সংখ্যাটার নাম কী?', 'What is this number?'), show: disp(set, it),
        opts: shuffle([o(i, true)].concat(ds.map((x) => o(x, false)))) };
    }
    if (set === 'en') {
      const ds = distractIdx(set, i, 3, pool);
      const o = (x, ok) => ({ html: itemsOf(set)[x].small, cls: 'en', ok, item: x });
      return { set, item: i, prompt: L('বড় হাতের অক্ষরের ছোট হাতের রূপ কোনটা?', 'Find the small letter'), show: it.g,
        opts: shuffle([o(i, true)].concat(ds.map((x) => o(x, false)))) };
    }
    if (set === 'ar') {
      const ds = distractIdx(set, i, 3, pool);
      const o = (x, ok) => ({ html: itemsOf(set)[x].name, cls: 'txt', ok, item: x });
      return { set, item: i, prompt: L('এই হরফের নাম কী?', 'Name this letter'), show: it.g, showCls: 'ar',
        opts: shuffle([o(i, true)].concat(ds.map((x) => o(x, false)))) };
    }
    return qWordOf(set, i, pool);
  }
  // "ক-এর শব্দ কোনটা?" — ছবি দিয়ে
  function qWordOf(set, i, pool) {
    const it = itemsOf(set)[i];
    const ds = distractIdx(set, i, 3, pool);
    const w = (x) => rnd(itemsOf(set)[x].words);
    const o = (x, ok) => { const ww = w(x); return { html: `<span class="e">${ww.e}</span>${set === 'ar' ? `<span class="ar" style="font-size:30px">${ww.w}</span>` : `<span class="${set === 'en' ? 'en' : ''}">${ww.w}</span>`}`, cls: 'pic', ok, item: x }; };
    return { set, item: i, say: sayOf(set, it), prompt: L(`"${set === 'ar' ? it.name : it.g}" দিয়ে কোনটা?`, `Which one has "${it.g}"?`),
      show: it.g, showCls: set === 'ar' ? 'ar' : '', opts: shuffle([o(i, true)].concat(ds.map((x) => o(x, false)))) };
  }
  // ছবি দেখে অক্ষর / অর্থ
  function qWordMeaning(set, i, pool) {
    const it = itemsOf(set)[i]; const ww = rnd(it.words);
    const kind = set === 'bn' ? 'letter' : (Math.random() < 0.5 ? 'meaning' : 'letter');
    if (kind === 'meaning') {
      const others = shuffle(itemsOf(set).map((x) => x.words).flat().filter((x) => x.m !== ww.m)).slice(0, 3);
      const o = (x, ok) => ({ html: x.m, cls: 'txt', ok, item: ok ? i : -1 });
      const showW = set === 'ar' ? `<span class="ar" style="font-size:52px">${ww.w}</span><span style="font-size:20px">${ww.p}</span>` : `<span class="en">${ww.w}</span>`;
      return { set, item: i, say: [{ t: ww.w, l: set === 'ar' ? 'ar' : 'en' }], prompt: L('মানে কী?', 'What does it mean?'),
        show: `<span class="e">${ww.e}</span>${showW}`, showCls: 'pic', opts: shuffle([o(ww, true)].concat(others.map((x) => o(x, false)))) };
    }
    const ds = distractIdx(set, i, 3, pool);
    const label = set === 'en' ? `<span class="en">${ww.w}</span>` : set === 'ar' ? `<span class="ar" style="font-size:44px">${ww.w}</span>` : ww.w;
    return { set, item: i, say: [{ t: ww.w.replace(/\s*\(.*\)/, ''), l: set === 'en' ? 'en' : set === 'ar' ? 'ar' : 'bn' }],
      prompt: set === 'bn' ? L('এই শব্দে কোন বর্ণটা আছে?', 'Which letter is in this word?') : L('কোন অক্ষর দিয়ে শুরু?', 'Which letter does it start with?'),
      show: `<span class="e">${ww.e}</span>${label}`, showCls: 'pic',
      opts: shuffle([glyphOpt(set, i, true)].concat(ds.map((x) => glyphOpt(set, x, false)))) };
  }
  function qOrder(set, i, r) {
    const items = itemsOf(set);
    const lo = r ? r[0] : 0; const hi = r ? r[1] : items.length - 1;
    const kind = rnd(['next', 'next', 'prev', 'miss']);
    let seq; let ans;
    if (kind === 'next' && i - 2 >= 0) { seq = [i - 2, i - 1]; ans = i; }
    else if (kind === 'prev' && i + 2 < items.length) { seq = [i + 1, i + 2]; ans = i; }
    else if (i - 1 >= 0 && i + 1 < items.length) { seq = [i - 1, i, i + 1]; ans = i; }
    else if (i + 2 < items.length) { seq = [i + 1, i + 2]; ans = i; }
    else { seq = [i - 2, i - 1]; ans = i; }
    let parts;
    if (seq.includes(ans)) parts = seq.map((x) => (x === ans ? '<span class="q">?</span>' : `<span>${disp(set, items[x])}</span>`));
    else if (seq[0] > ans) parts = ['<span class="q">?</span>'].concat(seq.map((x) => `<span>${disp(set, items[x])}</span>`));
    else parts = seq.map((x) => `<span>${disp(set, items[x])}</span>`).concat(['<span class="q">?</span>']);
    if (set === 'ar') parts.reverse();
    const pool = range(Math.max(lo, ans - 5), Math.min(hi, ans + 5));
    const opts = [glyphOpt(set, ans, true)].concat(distractIdx(set, ans, 3, pool.length > 4 ? pool : null).map((x) => glyphOpt(set, x, false)));
    return { set, item: ans, prompt: L('খালি ঘরে কোনটা বসবে?', 'What goes in the empty box?'),
      hint: set === 'ar' ? L('আরবি ডান দিক থেকে বাম দিকে পড়ি', 'Arabic reads right to left') : '',
      show: parts.join(''), showCls: 'seq' + (set === 'ar' ? ' ar' : ''), opts: shuffle(opts) };
  }

  // মাসআলা ও দোয়ার প্রশ্ন
  function qMasala(id) {
    const m = D.masala.find((x) => x.id === id);
    const kind = rnd(['count', 'which', 'which', 'not'].concat(id === 'namaz' ? ['part'] : []));
    if (kind === 'count') {
      const nums = shuffle([3, 4, 5, 7, 13, 6].filter((x) => x !== m.count)).slice(0, 3).concat([m.count]);
      return { prompt: L(m.q, m.en + ' — how many?'), show: m.icon, showCls: 'txt', mkey: 'm:' + id,
        opts: shuffle(nums.map((x) => ({ html: L(`${N(x)}টি`, String(x)), cls: 'txt', ok: x === m.count }))) };
    }
    if (kind === 'part') {
      const k = Math.floor(Math.random() * 13); const it = m.items[k]; const outer = k <= 6;
      return { prompt: L(`"${it.s}" — এটা নামাজের কোন ফরজ?`, `"${it.en}" is which kind of fard?`), show: it.e, showCls: 'txt', mkey: 'm:namaz',
        opts: [{ html: L('বাইরের ফরজ (আহকাম)', 'Outside (ahkam)'), cls: 'txt', ok: outer }, { html: L('ভেতরের ফরজ (আরকান)', 'Inside (arkan)'), cls: 'txt', ok: !outer }] };
    }
    if (kind === 'which') {
      const it = rnd(m.items);
      const others = shuffle(m.not).slice(0, 3);
      return { prompt: L(`নিচের কোনটি ${m.title}?`, `Which is a ${m.en}?`), show: m.icon, showCls: 'txt', mkey: 'm:' + id, one: true,
        opts: shuffle([{ html: it.s, cls: 'txt', ok: true }].concat(others.map((x) => ({ html: x, cls: 'txt', ok: false })))) };
    }
    const its = shuffle(m.items).slice(0, 3); const no = rnd(m.not);
    return { prompt: L(`কোনটি ${m.title} নয়?`, `Which is NOT a ${m.en}?`), show: m.icon, showCls: 'txt', mkey: 'm:' + id, one: true,
      opts: shuffle([{ html: no, cls: 'txt', ok: true }].concat(its.map((x) => ({ html: x.s, cls: 'txt', ok: false })))) };
  }
  function qDua() {
    const kind = rnd(['when', 'when', 'count', 'next', 'surah', 'kalima']);
    const daily = D.duas.filter((d) => d.group === 'dua');
    if (kind === 'when') {
      const d = rnd(daily);
      const first = (x) => x.lines.find((l) => !l.pre).bn;
      return { prompt: L(`${d.title} কোনটি?`, `Which is the dua "${d.en}"?`), show: d.icon, showCls: 'txt', mkey: 'd:' + d.id, one: true,
        opts: shuffle(daily.map((x) => ({ html: first(x), cls: 'txt', ok: x.id === d.id }))) };
    }
    if (kind === 'count') {
      const s = rnd(['fatiha', 'ikhlas']); const d = D.duas.find((x) => x.id === s); const n = d.lines.filter((l) => l.n).length;
      return { prompt: L(`${d.title}য় আয়াত কয়টি?`, `How many ayahs in ${d.en}?`), show: d.icon, showCls: 'txt', mkey: 'd:' + s,
        opts: shuffle([n, 3, 5, 6, 7, 4].filter((x, k, a) => a.indexOf(x) === k).filter((x) => x !== n).slice(0, 3).concat([n]).map((x) => ({ html: L(`${N(x)}টি`, String(x)), cls: 'txt', ok: x === n }))) };
    }
    if (kind === 'next') {
      const sid = rnd(['fatiha', 'fatiha', 'ikhlas']); const d = D.duas.find((x) => x.id === sid);
      const ls = d.lines.filter((l) => l.n);
      const k = Math.floor(Math.random() * (ls.length - 1));
      const others = shuffle(ls.filter((_, j) => j !== k + 1 && j !== k)).slice(0, 3);
      return { prompt: L('এর পরের আয়াত কোনটি?', 'Which ayah comes next?'), show: `<span style="font-size:20px">${ls[k].bn}</span>`, showCls: 'txt', mkey: 'd:' + d.id, one: true,
        opts: shuffle([{ html: ls[k + 1].bn, cls: 'txt', ok: true }].concat(others.map((x) => ({ html: x.bn, cls: 'txt', ok: false })))) };
    }
    if (kind === 'surah') {
      const sid = rnd(['fatiha', 'ikhlas']); const d = D.duas.find((x) => x.id === sid);
      const l = rnd(d.lines.filter((x) => x.n && x.n > 1));
      const names = ['সূরা ফাতিহা', 'সূরা ইখলাস', 'সূরা নাস', 'সূরা কাওসার'];
      return { prompt: L('এটা কোন সূরার আয়াত?', 'Which surah is this from?'), show: `<span style="font-size:20px">${l.bn}</span>`, showCls: 'txt', mkey: 'd:' + d.id,
        opts: shuffle(names.map((x) => ({ html: x, cls: 'txt', ok: x === d.title }))) };
    }
    const ks = D.duas.filter((d) => d.group === 'kalima'); const d = rnd(ks);
    return { prompt: L('এটা কোন কালেমা?', 'Which kalima is this?'), show: `<span style="font-size:20px">${d.lines[0].bn}…</span>`, showCls: 'txt', mkey: 'd:' + d.id,
      opts: shuffle(ks.map((x) => ({ html: x.title, cls: 'txt', ok: x.id === d.id }))) };
  }

  function weightedPick(set, idxs, n) {
    // কঠিন আর না-দেখা বর্ণ বেশি আসবে
    const arr = idxs.map((i) => ({ i, w: Math.max(0.5, weakness(set, i) + 2) + Math.random() * 2 }));
    arr.sort((a, b) => b.w - a.w);
    return shuffle(arr.slice(0, n).map((x) => x.i));
  }
  function buildQuiz(p) {
    const qs = [];
    const mode = p.mode;
    if (mode === 'masala') {
      ['wudu', 'gosol', 'namaz', 'wudu', 'gosol', 'namaz', 'namaz', 'wudu', 'gosol', 'namaz'].forEach((id) => qs.push(qMasala(id)));
      return qs;
    }
    if (mode === 'masalaOne') { for (let k = 0; k < 8; k++) qs.push(qMasala(p.id)); return qs; }
    if (mode === 'dua') { for (let k = 0; k < 10; k++) qs.push(qDua()); return qs; }
    if (mode === 'weak') {
      const all = [];
      ['num', 'en', 'bn', 'ar'].forEach((s) => itemsOf(s).forEach((_, i) => { if (S.stats[statKey(s, i)]) all.push({ s, i, w: weakness(s, i) }); }));
      let pick = all.filter((x) => x.w > -1).sort((a, b) => b.w - a.w).slice(0, 12);
      if (pick.length < 6) pick = pick.concat(shuffle(['num', 'en', 'bn', 'ar'].flatMap((s) => itemsOf(s).map((_, i) => ({ s, i })))).slice(0, 12 - pick.length));
      shuffle(pick).forEach(({ s, i }) => qs.push(rnd([qHear, qSee, qHear])(s, i)));
      return qs;
    }
    const set = p.set; const r = p.r || [0, itemsOf(set).length - 1];
    const idxs = range(r[0], r[1]); const n = idxs.length;
    const count = mode === 'review' ? Math.min(15, Math.max(10, n)) : Math.min(12, Math.max(6, Math.round(n * 1.5)));
    const pool = n >= 4 ? idxs : null;
    const picks = [];
    while (picks.length < count) picks.push(...weightedPick(set, idxs, Math.min(n, count - picks.length)));
    picks.forEach((i, k) => {
      if (mode === 'order') qs.push(qOrder(set, i, r));
      else if (mode === 'words') qs.push(k % 3 === 2 ? qWordOf(set, i, pool) : qWordMeaning(set, i, pool));
      else if (mode === 'review') qs.push(rnd([qHear, qSee, (a, b) => qOrder(a, b, r)])(set, i, pool));
      else qs.push(k % 3 === 1 ? qSee(set, i, pool) : qHear(set, i, pool));
    });
    return qs;
  }
  function quizTitle(p) {
    if (p.mode === 'retry') return p.title || L('আবার খেলি', 'Retry');
    if (!p.set && p.mode !== 'masala' && p.mode !== 'masalaOne' && p.mode !== 'dua' && p.mode !== 'weak') return L('আবার খেলি', 'Retry');
    if (p.mode === 'masala' || p.mode === 'masalaOne') return L('মাসআলা খেলা', 'Fard quiz');
    if (p.mode === 'dua') return L('দোয়া ও সূরা খেলা', 'Dua quiz');
    if (p.mode === 'weak') return L('কঠিনগুলো আবার', 'Hard ones again');
    const m = { mix: L('উল্টাপাল্টা চিনি', 'Mixed-up'), order: L('সোজা মুখস্থ', 'In order'), words: L('শব্দ ও অর্থ', 'Words'), review: L('পুনরাবৃত্তি', 'Review') }[p.mode] || '';
    return `${setTitle(p.set)} • ${m}`;
  }
  screens.quiz = (p, st, c) => {
    if (!st.qs) { st.qs = p.qs || buildQuiz(p); st.k = 0; st.right = 0; st.wrong = []; st.locked = false; }
    if (st.k >= st.qs.length) return quizResult(p, st);
    const q = st.qs[st.k];
    c.after = () => { if (q.say) setTimeout(() => Speech.speak(q.say), 250); };
    return `${topbar(quizTitle(p))}
    <div class="page">
      <div class="qtop"><div class="bar l"><i style="width:${Math.round(st.k / st.qs.length * 100)}%"></i></div><b>${N(st.k + 1)}/${N(st.qs.length)}</b></div>
      ${qCard(q)}
    </div>`;
  };
  function qCard(q) {
    return `<div class="qcard">
        ${q.say ? `<button class="speak" onclick="App.qSay()">🔊</button>` : ''}
        <div class="qprompt">${q.prompt}</div>
        ${q.show ? `<div class="qshow ${q.showCls || ''}">${q.show}</div>` : ''}
        ${q.hint ? `<div class="qhint">${q.hint}</div>` : ''}
      </div>
      <div class="opts ${q.one || (q.opts[0] && q.opts[0].cls === 'txt' && q.opts.some((o) => String(o.html).length > 14)) ? 'one' : ''}">
        ${q.opts.map((o, j) => `<button class="opt ${o.cls || ''}" id="o${j}" onclick="App.answer(${j})">${o.html}</button>`).join('')}
      </div>`;
  }
  function answerQ(st, j, onNext) {
    if (st.locked) return;
    const q = st.qs[st.k]; const o = q.opts[j];
    st.locked = true;
    const btn = document.getElementById('o' + j);
    if (q.set) mark(q.set, q.item, o.ok);
    if (o.ok) {
      st.right++; btn.classList.add('right'); beep('ok');
      if (q.say) Speech.speak(q.say);
    } else {
      st.wrong.push(q); btn.classList.add('wrong'); beep('bad');
      const k = q.opts.findIndex((x) => x.ok); document.getElementById('o' + k).classList.add('right');
    }
    save();
    setTimeout(() => { st.locked = false; st.k++; onNext(); }, o.ok ? 900 : 1700);
  }
  function starsFor(frac) { return frac >= 0.9 ? 3 : frac >= 0.7 ? 2 : frac >= 0.4 ? 1 : 0; }
  function quizResult(p, st) {
    const total = st.qs.length; const frac = st.right / total; const stars = starsFor(frac);
    if (!st.scored) {
      st.scored = true; addStars(stars);
      if (stars >= 2) { beep('star'); confetti(); }
      if (p.task && frac >= 0.6) completeTask(p.task, 1);
    }
    const msg = stars === 3 ? L('অসাধারণ! মাশাআল্লাহ! 🎉', 'Excellent! MashaAllah! 🎉') : stars === 2 ? L('খুব ভালো! 👍', 'Very good! 👍') : stars === 1 ? L('ভালো, আরেকবার খেলি? 🙂', 'Good, play again? 🙂') : L('চলো আবার চেষ্টা করি 💪', "Let's try again 💪");
    const taskNote = p.task && frac < 0.6 ? `<p class="mute">${L(`আজকের পড়া শেষ করতে ${N(total)}টার মধ্যে অন্তত ${N(Math.ceil(total * 0.6))}টা ঠিক করতে হবে।`, `Get at least ${Math.ceil(total * 0.6)} of ${total} right to finish today's task.`)}</p>` : '';
    return `${topbar(quizTitle(p))}
    <div class="page"><div class="card result">
      <div class="big">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <h2>${msg}</h2>
      <div class="score">${N(st.right)} / ${N(total)}</div>
      ${taskNote}
      <div class="btns" style="margin-top:14px">
        ${st.wrong.length ? `<button class="btn sun" onclick="App.retryWrong()">${L('ভুলগুলো আবার', 'Retry mistakes')}</button>` : ''}
        <button class="btn sec2" onclick="App.retryQuiz()">${L('আবার খেলি', 'Play again')}</button>
      </div>
      <button class="btn block" style="margin-top:10px" onclick="App.back()">${L('ঠিক আছে', 'Done')}</button>
    </div></div>`;
  }

  // =====================================================================
  // লেখার খাতা
  // =====================================================================
  screens.write = (p, st, c) => {
    const set = p.set; const r = p.r || [0, itemsOf(set).length - 1];
    if (st.i == null) { st.i = r[0]; st.mode = st.mode || 'trace'; st.revealed = false; }
    const i = st.i; const it = itemsOf(set)[i];
    const w = Math.min(window.innerWidth - 28, 420); const h = Math.round(w * 0.78);
    const g = disp(set, it); const fs = Math.round(h * (g.length > 1 ? 0.55 : 0.75));
    const prev = i > 0 ? disp(set, itemsOf(set)[i - 1]) : null;
    let prompt;
    if (st.mode === 'trace') prompt = L(`হালকা দাগের ওপর লেখো: <span class="g ${set === 'ar' ? 'ar' : ''}">${g}</span>`, `Trace: <span class="g">${g}</span>`);
    else if (prev && i > r[0]) prompt = L(`<span class="g ${set === 'ar' ? 'ar' : ''}">${prev}</span> এর পরেরটা লেখো`, `Write what comes after <span class="g">${prev}</span>`);
    else prompt = L(`না দেখে লেখো: "${nameOf(set, it)}"`, `Write from memory: "${nameOf(set, it)}"`);
    c.after = () => { setupPad(); if (st.mode === 'trace') Speech.speak(sayOf(set, it)); };
    const n = r[1] - r[0] + 1; const pos = i - r[0] + 1;
    return `${topbar(L(`লিখি • ${setTitle(set)}`, `Write • ${setTitle(set)}`))}
    <div class="page">
      <div class="seg" style="margin-bottom:10px">
        <button class="${st.mode === 'trace' ? 'on' : ''}" onclick="App.wMode('trace')">👀 ${L('দেখে লিখি', 'Trace')}</button>
        <button class="${st.mode === 'memory' ? 'on' : ''}" onclick="App.wMode('memory')">🧠 ${L('না দেখে লিখি', 'From memory')}</button>
      </div>
      <div class="wprompt">${prompt}</div>
      <div class="pad" style="width:${w}px;height:${h}px">
        <div class="guide ${set === 'ar' ? 'ar' : ''} ${st.mode === 'memory' && st.revealed ? 'reveal' : ''}" style="font-size:${fs}px" ${st.mode === 'memory' && !st.revealed ? 'hidden' : ''}>${g}</div>
        <canvas id="pad" width="${w * 2}" height="${h * 2}"></canvas>
      </div>
      <div class="btns" style="margin-top:12px">
        <button class="btn sec2" onclick="App.padClear()">🧽 ${L('মুছি', 'Clear')}</button>
        <button class="btn sec2" onclick="App.sayItem('${set}',${i})">🔊 ${L('শুনি', 'Hear')}</button>
        ${st.mode === 'memory' && !st.revealed ? `<button class="btn sun" onclick="App.wReveal()">✔️ ${L('মিলিয়ে দেখি', 'Check')}</button>` : ''}
      </div>
      ${st.mode === 'memory' && st.revealed
        ? `<div class="btns" style="margin-top:12px"><button class="btn ok" onclick="App.wMark(1)">✅ ${L('ঠিক হয়েছে', 'Correct')}</button><button class="btn bad" onclick="App.wMark(0)">❌ ${L('হয়নি', 'Not yet')}</button></div>`
        : `<div class="btns" style="margin-top:12px"><button class="btn" onclick="App.wNext()">${i >= r[1] ? L('শেষ ✓', 'Finish ✓') : L('পরেরটা ▶', 'Next ▶')}</button></div>`}
      <div class="pg">${N(pos)} / ${N(n)}</div>
    </div>`;
  };
  function setupPad() {
    const cv = document.getElementById('pad'); if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#6c4bd8'; ctx.lineWidth = Math.max(14, cv.width / 34);
    let drawing = false; let lx = 0; let ly = 0;
    const pos = (e) => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * (cv.width / b.width), (e.clientY - b.top) * (cv.height / b.height)]; };
    cv.addEventListener('pointerdown', (e) => { drawing = true; cv.setPointerCapture(e.pointerId); [lx, ly] = pos(e); ctx.beginPath(); ctx.arc(lx, ly, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fillStyle = '#6c4bd8'; ctx.fill(); });
    cv.addEventListener('pointermove', (e) => { if (!drawing) return; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke(); lx = x; ly = y; });
    const up = () => { drawing = false; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }

  // =====================================================================
  // ছড়া
  // =====================================================================
  function rhymeLines(set, rh) {
    if (!rh.fromWords) return rh.lines.map((t) => ({ t, l: rh.lang }));
    if (set === 'en') return itemsOf('en').map((it) => ({ t: `${it.g} for ${it.words[0].w}, ${it.g} for ${it.words[1].w}`, l: 'en' }));
    return itemsOf('bn').map((it) => ({ t: `${it.g}-তে ${it.words[0].w.replace(/\s*\(.*\)/, '')}, ${it.words[1].w.replace(/\s*\(.*\)/, '')}`, l: 'bn' }));
  }
  screens.rhyme = (p, st) => {
    const set = p.set; const list = D.rhymes[set];
    const k = st.k || 0; const rh = list[k]; const lines = rhymeLines(set, rh);
    return `${topbar(L('ছড়া', 'Rhymes') + ' • ' + setTitle(set))}
    <div class="page">
      ${list.length > 1 ? `<div class="chips">${list.map((x, j) => `<button class="chip ${j === k ? 'on' : ''}" onclick="App.rhymePick(${j})">${x.title}</button>`).join('')}</div>` : ''}
      <div class="card">
        <h3 style="margin:2px 0 8px">${rh.title}</h3>${rh.note ? `<div class="mute">${rh.note}</div>` : ''}
        ${lines.map((ln, j) => `<button class="rline ${ln.l === 'en' ? 'en' : ''}" id="rl${j}" onclick="App.rhymeLine(${j})">${esc(ln.t)}</button>`).join('')}
      </div>
      <div class="btns">
        <button class="btn" onclick="App.rhymePlay()">${st.playing ? '⏸ ' + L('থামাও', 'Stop') : '▶ ' + L('পুরো ছড়া শোনো', 'Play whole rhyme')}</button>
      </div>
      ${p.task ? `<button class="btn ok block" style="margin-top:12px" onclick="App.taskDone()">✅ ${L('ছড়া বলতে পেরেছে — আজকের পড়া শেষ', 'Can say it — mark done')}</button>` : ''}
    </div>`;
  };

  // =====================================================================
  // দোয়া ও সূরা
  // =====================================================================
  screens.duas = (p) => {
    const groups = ['kalima', 'surah', 'dua'];
    const gname = { kalima: L('কালেমা', 'Kalima'), surah: L('সূরা', 'Surah'), dua: L('দৈনন্দিন দোয়া', 'Daily duas') };
    return `${topbar(L('দোয়া, সূরা ও কালেমা', 'Duas & Surahs'))}
    <div class="page">
      ${groups.map((g) => `<div class="sec">${gname[g]}</div><div class="card">${D.duas.filter((d) => d.group === g).map((d) => `
        <button class="task ${S.duaDone[d.id] ? 'done' : ''}" onclick="App.go('dua',{id:'${d.id}'})"><span class="ic">${d.icon}</span>
        <span class="grow"><span class="tl">${L(d.title, d.en)}</span><br><span class="mute">${d.when}</span></span><span class="chk">${S.duaDone[d.id] ? '✓' : ''}</span></button>`).join('')}</div>`).join('')}
      <button class="btn sun block" onclick="App.go('quiz',{mode:'dua'})">🎯 ${L('দোয়া ও সূরা খেলা', 'Dua quiz')}</button>
      ${p.task ? `<button class="btn ok block" style="margin-top:12px" onclick="App.taskDone()">✅ ${L('সবগুলো একবার করে পড়া হয়েছে', 'Reviewed all — mark done')}</button>` : ''}
    </div>`;
  };
  screens.dua = (p, st) => {
    const d = D.duas.find((x) => x.id === p.id);
    const lines = d.lines.map((l, j) => ({ l, j })).filter(({ j }) => !p.lines || (j >= p.lines[0] && j <= p.lines[1]));
    const hasAudio = d.quran;
    return `${topbar(L(d.title, d.en))}
    <div class="page ${st.hide ? 'hidemode' : ''}">
      <div class="card"><div class="row"><span style="font-size:36px">${d.icon}</span><div class="grow"><b>${L(d.title, d.en)}</b><br><span class="mute">${d.when}${d.src ? ' • ' + L('সূত্র', 'Source') + ': ' + d.src : ''}</span></div>
        ${S.duaDone[d.id] ? `<span class="badge">${L('মুখস্থ ✓', 'Memorised ✓')}</span>` : ''}</div></div>
      ${d.note ? `<div class="note">ℹ️ ${d.note}</div>` : ''}
      ${p.lines ? `<div class="note">📌 ${L('আজকের অংশ দেখানো হচ্ছে।', "Showing today's part.")} <button class="btn sm sec2" onclick="App.duaAll()">${L('পুরোটা দেখাও', 'Show all')}</button></div>` : ''}
      <div class="seg" style="margin-bottom:12px">
        <button class="${!st.hide ? 'on' : ''}" onclick="App.duaHide(0)">📖 ${L('পড়ি ও শুনি', 'Read & listen')}</button>
        <button class="${st.hide ? 'on' : ''}" onclick="App.duaHide(1)">🧠 ${L('মুখস্থ যাচাই', 'Test memory')}</button>
      </div>
      ${st.hide ? `<div class="note">🙈 ${L('লেখা ঢাকা আছে। বাবু মুখে বলবে, তারপর লাইনে ছুঁয়ে মিলিয়ে দেখবে।', 'Text is hidden. Say it aloud, then tap a line to check.')}</div>` : ''}
      ${lines.map(({ l, j }) => `<div class="dline ${l.pre ? 'pre' : ''}" id="dl${j}" onclick="App.duaReveal(${j})">
          <div class="arx hid">${l.n ? `<span class="num">${N(l.n)}</span>` : ''}${l.ar}</div>
          <div class="bnx hid">${l.bn}</div>
          <div class="mx">${L(l.m, l.me)}</div>
          ${l.extra ? `<span class="badge warn">${L('অতিরিক্ত (কিছু বইয়ে আছে)', 'Extra (in some books)')}</span>` : ''}
          <div class="acts">
            ${hasAudio && l.audio ? `<button class="btn sm sun" onclick="event.stopPropagation();App.duaPlay(${j},1)">▶ ${L('তিলাওয়াত', 'Recitation')}</button><button class="btn sm sec2" onclick="event.stopPropagation();App.duaPlay(${j},3)">🔁 ×${N(3)}</button>` : ''}
            ${!hasAudio || !l.audio ? `<button class="btn sm sun" onclick="event.stopPropagation();App.duaSpeak(${j},'ar')">🔊 ${L('আরবি', 'Arabic')}</button>` : ''}
            <button class="btn sm sec2" onclick="event.stopPropagation();App.duaSpeak(${j},'bn')">🔊 ${L('উচ্চারণ', 'Pronounce')}</button>
          </div></div>`).join('')}
      <div class="btns" style="margin-top:6px">
        ${hasAudio ? `<button class="btn" onclick="App.duaPlayAll()">▶ ${L('পুরোটা তিলাওয়াত', 'Play all')}</button>` : `<button class="btn" onclick="App.duaSpeakAll()">▶ ${L('পুরোটা শোনো', 'Play all')}</button>`}
      </div>
      <button class="btn ok block" style="margin-top:12px" onclick="App.duaMemorised()">✅ ${p.task ? L('আজকের অংশ মুখস্থ হয়েছে', "Today's part memorised") : L('মুখস্থ হয়েছে', 'Memorised')}</button>
      ${hasAudio ? `<p class="mute center">${L('কুরআনের আয়াত বাবা/মা বা হুজুরের কাছ থেকে শুদ্ধ করে শিখে নেওয়া ভালো।', 'Best to check Quran recitation with a teacher.')}</p>` : ''}
    </div>`;
  };

  // =====================================================================
  // মাসআলা
  // =====================================================================
  screens.masalaList = () => `${topbar(L('ওজু, নামাজ ও গোসলের ফরজ', 'Fard rules'))}
    <div class="page">
      ${D.masala.map((m) => `<button class="mitem" onclick="App.go('masala',{id:'${m.id}'})"><span class="e">${m.icon}</span><span class="grow"><b>${L(m.title, m.en)}</b><small>${L(`মোট ${N(m.count)}টি`, `${m.count} in total`)}</small></span><span style="font-size:22px">›</span></button>`).join('')}
      <button class="btn sun block" onclick="App.go('quiz',{mode:'masala'})">🎯 ${L('সব মাসআলা খেলা', 'Quiz all')}</button>
      <p class="mute center">${L('হানাফি মাযহাব অনুযায়ী, বাংলাদেশের প্রচলিত পাঠ্যবইয়ের মতো।', 'According to the Hanafi school, as in Bangladeshi textbooks.')}</p>
    </div>`;
  screens.masala = (p, st) => {
    const m = D.masala.find((x) => x.id === p.id);
    const sections = m.parts ? m.parts.filter((pt) => !p.part || pt.id === p.part) : [{ title: L(`${m.title} ${N(m.count)}টি`, `${m.en}: ${m.count}`), from: 0, to: m.items.length - 1 }];
    return `${topbar(L(m.title, m.en))}
    <div class="page ${st.hide ? 'hidemode' : ''}">
      <div class="card center"><div style="font-size:48px">${m.icon}</div><h2 style="margin:4px 0">${L(m.q.replace('কয়টি?', `${N(m.count)}টি`), `${m.en}: ${m.count}`)}</h2></div>
      <div class="seg" style="margin-bottom:12px">
        <button class="${!st.hide ? 'on' : ''}" onclick="App.duaHide(0)">📖 ${L('পড়ি', 'Read')}</button>
        <button class="${st.hide ? 'on' : ''}" onclick="App.duaHide(1)">🧠 ${L('মুখস্থ যাচাই', 'Test memory')}</button>
      </div>
      ${sections.map((sc) => `<div class="sec">${sc.title}</div>${m.items.slice(sc.from, sc.to + 1).map((it, k) => `
        <button class="mitem" id="mi${sc.from + k}" onclick="App.masalaTap(${sc.from + k})"><span class="n">${N(k + 1)}</span><span class="e">${it.e}</span>
        <span class="grow hid"><b>${L(it.s, it.en)}</b><small>${S.lang === 'en' ? '' : it.d}</small></span></button>`).join('')}`).join('')}
      <div class="btns"><button class="btn" onclick="App.masalaSpeak()">🔊 ${L('শুনি', 'Listen')}</button>
        <button class="btn sun" onclick="App.go('quiz',{mode:'masalaOne',id:'${m.id}'})">🎯 ${L('খেলা', 'Quiz')}</button></div>
      ${p.task ? `<button class="btn ok block" style="margin-top:12px" onclick="App.taskDone()">✅ ${L('মুখে বলতে পেরেছে — শেষ', 'Can say it — done')}</button>` : ''}
    </div>`;
  };

  // =====================================================================
  // পরিচ্ছন্নতা ও স্কুল
  // =====================================================================
  screens.clean = (p, st) => {
    const day = st.day || todayStr();
    const c = S.clean[day] || {};
    const hist = [];
    for (let k = 14; k >= 0; k--) {
      const d = new Date(); d.setDate(d.getDate() - k); const ds = todayStr(d); const x = S.clean[ds];
      const n = x ? D.clean.filter((it) => x[it.id]).length : 0;
      const sch = x && x.school ? { yes: '🏫', no: '❌', off: '🏖️' }[x.school] : '·';
      hist.push(`<div style="${ds === day ? 'outline:2px solid var(--brand)' : ''}" onclick="App.cleanDay('${ds}')"><b>${N(d.getDate())}</b>${x ? N(Math.round(n / D.clean.length * 100)) + '%' : '–'}<br>${sch}</div>`);
    }
    const score = cleanScore();
    return `${topbar(L('পরিচ্ছন্নতা ও স্কুল', 'Cleanliness & school'))}
    <div class="page">
      <div class="card center"><div class="mute">${L('গত ১৫ দিনের হিসাব', 'Last 15 days')}</div>
        <div class="row" style="justify-content:center;gap:24px;margin-top:6px">
          <div><div style="font-size:30px;font-weight:700;color:var(--ok)">${N(score.clean)}%</div><div class="mute">${L('পরিচ্ছন্নতা', 'Clean')}</div></div>
          <div><div style="font-size:30px;font-weight:700;color:var(--brand)">${N(score.present)}/${N(score.schoolDays)}</div><div class="mute">${L('স্কুলে উপস্থিত', 'At school')}</div></div>
        </div></div>
      <div class="sec">✅ ${day === todayStr() ? L('আজ', 'Today') : day} — ${L('বাবা/মা টিক দিন', 'parent ticks')}</div>
      <div class="card">${D.clean.map((it) => `<button class="ck ${c[it.id] ? 'on' : ''}" onclick="App.cleanTick('${it.id}')"><span class="e">${it.e}</span>${L(it.t, it.en)}<span class="box">${c[it.id] ? '✓' : ''}</span></button>`).join('')}</div>
      <div class="sec">🏫 ${L('আজ স্কুলে গিয়েছে?', 'Went to school today?')}</div>
      <div class="seg">
        <button class="${c.school === 'yes' ? 'on' : ''}" onclick="App.cleanSchool('yes')">🏫 ${L('হ্যাঁ', 'Yes')}</button>
        <button class="${c.school === 'no' ? 'on' : ''}" onclick="App.cleanSchool('no')">❌ ${L('না', 'No')}</button>
        <button class="${c.school === 'off' ? 'on' : ''}" onclick="App.cleanSchool('off')">🏖️ ${L('ছুটি', 'Holiday')}</button>
      </div>
      <div class="sec">📆 ${L('আগের দিনগুলো (ছুঁয়ে বদলাতে পারবেন)', 'Earlier days (tap to edit)')}</div>
      <div class="hist">${hist.join('')}</div>
      <p class="mute">${L('পরীক্ষায় পরিষ্কার-পরিচ্ছন্নতা আর নিয়মিত স্কুলে যাওয়ার জন্যও নম্বর আছে — প্রতিদিন অভ্যাস করাই আসল প্রস্তুতি।', 'Cleanliness and attendance carry marks too — daily habit is the real preparation.')}</p>
    </div>`;
  };
  function cleanScore() {
    let tot = 0; let got = 0; let present = 0; let schoolDays = 0;
    for (let k = 0; k < 15; k++) {
      const d = new Date(); d.setDate(d.getDate() - k); const x = S.clean[todayStr(d)];
      if (!x) continue;
      tot += D.clean.length; got += D.clean.filter((it) => x[it.id]).length;
      if (x.school === 'yes') { present++; schoolDays++; } else if (x.school === 'no') schoolDays++;
    }
    return { clean: tot ? Math.round(got / tot * 100) : 0, present, schoolDays };
  }

  // =====================================================================
  // মডেল টেস্ট (২০ প্রশ্ন × ৫ নম্বর = ১০০)
  // =====================================================================
  function buildTest() {
    const qs = [];
    const pickI = (s) => Math.floor(Math.random() * itemsOf(s).length);
    qs.push(qHear('num', pickI('num')), qSee('num', pickI('num')), qOrder('num', pickI('num')), qOrder('num', pickI('num')));
    qs.push(qHear('en', pickI('en')), qSee('en', pickI('en')), qWordMeaning('en', pickI('en')), qOrder('en', pickI('en')));
    qs.push(qHear('bn', pickI('bn')), qWordOf('bn', pickI('bn')), qOrder('bn', pickI('bn')), qHear('bn', pickI('bn')));
    qs.push(qHear('ar', pickI('ar')), qSee('ar', pickI('ar')), qOrder('ar', pickI('ar')));
    qs.push(qMasala('wudu'), qMasala('namaz'), qMasala('gosol'));
    qs.push(qDua(), qDua());
    return qs;
  }
  screens.test = (p, st, c) => {
    if (!st.started) {
      const hist = S.tests.slice(-6).reverse();
      return `${topbar(L('মডেল টেস্ট', 'Model test'))}
      <div class="page">
        <div class="card center"><div style="font-size:56px">📝</div><h2 style="margin:4px 0">${L('২০টি প্রশ্ন • ১০০ নম্বর', '20 questions • 100 marks')}</h2>
        <p class="mute">${L('সংখ্যা, ইংরেজি, বাংলা, আরবি, মাসআলা আর দোয়া — সব বিষয় থেকে মিলিয়ে প্রশ্ন আসবে।', 'Mixed questions from every subject.')}</p>
        <button class="btn block sun" onclick="App.testStart()">${L('পরীক্ষা শুরু 🚀', 'Start test 🚀')}</button></div>
        ${hist.length ? `<div class="sec">${L('আগের ফলাফল', 'Previous results')}</div><div class="card">${hist.map((h) => `<div class="row" style="padding:6px 0"><span class="grow">${h.d}</span><b>${N(h.score)}/${N(100)}</b></div>`).join('')}</div>` : ''}
      </div>`;
    }
    if (st.k >= st.qs.length) {
      const score = st.right * 5;
      if (!st.scored) {
        st.scored = true; S.tests.push({ d: todayStr(), score }); addStars(starsFor(score / 100) + 1); save();
        if (score >= 70) { beep('star'); confetti(40); }
        if (p.task) completeTask(p.task, 1);
      }
      const grade = score >= 80 ? 'A+' : score >= 70 ? 'A' : score >= 60 ? 'A-' : score >= 50 ? 'B' : score >= 40 ? 'C' : 'F';
      return `${topbar(L('মডেল টেস্ট', 'Model test'))}
      <div class="page"><div class="card result">
        <div class="big">${'⭐'.repeat(starsFor(score / 100))}${'☆'.repeat(3 - starsFor(score / 100))}</div>
        <div class="score">${N(score)} / ${N(100)}</div><h2>${L('গ্রেড', 'Grade')}: ${grade}</h2>
        ${st.wrong.length ? `<p class="mute">${L(`${N(st.wrong.length)}টি ভুল হয়েছে। ভুলগুলো "কঠিনগুলো আবার" খেলায় বেশি আসবে।`, `${st.wrong.length} mistakes — they'll show up more in practice.`)}</p>` : ''}
        <div class="btns">${st.wrong.length ? `<button class="btn sun" onclick="App.retryWrong()">${L('ভুলগুলো আবার', 'Retry mistakes')}</button>` : ''}<button class="btn" onclick="App.back()">${L('ঠিক আছে', 'Done')}</button></div>
      </div></div>`;
    }
    const q = st.qs[st.k];
    c.after = () => { if (q.say) setTimeout(() => Speech.speak(q.say), 250); };
    return `${topbar(L('মডেল টেস্ট', 'Model test'))}
    <div class="page">
      <div class="qtop"><div class="bar l"><i style="width:${Math.round(st.k / st.qs.length * 100)}%"></i></div><b>${N(st.k + 1)}/${N(st.qs.length)}</b></div>
      ${qCard(q)}
    </div>`;
  };

  // =====================================================================
  // মৌখিক পরীক্ষা (বাবা/মা নেবেন)
  // =====================================================================
  const ORAL = [
    { id: 'num_seq', sec: 'num', t: '১ থেকে ৫০ পর্যন্ত সোজা গুনে বলো', en: 'Count 1 to 50 in order', ref: 'seq' },
    { id: 'num_rand', sec: 'num', t: 'এলোমেলো সংখ্যা চিনে বলো', en: 'Read random numbers', flash: 'num' },
    { id: 'num_write', sec: 'num', t: 'খাতায় ১ থেকে ৫০ সোজা লেখো', en: 'Write 1–50 on paper', ref: 'seq' },
    { id: 'num_rhyme', sec: 'num', t: 'সংখ্যার ছড়া বলো', en: 'Say the number rhyme', rhyme: 'num' },
    { id: 'en_seq', sec: 'en', t: 'A থেকে Z সোজা বলো', en: 'Say A to Z', ref: 'seq' },
    { id: 'en_write', sec: 'en', t: 'খাতায় A থেকে Z মুখস্থ লেখো', en: 'Write A–Z on paper', ref: 'seq' },
    { id: 'en_rand', sec: 'en', t: 'এলোমেলো অক্ষর চিনে বলো', en: 'Read random letters', flash: 'en' },
    { id: 'en_words', sec: 'en', t: 'অক্ষর দেখে ২টি শব্দ ও অর্থ বলো (A-তে Apple মানে আপেল)', en: 'Two words with meaning per letter', flash: 'en', words: true },
    { id: 'en_rhyme', sec: 'en', t: 'ইংরেজি ছড়া বলো', en: 'Say the English rhyme', rhyme: 'en' },
    { id: 'bn_seq', sec: 'bn', t: 'অ থেকে চন্দ্রবিন্দু (ঁ) পর্যন্ত সোজা বলো', en: 'Say অ to ঁ in order', ref: 'seq' },
    { id: 'bn_write', sec: 'bn', t: 'খাতায় অ থেকে ঁ মুখস্থ লেখো', en: 'Write the letters on paper', ref: 'seq' },
    { id: 'bn_rand', sec: 'bn', t: 'এলোমেলো বর্ণ চিনে বলো', en: 'Read random letters', flash: 'bn' },
    { id: 'bn_words', sec: 'bn', t: 'বর্ণ দেখে শব্দ বলো (অ-তে অজগর)', en: 'Say a word for each letter', flash: 'bn', words: true },
    { id: 'bn_rhyme', sec: 'bn', t: 'বর্ণের ছড়া বলো', en: 'Say the letter rhyme', rhyme: 'bn' },
    { id: 'ar_seq', sec: 'ar', t: 'আলিফ থেকে ইয়া পর্যন্ত সোজা বলো', en: 'Say Alif to Ya', ref: 'seq' },
    { id: 'ar_write', sec: 'ar', t: 'খাতায় আলিফ থেকে ইয়া লেখো', en: 'Write Alif–Ya on paper', ref: 'seq' },
    { id: 'ar_rand', sec: 'ar', t: 'এলোমেলো হরফ চিনে বলো', en: 'Read random letters', flash: 'ar' },
  ].concat(D.duas.map((d) => ({ id: 'dua_' + d.id, sec: 'dua', t: `${d.title} মুখস্থ বলো`, en: `Recite ${d.en}`, dua: d.id })))
    .concat(D.masala.map((m) => ({ id: 'm_' + m.id, sec: 'masala', t: `${m.title} কয়টি ও কী কী বলো`, en: `${m.en}: how many and what`, masala: m.id })));
  const ORAL_SEC = { num: ['🔢', 'সংখ্যা', 'Numbers'], en: ['🔤', 'ইংরেজি', 'English'], bn: ['অ', 'বাংলা', 'Bangla'], ar: ['ا', 'আরবি', 'Arabic'], dua: ['🤲', 'দোয়া-কালাম', 'Duas'], masala: ['🕌', 'মাসআলা', 'Fard rules'] };
  const markIcon = (o) => (!o ? '⚪' : o.s === 2 ? '✅' : o.s === 1 ? '🟡' : '❌');
  screens.oral = (p) => {
    const tot = ORAL.length * 2; const got = ORAL.reduce((a, x) => a + (S.oral[x.id] ? S.oral[x.id].s : 0), 0);
    const cs = cleanScore();
    return `${topbar(L('মৌখিক পরীক্ষা', 'Oral exam'))}
    <div class="page">
      <div class="note">👨‍👩‍👧 ${L('বাবা/মা পরীক্ষকের মতো জিজ্ঞেস করবেন। প্রতিটায় ঢুকে বাবুর উত্তর শুনে ✅ পেরেছে / 🟡 কিছুটা / ❌ পারেনি দিন।', 'Act as the examiner. Open each item, listen and mark ✅ / 🟡 / ❌.')}</div>
      <div class="card center"><div class="mute">${L('মৌখিক প্রস্তুতি', 'Oral readiness')}</div><div style="font-size:34px;font-weight:700;color:var(--brand)">${N(Math.round(got / tot * 100))}%</div>
        <div class="bar l"><i style="width:${Math.round(got / tot * 100)}%"></i></div>
        <div class="mute" style="margin-top:6px">🧼 ${L('পরিচ্ছন্নতা', 'Clean')} ${N(cs.clean)}% • 🏫 ${L('উপস্থিতি', 'Attendance')} ${N(cs.present)}/${N(cs.schoolDays)}</div></div>
      ${Object.keys(ORAL_SEC).map((sec) => `<div class="sec">${ORAL_SEC[sec][0]} ${L(ORAL_SEC[sec][1], ORAL_SEC[sec][2])}</div><div class="card">
        ${ORAL.filter((x) => x.sec === sec).map((x) => `<button class="oitem" onclick="App.go('oralItem',{id:'${x.id}'})"><span class="s">${markIcon(S.oral[x.id])}</span><span class="grow">${L(x.t, x.en)}</span><span>›</span></button>`).join('')}</div>`).join('')}
      ${p.task ? `<button class="btn ok block" onclick="App.taskDone()">✅ ${L('আজকের মৌখিক মহড়া শেষ', "Today's oral practice done")}</button>` : ''}
    </div>`;
  };
  screens.oralItem = (p, st) => {
    const x = ORAL.find((o) => o.id === p.id);
    let helper = '';
    if (x.ref === 'seq') {
      const set = x.sec;
      helper = `<button class="btn sec2 block" onclick="App.oralRef()">${st.ref ? '🙈 ' + L('উত্তর লুকাও', 'Hide answer') : '👀 ' + L('উত্তর দেখুন (বাবা/মা)', 'Show answer (parent)')}</button>
        ${st.ref ? `<div class="grid ${set === 'num' || set === 'en' ? '' : 'c4'}" style="margin-top:10px">${itemsOf(set).map((it) => `<div class="cell ${set === 'ar' ? 'ar' : ''}" style="font-size:${set === 'ar' ? 32 : 24}px">${disp(set, it)}</div>`).join('')}</div>` : ''}`;
    } else if (x.flash) {
      helper = `<button class="btn sun block" onclick="App.go('flash',{set:'${x.flash}',words:${!!x.words},oral:'${x.id}'})">🃏 ${L('এলোমেলো কার্ড দেখাও (১০টি)', 'Show 10 random cards')}</button>`;
    } else if (x.rhyme) {
      helper = `<button class="btn sec2 block" onclick="App.go('rhyme',{set:'${x.rhyme}'})">🎵 ${L('ছড়াটা দেখুন', 'See the rhyme')}</button>`;
    } else if (x.dua) {
      helper = `<button class="btn sec2 block" onclick="App.go('dua',{id:'${x.dua}'})">📖 ${L('দোয়াটা দেখুন', 'See the dua')}</button>`;
    } else if (x.masala) {
      helper = `<button class="btn sec2 block" onclick="App.go('masala',{id:'${x.masala}'})">📖 ${L('উত্তর দেখুন', 'See the answer')}</button>`;
    }
    const o = S.oral[x.id];
    return `${topbar(L('মৌখিক পরীক্ষা', 'Oral exam'))}
    <div class="page">
      <div class="card center"><div style="font-size:44px">${ORAL_SEC[x.sec][0]}</div><h2 style="margin:6px 0">${L(x.t, x.en)}</h2>
        ${o ? `<div class="mute">${L('আগের নম্বর', 'Last mark')}: ${markIcon(o)} (${o.d})</div>` : ''}</div>
      ${helper}
      <div class="sec">${L('বাবুর উত্তর কেমন হলো?', 'How did it go?')}</div>
      <div class="marks">
        <button class="btn ok" onclick="App.oralMark(2)"><span>✅</span>${L('পেরেছে', 'Did it')}</button>
        <button class="btn sun" onclick="App.oralMark(1)"><span>🟡</span>${L('কিছুটা', 'Partly')}</button>
        <button class="btn bad" onclick="App.oralMark(0)"><span>❌</span>${L('পারেনি', 'Not yet')}</button>
      </div>
    </div>`;
  };
  // এলোমেলো কার্ড — বাবা/মা দেখাবেন, বাবু বলবে
  screens.flash = (p, st) => {
    const set = p.set;
    if (!st.list) {
      const r = p.r || [0, itemsOf(set).length - 1];
      st.list = shuffle(range(r[0], r[1])).slice(0, Math.min(10, r[1] - r[0] + 1)); st.k = 0; st.ok = 0; st.show = false;
    }
    if (st.k >= st.list.length) {
      const frac = st.ok / st.list.length;
      if (!st.scored) { st.scored = true; addStars(starsFor(frac)); if (frac >= 0.7) { beep('star'); confetti(); } }
      return `${topbar(L('এলোমেলো কার্ড', 'Flash cards'))}
      <div class="page"><div class="card result"><div class="big">${'⭐'.repeat(starsFor(frac))}${'☆'.repeat(3 - starsFor(frac))}</div>
        <div class="score">${N(st.ok)} / ${N(st.list.length)}</div>
        ${p.oral ? `<p class="mute">${L('এই ফলাফল মৌখিক পরীক্ষায় বসিয়ে দিন:', 'Save this to the oral exam:')}</p>
          <div class="marks"><button class="btn ok" onclick="App.flashToOral(2)"><span>✅</span>${L('পেরেছে', 'Did it')}</button><button class="btn sun" onclick="App.flashToOral(1)"><span>🟡</span>${L('কিছুটা', 'Partly')}</button><button class="btn bad" onclick="App.flashToOral(0)"><span>❌</span>${L('পারেনি', 'Not yet')}</button></div>` : ''}
        <div class="btns" style="margin-top:12px"><button class="btn sec2" onclick="App.flashAgain()">${L('আবার', 'Again')}</button><button class="btn" onclick="App.back()">${L('ঠিক আছে', 'Done')}</button></div>
      </div></div>`;
    }
    const i = st.list[st.k]; const it = itemsOf(set)[i];
    const ans = p.words && it.words ? it.words.map((w) => `${w.e} ${w.w}${w.m ? ' — ' + w.m : ''}`).join('<br>') : `${nameOf(set, it)}`;
    return `${topbar(L('এলোমেলো কার্ড', 'Flash cards'))}
    <div class="page">
      <p class="mute center">${p.words ? L('বাবু এই অক্ষর দিয়ে শব্দ ও অর্থ বলবে', 'Child says words for this letter') : L('বাবু দেখে নামটা বলবে', 'Child names it')} • ${N(st.k + 1)}/${N(st.list.length)}</p>
      <div class="lcard"><div class="flash ${set === 'ar' ? 'ar' : ''}">${disp(set, it)}</div>
        ${st.show ? `<div class="gname" style="font-size:20px">${ans}</div>` : `<button class="btn sm sec2" onclick="App.flashShow()">👀 ${L('উত্তর দেখুন', 'Show answer')}</button>`}
      </div>
      <div class="btns" style="margin-top:14px"><button class="btn ok" onclick="App.flashMark(1)">✅ ${L('পেরেছে', 'Right')}</button><button class="btn bad" onclick="App.flashMark(0)">❌ ${L('পারেনি', 'Wrong')}</button></div>
    </div>`;
  };

  // =====================================================================
  // সেটিংস
  // =====================================================================
  screens.settings = () => {
    const ver = window.Android && Android.appVersion ? Android.appVersion() : 'dev';
    const st = (l) => { const s = Speech.status(l); return s === 1 ? '✅' : s === 0 ? '⬇️ ' + L('ডাউনলোড দরকার', 'needs download') : s === -2 ? '…' : '❌'; };
    return `${topbar(L('সেটিংস', 'Settings'), { right: ' ' })}
    <div class="page">
      <div class="card">
        <div class="field"><label>${L('বাবুর নাম', "Child's name")}</label><input id="st-name" value="${esc(S.name)}" onchange="App.setName(this.value)"></div>
        <div class="field"><label>${L('১৫ দিনের রুটিন শুরুর তারিখ', 'Plan start date')}</label><input type="date" id="st-start" value="${S.start}" onchange="App.setStart(this.value)">
          <div class="mute">${L(`আজ রুটিনের ${N(dayIndex())} নম্বর দিন।`, `Today is day ${dayIndex()}.`)}</div></div>
        <div class="field"><label>${L('অ্যাপের ভাষা', 'App language')}</label>
          <div class="seg"><button class="${S.lang === 'bn' ? 'on' : ''}" onclick="App.setLang('bn')">বাংলা</button><button class="${S.lang === 'en' ? 'on' : ''}" onclick="App.setLang('en')">English</button></div></div>
        <div class="field"><label>${L('সংখ্যা কীভাবে দেখাবে', 'Show numbers as')}</label>
          <div class="seg"><button class="${S.digits === 'en' ? 'on' : ''}" onclick="App.setDigits('en')">1 2 3</button><button class="${S.digits === 'bn' ? 'on' : ''}" onclick="App.setDigits('bn')">১ ২ ৩</button></div></div>
        <div class="field"><label>${L('পড়ে শোনানোর গতি', 'Speech speed')}</label>
          <div class="seg">${[[0.6, L('খুব ধীরে', 'Very slow')], [0.8, L('ধীরে', 'Slow')], [1, L('স্বাভাবিক', 'Normal')]].map(([v, t]) => `<button class="${S.rate === v ? 'on' : ''}" onclick="App.setRate(${v})">${t}</button>`).join('')}</div></div>
      </div>
      <div class="card">
        <b>🔊 ${L('উচ্চারণের ভয়েস', 'Voices')}</b>
        <div class="row" style="margin-top:6px"><span class="grow">বাংলা</span><span>${st('bn')}</span></div>
        <div class="row"><span class="grow">English</span><span>${st('en')}</span></div>
        <div class="row"><span class="grow">العربية</span><span>${st('ar')}</span></div>
        <p class="mute">${L('ভয়েস না থাকলে: Google Text-to-Speech খুলে "ভয়েস ডেটা ইনস্টল" থেকে বাংলা (বাংলাদেশ) ও আরবি ডাউনলোড করুন।', 'If missing, open Google Text-to-Speech and install Bangla (Bangladesh) and Arabic voice data.')}</p>
        <div class="btns"><button class="btn sec2" onclick="App.ttsSettings()">${L('ভয়েস সেটিংস খুলুন', 'Open voice settings')}</button><button class="btn sec2" onclick="App.ttsTest()">${L('পরীক্ষা', 'Test')}</button></div>
      </div>
      <div class="card">
        <b>ℹ️ ${L('অ্যাপ সম্পর্কে', 'About')}</b>
        <p class="mute">${L('সোনামণির পাঠশালা', 'Sonamoni Pathshala')} v${esc(ver)} • ${L('ইন্টারনেট লাগে না, কোনো বিজ্ঞাপন নেই। সব তথ্য এই ফোনেই থাকে।', 'Works offline, no ads. All data stays on this phone.')}</p>
        <p class="mute">${L('দোয়া, কালেমা ও মাসআলা বাংলাদেশের প্রচলিত পাঠ্য (হানাফি) অনুযায়ী লেখা। বাবুর স্কুলের বইয়ের সাথে একবার মিলিয়ে নিন।', 'Duas and rules follow common Bangladeshi (Hanafi) textbooks — please match with the school book.')}</p>
        <button class="btn bad block" onclick="App.resetAsk()">🗑️ ${L('সব অগ্রগতি মুছে নতুন করে শুরু', 'Reset all progress')}</button>
      </div>
    </div>`;
  };

  // =====================================================================
  // বাইরের দিক থেকে ডাকার ফাংশন (onclick)
  // =====================================================================
  const App = window.App = {
    go, back, replace, openTask,
    pickDay(d) { cur().st.day = d; render(); },
    subRange(r) { cur().st.r = r; render(); },
    sayItem(set, i, full) { Speech.speak(full ? fullSay(set, i) : sayOf(set, itemsOf(set)[i])); },
    learnNav(dir) {
      const c = cur(); const r = c.p.r || [0, itemsOf(c.p.set).length - 1];
      const ni = c.st.i + dir; if (ni < r[0] || ni > r[1]) return;
      c.st.i = ni; c.st.auto = false; render();
    },
    learnDone() { const c = cur(); replace('quiz', { set: c.p.set, r: c.p.r, mode: 'mix', task: c.p.task }); },
    autoPlay() {
      const c = cur(); const r = c.p.r || [0, itemsOf(c.p.set).length - 1];
      if (c.st.auto) { c.st.auto = false; Speech.stop(); render(); return; }
      c.st.auto = true;
      const step = () => {
        if (cur() !== c || !c.st.auto) return;
        render();
        Speech.speak(fullSay(c.p.set, c.st.i), () => {
          if (cur() !== c || !c.st.auto) return;
          if (c.st.i >= r[1]) { c.st.auto = false; render(); return; }
          setTimeout(() => { if (cur() === c && c.st.auto) { c.st.i++; step(); } }, 700);
        });
      };
      step();
    },
    gridTap(set, i) {
      document.querySelectorAll('.cell.hot').forEach((x) => x.classList.remove('hot'));
      const el = document.getElementById('c' + i); if (el) el.classList.add('hot');
      Speech.speak(fullSay(set, i));
    },
    gridPlay(set, a, b) {
      const c = cur(); let i = a;
      const step = () => {
        if (cur() !== c || i > b) return;
        document.querySelectorAll('.cell.hot').forEach((x) => x.classList.remove('hot'));
        const el = document.getElementById('c' + i); if (el) { el.classList.add('hot'); el.scrollIntoView({ block: 'nearest' }); }
        Speech.speak(sayOf(set, itemsOf(set)[i]), () => { i++; setTimeout(step, 350); });
      };
      step();
    },
    qSay() { const st = cur().st; const q = st.qs[st.k]; if (q && q.say) Speech.speak(q.say); },
    answer(j) { const st = cur().st; answerQ(st, j, () => { if (cur().st === st) render(); }); },
    retryQuiz() { const c = cur(); c.st = {}; render(); },
    retryWrong() {
      const c = cur(); const wrong = c.st.wrong.map((q) => Object.assign({}, q, { opts: shuffle(q.opts) }));
      const title = c.name === 'test' ? L('মডেল টেস্ট — ভুলগুলো', 'Test — mistakes') : quizTitle(c.p);
      replace('quiz', { mode: 'retry', title, qs: wrong });
    },
    testStart() { const st = cur().st; Object.assign(st, { started: true, qs: buildTest(), k: 0, right: 0, wrong: [] }); render(); },
    taskDone() { const c = cur(); completeTask(c.p.task, 1); setTimeout(back, 700); },
    // লেখা
    padClear() { const cv = document.getElementById('pad'); if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); },
    wMode(m) { const st = cur().st; st.mode = m; st.revealed = false; render(); },
    wReveal() { cur().st.revealed = true; render(); keepPad(); },
    wMark(ok) { const c = cur(); mark(c.p.set, c.st.i, !!ok); save(); if (ok) beep('ok'); else beep('bad'); App.wNext(); },
    wNext() {
      const c = cur(); const r = c.p.r || [0, itemsOf(c.p.set).length - 1];
      S.written[statKey(c.p.set, c.st.i)] = (S.written[statKey(c.p.set, c.st.i)] || 0) + 1; save();
      if (c.st.i >= r[1]) {
        if (c.p.task) completeTask(c.p.task, 2);
        else { addStars(1); beep('star'); confetti(); }
        modal(`<h3>🎉 ${L('শেষ!', 'Finished!')}</h3><p>${c.st.mode === 'trace' ? L('এবার না দেখে লেখার চেষ্টা করবে?', 'Try writing from memory now?') : L('খুব ভালো লিখেছে!', 'Great writing!')}</p>
          <div class="btns">${c.st.mode === 'trace' ? `<button class="btn sun" onclick="App.wRestart('memory')">🧠 ${L('না দেখে লিখি', 'From memory')}</button>` : `<button class="btn sun" onclick="App.wRestart('memory')">${L('আবার', 'Again')}</button>`}<button class="btn" onclick="App.back()">${L('ঠিক আছে', 'Done')}</button></div>`);
        return;
      }
      c.st.i++; c.st.revealed = false; render();
    },
    wRestart(m) { closeModal(); const c = cur(); c.st.i = (c.p.r || [0])[0]; c.st.mode = m; c.st.revealed = false; render(); },
    // ছড়া
    rhymePick(j) { Speech.stop(); const st = cur().st; st.k = j; st.playing = false; render(); },
    rhymeLine(j) {
      const c = cur(); const rh = D.rhymes[c.p.set][c.st.k || 0]; const ln = rhymeLines(c.p.set, rh)[j];
      document.querySelectorAll('.rline.on').forEach((x) => x.classList.remove('on'));
      const el = document.getElementById('rl' + j); if (el) el.classList.add('on');
      Speech.speak([ln]);
    },
    rhymePlay() {
      const c = cur(); const st = c.st;
      if (st.playing) { st.playing = false; Speech.stop(); render(); return; }
      st.playing = true; render();
      const lines = rhymeLines(c.p.set, D.rhymes[c.p.set][st.k || 0]); let j = 0;
      const step = () => {
        if (cur() !== c || !st.playing) return;
        if (j >= lines.length) { st.playing = false; render(); return; }
        document.querySelectorAll('.rline.on').forEach((x) => x.classList.remove('on'));
        const el = document.getElementById('rl' + j); if (el) { el.classList.add('on'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        Speech.speak([lines[j]], () => { j++; setTimeout(step, 250); });
      };
      step();
    },
    // দোয়া
    duaAll() { const c = cur(); c.p = Object.assign({}, c.p, { lines: null }); render(); },
    duaHide(h) { cur().st.hide = !!h; render(); },
    duaReveal(j) {
      if (!cur().st.hide) return;
      const el = document.getElementById('dl' + j) || document.getElementById('mi' + j);
      if (el) el.querySelectorAll('.hid').forEach((x) => x.classList.toggle('hid'));
    },
    duaSpeak(j, lang) { const d = D.duas.find((x) => x.id === cur().p.id); const l = d.lines[j]; hl(j); Speech.speak([{ t: lang === 'ar' ? l.ar : l.bn, l: lang }]); },
    duaSpeakAll() {
      const c = cur(); const d = D.duas.find((x) => x.id === c.p.id);
      const js = d.lines.map((_, j) => j).filter((j) => !c.p.lines || (j >= c.p.lines[0] && j <= c.p.lines[1]));
      let k = 0;
      const step = () => {
        if (cur() !== c || k >= js.length) return; const l = d.lines[js[k]]; hl(js[k]);
        const lang = Speech.status('ar') === 1 ? 'ar' : 'bn';
        Speech.speak([{ t: lang === 'ar' ? l.ar : l.bn, l: lang }], () => { k++; setTimeout(step, 500); });
      };
      step();
    },
    duaPlay(j, times) {
      const c = cur(); const d = D.duas.find((x) => x.id === c.p.id); const l = d.lines[j]; let n = 0;
      const step = () => { if (cur() !== c || n >= times) return; n++; hl(j); Audio1.play(l.audio, () => setTimeout(step, 1200)); };
      step();
    },
    duaPlayAll() {
      const c = cur(); const d = D.duas.find((x) => x.id === c.p.id);
      const js = d.lines.map((_, j) => j).filter((j) => d.lines[j].audio && (!c.p.lines || (j >= c.p.lines[0] && j <= c.p.lines[1])));
      let k = 0;
      const step = () => { if (cur() !== c || k >= js.length) return; hl(js[k]); Audio1.play(d.lines[js[k]].audio, () => { k++; setTimeout(step, 600); }); };
      step();
    },
    duaMemorised() {
      const c = cur(); const d = D.duas.find((x) => x.id === c.p.id);
      const full = !c.p.lines || c.p.lines[1] >= d.lines.length - 1;
      if (full) S.duaDone[d.id] = todayStr();
      save();
      if (c.p.task) { completeTask(c.p.task, 2); setTimeout(back, 700); }
      else { addStars(1); beep('star'); confetti(); toast(L('মাশাআল্লাহ! ⭐', 'MashaAllah! ⭐')); render(); }
    },
    // মাসআলা
    masalaTap(k) {
      const st = cur().st;
      if (st.hide) { App.duaReveal(k); return; }
      const m = D.masala.find((x) => x.id === cur().p.id); Speech.speak([{ t: `${D.toBn(k + 1)}. ${m.items[k].s}`, l: 'bn' }]);
    },
    masalaSpeak() {
      const c = cur(); const m = D.masala.find((x) => x.id === c.p.id);
      const part = c.p.part && m.parts.find((p) => p.id === c.p.part);
      const its = part ? m.items.slice(part.from, part.to + 1) : m.items;
      const head = part ? part.title.replace('—', '') : `${m.title} ${D.toBn(m.count)}টি`;
      Speech.speak([{ t: head, l: 'bn' }].concat(its.map((it, k) => ({ t: `${D.toBn(k + 1)}. ${it.s}`, l: 'bn' }))));
    },
    // পরিচ্ছন্নতা
    cleanDay(ds) { cur().st.day = ds; render(); },
    cleanTick(id) {
      const day = cur().st.day || todayStr(); const c = S.clean[day] || (S.clean[day] = {});
      c[id] = !c[id]; save(); if (c[id]) beep('ok'); render();
    },
    cleanSchool(v) {
      const day = cur().st.day || todayStr(); const c = S.clean[day] || (S.clean[day] = {});
      c.school = c.school === v ? null : v; save(); beep('tap'); render();
    },
    // মৌখিক
    oralRef() { const st = cur().st; st.ref = !st.ref; render(); },
    oralMark(s) {
      const c = cur(); S.oral[c.p.id] = { s, d: todayStr() }; save();
      beep(s === 2 ? 'star' : s === 1 ? 'ok' : 'tap'); if (s === 2) { addStars(1); confetti(16); }
      back();
    },
    flashShow() { cur().st.show = true; render(); },
    flashMark(ok) {
      const c = cur(); const st = c.st; mark(c.p.set, st.list[st.k], !!ok);
      if (ok) { st.ok++; beep('ok'); } else beep('bad');
      save(); st.k++; st.show = false; render();
    },
    flashAgain() { cur().st = {}; render(); },
    flashToOral(s) { const c = cur(); S.oral[c.p.oral] = { s, d: todayStr() }; save(); back(); },
    // সেটিংস
    setLang(l) { S.lang = l; save(); render(); },
    setDigits(d) { S.digits = d; save(); render(); },
    setRate(r) { S.rate = r; save(); render(); Speech.speak([{ t: L('এক দুই তিন', 'one two three'), l: S.lang === 'en' ? 'en' : 'bn' }]); },
    setName(v) { S.name = v.trim().slice(0, 30); save(); },
    setStart(v) { if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { S.start = v; save(); render(); } },
    ttsSettings() { if (window.Android && Android.openTtsSettings) Android.openTtsSettings(); else toast('Android only'); },
    ttsTest() { Speech.speak([{ t: 'আসসালামু আলাইকুম। অ, আ, ক, খ।', l: 'bn' }, { t: 'A for Apple.', l: 'en' }, { t: 'أَلِف، بَاء، تَاء', l: 'ar' }]); },
    finishOnboard() {
      const el = document.getElementById('ob-name'); S.name = el ? el.value.trim().slice(0, 30) : '';
      S.onboarded = true; S.start = todayStr(); save(); beep('star'); render();
    },
    resetAsk() {
      modal(`<h3>🗑️ ${L('সত্যিই সব মুছবেন?', 'Really reset everything?')}</h3><p class="mute">${L('তারা, অগ্রগতি, টেস্টের ফলাফল সব মুছে যাবে। আবার প্রথম দিন থেকে শুরু হবে।', 'Stars, progress and results will be erased.')}</p>
        <div class="btns"><button class="btn sec2" onclick="App.closeModal()">${L('না', 'No')}</button><button class="btn bad" onclick="App.reset()">${L('হ্যাঁ, মুছুন', 'Yes, reset')}</button></div>`);
    },
    reset() { const lang = S.lang; S = defaults(); S.lang = lang; save(); closeModal(); stack.length = 0; go('home'); },
    closeModal,
    _cur: () => cur(), // শুধু পরীক্ষার জন্য
  };
  function hl(j) {
    document.querySelectorAll('.dline.on').forEach((x) => x.classList.remove('on'));
    const el = document.getElementById('dl' + j); if (el) { el.classList.add('on'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  // "মিলিয়ে দেখি" চাপলে আঁকা লেখা যেন মুছে না যায়
  let padSnap = null;
  function keepPad() {
    const cv = document.getElementById('pad');
    if (cv && padSnap) { const img = new Image(); img.onload = () => cv.getContext('2d').drawImage(img, 0, 0); img.src = padSnap; }
    padSnap = null;
  }
  const origReveal = App.wReveal;
  App.wReveal = () => { const cv = document.getElementById('pad'); padSnap = cv ? cv.toDataURL() : null; origReveal(); };


  // শুরু
  go('home');
})();
