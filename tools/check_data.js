// কনটেন্ট যাচাই: কোনো বর্ণ/সংখ্যা বাদ পড়ল কিনা, রুটিনে ভুল রেফারেন্স আছে কিনা।
// চালাতে: node tools/check_data.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '../app/src/main/assets/www/data.js'), 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const D = ctx.window.DATA;

let errors = 0;
const fail = (m) => { console.error('✗ ' + m); errors++; };
const ok = (m) => console.log('✓ ' + m);

const expect = { num: 50, numen: 50, en: 26, bn: 50, ar: 29 };
for (const [k, n] of Object.entries(expect)) {
  const items = D.sets[k].items;
  if (items.length !== n) fail(`${k}: ${n}টি থাকার কথা, আছে ${items.length}টি`);
  else ok(`${k}: ${n}টি`);
  const seen = new Set();
  items.forEach((it, i) => {
    if (!it.g) fail(`${k}[${i}] বর্ণ খালি`);
    if (seen.has(it.g)) fail(`${k}: "${it.g}" দুবার আছে`);
    seen.add(it.g);
    if (!it.say || !it.say.length) fail(`${k}[${i}] উচ্চারণ নেই`);
  });
}

// সংখ্যা ঠিক ক্রমে
D.sets.num.items.forEach((it, i) => { if (it.n !== i + 1) fail(`সংখ্যা ${i + 1} ভুল জায়গায়`); });
['এক', 'দশ', 'বিশ', 'ত্রিশ', 'চল্লিশ', 'পঞ্চাশ'].forEach((w, j) => {
  const n = j === 0 ? 1 : j * 10;
  if (D.sets.num.items[n - 1].name !== w) fail(`${n} এর নাম ${w} হওয়ার কথা`);
});
if (D.sets.numen.items[36].name !== 'thirty-seven' || D.sets.numen.items[36].say[0].l !== 'en') fail('ইংরেজি সংখ্যার সেট ভুল');
if (D.sets.num.items[36].bnDigit !== '৩৭' || D.sets.num.items[36].say[0].l !== 'bn') fail('বাংলা সংখ্যার সেট ভুল');
if (D.sets.num.items[49].en !== 'fifty' || D.sets.num.items[36].en !== 'thirty-seven') fail('ইংরেজি সংখ্যার নাম ভুল');

// বাংলা ক্রম
const BN_ORDER = 'অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ ড় ঢ় য় ৎ ং ঃ ঁ'.split(' ');
if (D.sets.bn.items.map((x) => x.g).join(' ') !== BN_ORDER.join(' ')) fail('বাংলা বর্ণের ক্রম ভুল');
else ok('বাংলা বর্ণের ক্রম ঠিক (অ … ঁ)');

const AR_ORDER = 'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن و ه ء ي'.split(' ');
if (D.sets.ar.items.map((x) => x.g).join(' ') !== AR_ORDER.join(' ')) fail('আরবি হরফের ক্রম ভুল');
else ok('আরবি হরফের ক্রম ঠিক (আলিফ … ইয়া)');

if (D.sets.en.items.map((x) => x.g).join('') !== 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') fail('ইংরেজি ক্রম ভুল');
D.sets.en.items.forEach((it) => {
  if (it.words.length !== 2) fail(`${it.g}: ২টি শব্দ থাকার কথা`);
  it.words.forEach((w) => {
    if (!w.m || !w.e) fail(`${it.g}: ${w.w} এর অর্থ/ছবি নেই`);
    if (it.g !== 'X' && w.w[0] !== it.g) fail(`${w.w} "${it.g}" দিয়ে শুরু হয়নি`);
  });
});
['bn', 'ar'].forEach((k) => D.sets[k].items.forEach((it) => {
  if (!it.words.length || !it.words[0].w || !it.words[0].e) fail(`${k} ${it.g}: শব্দ/ছবি নেই`);
  if (!it.rhyme || !it.head) fail(`${k} ${it.g}: ছড়া নেই`);
}));
D.sets.ar.items.forEach((it) => { if (!it.words[0].m || !it.words[0].p) fail(`ar ${it.g}: অর্থ/উচ্চারণ নেই`); });
ok('বাংলা ৫০টি ও আরবি ২৯টি বর্ণের ছড়া ও শব্দ আছে');

// দোয়া
const duaIds = new Set(D.duas.map((d) => d.id));
['fatiha', 'ikhlas', 'sleep', 'wake', 'toilet_in', 'toilet_out', 'kalima_tayyiba', 'kalima_shahadat', 'kalima_tawhid']
  .forEach((id) => { if (!duaIds.has(id)) fail(`দোয়া নেই: ${id}`); });
const fat = D.duas.find((d) => d.id === 'fatiha');
if (fat.lines.filter((l) => l.n).length !== 7) fail('সূরা ফাতিহায় ৭ আয়াত থাকার কথা');
const ikh = D.duas.find((d) => d.id === 'ikhlas');
if (ikh.lines.filter((l) => l.n).length !== 4) fail('সূরা ইখলাসে ৪ আয়াত থাকার কথা');
D.duas.forEach((d) => d.lines.forEach((l, i) => {
  if (!l.ar || !l.bn || !l.m) fail(`${d.id}[${i}] আরবি/উচ্চারণ/অর্থ খালি`);
  if (/[a-zA-Z]/.test(l.ar)) fail(`${d.id}[${i}] আরবিতে ইংরেজি অক্ষর`);
}));
ok(`দোয়া ও সূরা: ${D.duas.length}টি`);

// মাসআলা
const m = Object.fromEntries(D.masala.map((x) => [x.id, x]));
if (m.wudu.items.length !== 4 || m.wudu.count !== 4) fail('ওজুর ফরজ ৪টি হওয়ার কথা');
if (m.gosol.items.length !== 3 || m.gosol.count !== 3) fail('গোসলের ফরজ ৩টি হওয়ার কথা');
if (m.namaz.items.length !== 13 || m.namaz.count !== 13) fail('নামাজের ফরজ ১৩টি হওয়ার কথা');
ok('মাসআলা: ওজু ৪, গোসল ৩, নামাজ ১৩');

// রুটিন
if (D.plan.length !== 15) fail('রুটিন ১৫ দিনের হওয়ার কথা');
const covered = { num: new Set(), numen: new Set(), en: new Set(), bn: new Set(), ar: new Set() };
D.plan.forEach((day, di) => day.forEach((t) => {
  if (t.set) {
    const n = D.sets[t.set].items.length;
    if (t.r && (t.r[0] < 0 || t.r[1] >= n || t.r[0] > t.r[1])) fail(`দিন ${di + 1}: ${t.set} এর সীমা ভুল ${t.r}`);
    if (t.t === 'learn') for (let i = t.r[0]; i <= t.r[1]; i++) covered[t.set].add(i);
  }
  if (t.t === 'dua' && t.id !== 'all' && !duaIds.has(t.id)) fail(`দিন ${di + 1}: দোয়া ${t.id} নেই`);
  if (t.t === 'masala' && t.id !== 'all' && !m[t.id]) fail(`দিন ${di + 1}: মাসআলা ${t.id} নেই`);
}));
for (const k of Object.keys(covered)) {
  const n = D.sets[k].items.length;
  if (covered[k].size !== n) fail(`রুটিনে ${k} এর সব শেখানো হয়নি (${covered[k].size}/${n})`);
}
ok('১৫ দিনের রুটিনে সব সংখ্যা ও বর্ণ আছে');

const used = new Set();
D.plan.forEach((day) => day.forEach((t) => { if (t.t === 'dua') used.add(t.id); }));
D.duas.forEach((d) => { if (!used.has(d.id)) fail(`রুটিনে দোয়া ${d.title} নেই`); });

if (errors) { console.error(`\n${errors}টি সমস্যা পাওয়া গেছে`); process.exit(1); }
console.log('\nসব ঠিক আছে ✅');
