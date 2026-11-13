/* =====================================================================
   Deadline OS — countdown lock-screen studio
   Pure HTML / CSS / JS. No backend, no accounts. Data stays in your browser.
   ===================================================================== */
(() => {
'use strict';

/* ---------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const pad = (n) => String(n).padStart(2, '0');
const plural = (n, w) => (n === 1 ? w : w + 's');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* Bilingual helper: L('English', 'हिन्दी') returns the text for the language currently selected. */
let LANG = 'en';
const L = (en, hi) => (LANG === 'hi' ? hi : en);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const TAU = Math.PI * 2;
const DAY = 86400000;
const MAXT = 4.1e12; // ~ year 2099, matches the date input's max

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  keys() { try { return Object.keys(localStorage); } catch { return []; } },
};

function hexRgb(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------------
   Catalogue: themes, backgrounds, layouts, fonts, presets, devices
--------------------------------------------------------------------- */
const THEMES = {
  aurora: { n: 'Aurora', bg: ['#0a0f2c', '#1a1463', '#0c3b66'], blobs: ['#7c5cff', '#22d3ee', '#ff5cc8', '#4ade80'], accent: '#8be9fd', accent2: '#a78bfa' },
  sunset: { n: 'Sunset', bg: ['#1b0b2e', '#7b1e5a', '#ff6a3d'], blobs: ['#ff6a3d', '#ffb347', '#d946ef', '#7c3aed'], accent: '#ffd08a', accent2: '#ff8a5c' },
  ocean:  { n: 'Ocean',  bg: ['#02131f', '#05476e', '#0f9d9a'], blobs: ['#06b6d4', '#3b82f6', '#10b981', '#22d3ee'], accent: '#7ff3e4', accent2: '#38bdf8' },
  forest: { n: 'Forest', bg: ['#04120c', '#0c4a30', '#3d7a2c'], blobs: ['#22c55e', '#a3e635', '#14b8a6', '#65a30d'], accent: '#c4f27d', accent2: '#4ade80' },
  rose:   { n: 'Rose',   bg: ['#240815', '#8c1d4b', '#ff7aa8'], blobs: ['#f43f5e', '#fb7185', '#c026d3', '#fda4af'], accent: '#ffc2d9', accent2: '#fb7185' },
  ember:  { n: 'Ember',  bg: ['#120303', '#5a0f10', '#d6450f'], blobs: ['#ef4444', '#f97316', '#fbbf24', '#b91c1c'], accent: '#ffb59a', accent2: '#fb923c' },
  neon:   { n: 'Neon',   bg: ['#06000f', '#2a0a5e', '#003a45'], blobs: ['#00ffd0', '#ff2bd6', '#7c3aed', '#00b3ff'], accent: '#00ffd0', accent2: '#ff2bd6' },
  gold:   { n: 'Gold',   bg: ['#0b0904', '#2a1f07', '#68480f'], blobs: ['#f5c542', '#b8860b', '#ffedb0', '#8a5a00'], accent: '#ffd76a', accent2: '#f0a830' },
  mono:   { n: 'Mono',   bg: ['#050506', '#101014', '#1c1c22'], blobs: ['#6b7280', '#9ca3af', '#374151', '#e5e7eb'], accent: '#ffffff', accent2: '#a1a1aa' },
  paper:  { n: 'Paper',  l: true, text: '#1d1a14', bg: ['#f7f2e8', '#f0e7d6', '#e6d9bd'], blobs: ['#f59e0b', '#fb7185', '#fde68a', '#a7f3d0'], accent: '#c2410c', accent2: '#b45309' },
  cloud:  { n: 'Cloud',  l: true, text: '#17143a', bg: ['#f1f5ff', '#e3e9ff', '#fbe6f3'], blobs: ['#818cf8', '#f9a8d4', '#93c5fd', '#c4b5fd'], accent: '#4f46e5', accent2: '#7c3aed' },
};
for (const t of Object.values(THEMES)) { t.l = !!t.l; t.ink = t.l ? t.text : '#ffffff'; }
const THEME_HI = { aurora: 'ऑरोरा', sunset: 'सूर्यास्त', ocean: 'सागर', forest: 'जंगल', rose: 'गुलाबी', ember: 'अंगार', neon: 'नियॉन', gold: 'सुनहरा', mono: 'मोनो', paper: 'काग़ज़', cloud: 'बादल' };
for (const [k, t] of Object.entries(THEMES)) t.nh = THEME_HI[k];
const themeName = (k) => L(THEMES[k].n, THEMES[k].nh);

// [key, English, हिन्दी]
const BGS = [['aurora', 'Aurora', 'ऑरोरा'], ['stars', 'Stars', 'तारे'], ['waves', 'Waves', 'लहरें'], ['grid', 'Retro grid', 'रेट्रो ग्रिड'], ['dots', 'Halftone', 'हाफ़टोन'], ['minimal', 'Minimal', 'मिनिमल'], ['photo', 'My photo', 'मेरी फ़ोटो']];
const BG_KEYS = BGS.map((b) => b[0]);

// [key, English, icon, हिन्दी]
const LAYOUTS = [
  ['tiles', 'Tiles', '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>', 'टाइल्स'],
  ['ring', 'Ring', '<circle cx="12" cy="12" r="8" opacity=".35"/><path d="M12 4a8 8 0 0 1 8 8" stroke-width="3"/>', 'रिंग'],
  ['minimal', 'Minimal', '<path d="M9 7.5 12.5 5v14"/><path d="M8 19h9"/>', 'मिनिमल'],
  ['stack', 'Stack', '<path d="M3 6h5M12 6h9M3 12h5M12 12h9M3 18h5M12 18h9"/>', 'स्टैक'],
];
const LAYOUT_KEYS = LAYOUTS.map((l) => l[0]);

const EMOJI_FAM = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
// "Noto Sans Devanagari" sits right after the Latin face so Hindi text falls back to it, glyph by glyph.
const FONTS = {
  inter:   { n: 'Inter',          fam: '"Inter", "Noto Sans Devanagari", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', weights: [300, 500, 600, 700, 800] },
  grotesk: { n: 'Space Grotesk',  fam: '"Space Grotesk", "Noto Sans Devanagari", "Inter", system-ui, sans-serif',                   weights: [500, 600, 700] },
  serif:   { n: 'Fraunces',       fam: '"Fraunces", "Noto Sans Devanagari", Georgia, "Times New Roman", serif',                     weights: [500, 600, 700, 800] },
  mono:    { n: 'JetBrains Mono', fam: '"JetBrains Mono", "Noto Sans Devanagari", ui-monospace, "SFMono-Regular", Consolas, monospace', weights: [500, 600, 700, 800] },
};
const famOf = (key) => (FONTS[key] || FONTS.inter).fam + ',' + EMOJI_FAM;

// n/nh = chip name, t/tH = suggested title, q/qH = suggested motivation line (English / हिन्दी)
const PRESETS = [
  { id: 'exam',        e: '🎓', n: 'Exam',        nh: 'परीक्षा',     t: 'Final Exam',     tH: 'फ़ाइनल परीक्षा',      q: 'Small steps every day beat last-minute panic.', qH: 'रोज़ के छोटे क़दम आख़िरी वक़्त की घबराहट से बेहतर हैं।', th: 'ocean' },
  { id: 'birthday',    e: '🎂', n: 'Birthday',    nh: 'जन्मदिन',     t: 'My Birthday',    tH: 'मेरा जन्मदिन',        q: 'Another lap around the sun.',                    qH: 'सूरज के गिर्द एक और चक्कर।',                       th: 'rose' },
  { id: 'launch',      e: '🚀', n: 'Launch',      nh: 'लॉन्च',       t: 'Launch Day',     tH: 'लॉन्च का दिन',        q: 'Ship it. Then ship the next one.',               qH: 'इसे लॉन्च करो, फिर अगला।',                          th: 'aurora' },
  { id: 'trip',        e: '✈️', n: 'Trip',        nh: 'यात्रा',      t: 'Trip',           tH: 'यात्रा',              q: 'Adventure is calling.',                          qH: 'रोमांच बुला रहा है।',                               th: 'sunset' },
  { id: 'wedding',     e: '💍', n: 'Wedding',     nh: 'शादी',        t: 'Wedding Day',    tH: 'शादी का दिन',         q: 'Forever starts soon.',                           qH: 'हमेशा का साथ जल्द शुरू होगा।',                       th: 'gold' },
  { id: 'interview',   e: '💼', n: 'Interview',   nh: 'इंटरव्यू',    t: 'Big Interview',  tH: 'बड़ा इंटरव्यू',       q: 'Prepared beats nervous.',                        qH: 'तैयारी घबराहट पर भारी है।',                         th: 'mono' },
  { id: 'assignment',  e: '📚', n: 'Assignment',  nh: 'असाइनमेंट',   t: 'Assignment Due', tH: 'असाइनमेंट जमा करना',  q: 'Start now. Future you says thanks.',             qH: 'अभी शुरू करो, भविष्य का आप शुक्रिया कहेगा।',          th: 'cloud' },
  { id: 'contest',     e: '🏆', n: 'Contest',     nh: 'प्रतियोगिता', t: 'Competition',    tH: 'प्रतियोगिता',         q: 'Train hard. Show up. Win.',                      qH: 'डटकर मेहनत करो, मैदान में उतरो, जीतो।',              th: 'ember' },
  { id: 'party',       e: '🎉', n: 'Party',       nh: 'पार्टी',      t: 'Party Night',    tH: 'पार्टी की रात',       q: 'Good times are on their way.',                   qH: 'अच्छे पल आने वाले हैं।',                            th: 'neon' },
  { id: 'vacation',    e: '🏖️', n: 'Vacation',    nh: 'छुट्टी',      t: 'Vacation',       tH: 'छुट्टियाँ',           q: 'Almost time to unplug.',                         qH: 'छुट्टी का वक़्त बस आने ही वाला है।',                 th: 'ocean' },
  { id: 'festival',    e: '🎆', n: 'Festival',    nh: 'त्योहार',     t: 'Festival Day',   tH: 'त्योहार का दिन',      q: 'Joy is on its way.',                             qH: 'ख़ुशियाँ आने वाली हैं।',                            th: 'sunset' },
  { id: 'goal',        e: '💪', n: 'Goal',        nh: 'लक्ष्य',      t: 'Fitness Goal',   tH: 'फ़िटनेस लक्ष्य',      q: 'Discipline over motivation.',                    qH: 'प्रेरणा से ऊपर अनुशासन।',                           th: 'ember' },
  { id: 'anniversary', e: '❤️', n: 'Anniversary', nh: 'सालगिरह',     t: 'Anniversary',    tH: 'सालगिरह',             q: 'Love, counted in days.',                         qH: 'प्यार, दिनों में गिना हुआ।',                        th: 'rose' },
  { id: 'move',        e: '🏠', n: 'Moving',      nh: 'घर बदलना',    t: 'Moving Day',     tH: 'घर बदलने का दिन',     q: 'New place. New chapter.',                        qH: 'नई जगह, नया अध्याय।',                               th: 'forest' },
  { id: 'custom',      e: '✨', n: 'Something else', nh: 'कुछ और',   t: '',               tH: '',                    q: '',                                               qH: '',                                                th: null },
];
const presetName = (p) => L(p.n, p.nh);
const DEFAULT_TITLES = ['My big day', 'मेरा ख़ास दिन'];
const defaultTitle = () => L(DEFAULT_TITLES[0], DEFAULT_TITLES[1]);

const EMOJIS = ['🎯', '⏳', '🔥', '⭐', '🌟', '📅', '🧠', '💻', '🎬', '🎮', '⚽', '🏏', '🎵', '📖', '🧳', '🌍', '🌙', '☀️', '🍀', '👑', '🎁', '🩺', '🧪', '🎨'];

const QUOTES = {
  en: [
    'One day or day one — you decide.', 'Make every day count.', 'Small progress is still progress.',
    'The best time to start was yesterday. The next best is now.', 'You are closer than you think.',
    'Focus on the next step, not the whole staircase.', 'Dream big. Start small. Act now.',
    'Done is better than perfect.', 'Your future self is watching.', 'Consistency beats intensity.',
    'Time is the one thing you cannot save — spend it well.', 'Every expert was once a beginner.',
    'Do it for the person you will become.', 'Great things take time — and a deadline.',
    'Be so busy improving that you have no time to worry.', 'The clock is ticking. So are you.',
  ],
  hi: [
    'कभी न कभी या आज से — फ़ैसला आपका।', 'हर दिन को यादगार बनाइए।', 'छोटी प्रगति भी प्रगति है।',
    'शुरू करने का सबसे अच्छा समय कल था, दूसरा सबसे अच्छा अभी है।', 'आप सोचते हैं उससे कहीं ज़्यादा क़रीब हैं।',
    'पूरी सीढ़ी नहीं, बस अगले क़दम पर ध्यान दें।', 'बड़े सपने देखो, छोटी शुरुआत करो, अभी जुट जाओ।',
    'परफ़ेक्ट से बेहतर है पूरा करना।', 'आपका भविष्य आपको देख रहा है।', 'लगातार मेहनत जोश से बड़ी है।',
    'समय को बचाया नहीं जा सकता — इसे अच्छे से ख़र्च करें।', 'हर माहिर कभी नया सीखने वाला था।',
    'उस इंसान के लिए करो जो आप बनने वाले हैं।', 'बड़ी चीज़ों में वक़्त लगता है — और एक डेडलाइन भी।',
    'ख़ुद को निखारने में इतने व्यस्त रहो कि चिंता का वक़्त ही न मिले।', 'घड़ी चल रही है, और आप भी चलते रहिए।',
  ],
};

const DEVICES = [
  { g: 'Phones', items: [
    ['iphone16', 'iPhone 15 / 16', 1179, 2556], ['iphonepm', 'iPhone Pro Max / Plus', 1290, 2796], ['iphonese', 'iPhone SE / 8', 750, 1334],
    ['s24', 'Galaxy S24 / S23', 1080, 2340], ['s24u', 'Galaxy S24 Ultra', 1440, 3120], ['pixel', 'Pixel 8 / 9', 1080, 2400],
    ['fhd', 'Android Full HD (16:9)', 1080, 1920], ['qhd', 'Android QHD+', 1440, 3200], ['fold', 'Foldable (inner screen)', 1812, 2176] ] },
  { g: 'Tablets', items: [
    ['ipad11', 'iPad Pro 11″', 1668, 2388], ['ipad13', 'iPad Pro 13″', 2048, 2732], ['ipadmini', 'iPad mini', 1488, 2266], ['tab', 'Android tablet', 1600, 2560] ] },
  { g: 'Laptops, desktops & TVs', items: [
    ['hd', 'Laptop HD', 1366, 768], ['fhdp', 'Full HD', 1920, 1080], ['qhdp', 'QHD / 2K', 2560, 1440], ['uhd', '4K UHD', 3840, 2160],
    ['mbp14', 'MacBook Pro 14″', 3024, 1964], ['uw', 'Ultrawide 21:9', 3440, 1440], ['suw', 'Super ultrawide 32:9', 5120, 1440], ['port', 'Portrait monitor', 1080, 1920] ] },
];
const DEVICE_MAP = {};
DEVICES.forEach((g) => g.items.forEach((i) => { DEVICE_MAP[i[0]] = { n: i[1], w: i[2], h: i[3] }; }));

const MAXPX = 16777216; // browser canvas safe limit (4096²)
const MINDIM = 240, MAXDIM = 8192;
function fitSize(w, h) {
  w = clamp(Math.round(Number(w)) || MINDIM, MINDIM, 16384);
  h = clamp(Math.round(Number(h)) || MINDIM, MINDIM, 16384);
  let k = 1;
  if (w > MAXDIM || h > MAXDIM) k = Math.min(MAXDIM / w, MAXDIM / h);
  if (w * h * k * k > MAXPX) k = Math.min(k, Math.sqrt(MAXPX / (w * h)));
  return [Math.max(MINDIM, Math.floor(w * k)), Math.max(MINDIM, Math.floor(h * k))];
}

/* ---------------------------------------------------------------------
   Time maths
--------------------------------------------------------------------- */
function calDays(nowD, targetD) { // whole calendar days between two local dates (DST-safe)
  const a = Date.UTC(nowD.getFullYear(), nowD.getMonth(), nowD.getDate());
  const b = Date.UTC(targetD.getFullYear(), targetD.getMonth(), targetD.getDate());
  return Math.round((b - a) / DAY);
}
function parts(target, now, prec) {
  const diff = target - now;
  if (diff <= 0) return { done: true, ago: -diff };
  const t = Math.ceil(diff / 1000);
  const p = { done: false, diff, s: t % 60, m: Math.floor(t / 60) % 60, h: Math.floor(t / 3600) % 24, days: Math.floor(t / 86400), today: false };
  if (prec === 'days') { p.days = calDays(new Date(now), new Date(target)); p.today = p.days === 0; }
  return p;
}
function progress(d, now) {
  if (now >= d.target) return 1;
  const span = d.target - d.start;
  if (span <= 0) return 0;
  return clamp((now - d.start) / span, 0, 1);
}
function agoText(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return L('just now', 'अभी-अभी');
  if (m < 60) return L(`${m} min ago`, `${m} मिनट पहले`);
  const h = Math.floor(m / 60);
  if (h < 24) return L(`${h} ${plural(h, 'hour')} ago`, `${h} ${h === 1 ? 'घंटा' : 'घंटे'} पहले`);
  const d = Math.floor(h / 24);
  return L(`${d} ${plural(d, 'day')} ago`, `${d} दिन पहले`);
}
// Date / time formatting follows the chosen language (Hindi uses the hi-IN locale; English keeps your browser's).
const fmtCache = {};
function F() {
  if (!fmtCache[LANG]) {
    const loc = LANG === 'hi' ? 'hi-IN' : undefined;
    fmtCache[LANG] = {
      time: new Intl.DateTimeFormat(loc, { hour: 'numeric', minute: '2-digit' }),
      long: new Intl.DateTimeFormat(loc, { weekday: 'long', month: 'long', day: 'numeric' }),
      short: new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      md: new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' }),
    };
  }
  return fmtCache[LANG];
}
function clockText(date) {
  return F().time.formatToParts(date).filter((p) => p.type !== 'dayPeriod').map((p) => p.value).join('').trim();
}
function targetText(ms) {
  const d = new Date(ms), midnight = d.getHours() === 0 && d.getMinutes() === 0;
  return F().short.format(d) + (midnight ? '' : ' · ' + F().time.format(d));
}
function cardCountdown(d, now) {
  const p = parts(d.target, now, 'full');
  if (p.done) return L('Time’s up', 'समय समाप्त');
  const hms = `${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`;
  return p.days > 0 ? `${L(p.days + 'd', p.days + ' दिन')} ${hms}` : hms;
}
const titleOf = (d) => d.title.trim() || L('Untitled', 'बिना नाम');
const slug = (s) => (s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'deadline');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toLocalInput = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/* ---------------------------------------------------------------------
   State & persistence
--------------------------------------------------------------------- */
const KEY = 'deadlineos.v1';
const PHOTO_KEY = 'deadlineos.photo.';
const UI0 = { tab: 'event', theme: 'auto', lang: 'en', mock: true, device: 'auto', cw: 1080, ch: 1920, fmt: 'png', q: 92, pack: 30, view: 'preview' };
const S = { items: [], sel: null, ui: { ...UI0 } };
const photos = new Map(); // id -> HTMLImageElement
let photoVer = 0;

function clean(r) {
  if (!r || typeof r !== 'object') return null;
  const s = (v, n, def = '') => (typeof v === 'string' ? v.slice(0, n) : def);
  const one = (v, list, def) => (list.includes(v) ? v : def);
  const num = (v, a, b, def) => { v = Number(v); return Number.isFinite(v) ? clamp(v, a, b) : def; };
  const now = Date.now();
  return {
    id: /^[\w-]{3,40}$/.test(r.id || '') ? r.id : uid(),
    title: s(r.title, 60),
    emoji: Array.from(s(r.emoji, 48)).slice(0, 14).join(''),
    target: Math.round(num(r.target, 0, MAXT, now + 30 * DAY)),
    start: Math.round(num(r.start, 0, MAXT, now)),
    quote: s(r.quote, 90),
    theme: one(r.theme, Object.keys(THEMES), 'aurora'),
    bg: one(r.bg, BG_KEYS, 'aurora'),
    layout: one(r.layout, LAYOUT_KEYS, 'tiles'),
    font: one(r.font, Object.keys(FONTS), 'inter'),
    prec: one(r.prec, ['days', 'hours', 'minutes', 'full'], 'full'),
    pos: one(r.pos, ['top', 'center', 'bottom'], 'center'),
    accent: /^#[0-9a-f]{6}$/i.test(r.accent || '') ? r.accent.toLowerCase() : null,
    grain: r.grain !== false,
    bar: r.bar !== false,
    date: r.date !== false,
    size: Math.round(num(r.size, 70, 125, 100)),
    themeTouched: !!r.themeTouched,
    preset: s(r.preset, 20),
    draft: !!r.draft, // true until the user taps "Create"
    // up to 6 short steps on the way to the deadline; msAuto = generated by "Suggest", so it follows date/language changes
    milestones: (Array.isArray(r.milestones) ? r.milestones : []).slice(0, 6)
      .map((m) => ({ label: s(m && m.label, 28), at: Math.round(num(m && m.at, 0, MAXT, 0)) })).filter((m) => m.at > 0),
    msAuto: !!r.msAuto,
  };
}

/* ---- milestone suggestions: three short steps spread between today and the deadline ---- */
// [English labels, हिन्दी labels] per preset, in order (≤ 28 characters each)
const MS_LABELS = {
  generic:    [['Plan & get started', 'Halfway there', 'Final push'], ['योजना बनाकर शुरू करें', 'आधा सफ़र पूरा', 'आख़िरी ज़ोर']],
  exam:       [['Finish syllabus', 'Mock tests', 'Final revision'], ['सिलेबस पूरा करें', 'मॉक टेस्ट', 'आख़िरी रिवीज़न']],
  assignment: [['Research done', 'First draft', 'Proofread & submit'], ['रिसर्च पूरी', 'पहला ड्राफ़्ट', 'जाँचकर जमा करें']],
  launch:     [['Feature freeze', 'Beta testing', 'Go-live prep'], ['फ़ीचर फ़्रीज़', 'बीटा टेस्टिंग', 'लॉन्च की तैयारी']],
  trip:       [['Book tickets', 'Pack bags', 'Final checklist'], ['टिकट बुक करें', 'सामान पैक करें', 'आख़िरी चेकलिस्ट']],
  wedding:    [['Book the venue', 'Send invites', 'Final fittings'], ['वेन्यू बुक करें', 'निमंत्रण भेजें', 'आख़िरी फ़िटिंग']],
  interview:  [['Research company', 'Practice answers', 'Mock interview'], ['कंपनी की रिसर्च', 'जवाबों का अभ्यास', 'मॉक इंटरव्यू']],
  goal:       [['Build the habit', 'Halfway check-in', 'Final push'], ['आदत बनाएँ', 'आधे सफ़र का जायज़ा', 'आख़िरी ज़ोर']],
  contest:    [['Learn the rules', 'Practice rounds', 'Final prep'], ['नियम समझें', 'प्रैक्टिस राउंड', 'आख़िरी तैयारी']],
  birthday:   [['Plan the day', 'Send invites', 'Get the cake'], ['दिन की योजना', 'निमंत्रण भेजें', 'केक का इंतज़ाम']],
  party:      [['Pick the venue', 'Send invites', 'Final setup'], ['जगह तय करें', 'निमंत्रण भेजें', 'आख़िरी सजावट']],
  vacation:   [['Book stays', 'Plan the days', 'Pack & go'], ['ठहरने की बुकिंग', 'दिनों की योजना', 'पैक करो, चलो']],
  move:       [['Start packing', 'Book movers', 'Final walkthrough'], ['पैकिंग शुरू करें', 'मूवर्स बुक करें', 'आख़िरी जाँच']],
};
const dayStart = (ms) => { const t = new Date(ms); return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime(); };
function suggestMilestones(d) {
  const now = Date.now(), days = calDays(new Date(now), new Date(d.target));
  if (d.target <= now || days < 2) return [];
  const n = Math.min(3, days - 1);
  const fr = n === 3 ? [0.25, 0.5, 0.75] : n === 2 ? [1 / 3, 2 / 3] : [0.5];
  const idx = n === 3 ? [0, 1, 2] : n === 2 ? [0, 2] : [1];
  const set = MS_LABELS[d.preset] || MS_LABELS.generic, labels = LANG === 'hi' ? set[1] : set[0];
  const out = [], today = dayStart(now);
  fr.forEach((f, i) => {
    const at = dayStart(now + f * (d.target - now));
    if (at >= today && calDays(new Date(at), new Date(d.target)) >= 1 && !out.some((m) => m.at === at)) out.push({ label: labels[idx[i]], at });
  });
  return out;
}

function makeItem(o = {}) {
  const t = new Date(); t.setDate(t.getDate() + 30); t.setHours(9, 0, 0, 0);
  const it = clean({
    title: defaultTitle(), emoji: '🎯', target: t.getTime(), start: Date.now(), quote: '',
    theme: pick(['aurora', 'sunset', 'ocean', 'forest', 'rose', 'neon', 'gold', 'ember']),
    bg: pick(['aurora', 'stars', 'waves', 'grid', 'dots']),
    layout: 'tiles', font: 'inter', prec: 'full', pos: 'center', ...o, id: o.id || uid(),
  });
  it.milestones = suggestMilestones(it); it.msAuto = true; // every new countdown starts with a sensible timeline
  return it;
}

function loadState() {
  let data = null;
  try { data = JSON.parse(store.get(KEY) || 'null'); } catch { data = null; }
  const seen = new Set();
  const items = (data && Array.isArray(data.items) ? data.items : []).slice(0, 60).map(clean).filter((it) => {
    if (!it || seen.has(it.id)) return false;
    seen.add(it.id); return true;
  });
  if (data && data.ui && typeof data.ui === 'object') {
    const u = data.ui, one = (v, l, d) => (l.includes(v) ? v : d);
    const n = (v, a, b, d) => { v = Number(v); return Number.isFinite(v) ? clamp(Math.round(v), a, b) : d; };
    S.ui = {
      tab: one(u.tab, ['event', 'style', 'export'], UI0.tab),
      theme: one(u.theme, ['auto', 'light', 'dark'], 'auto'),
      mock: u.mock !== false,
      device: u.device === 'auto' || u.device === 'custom' || DEVICE_MAP[u.device] ? u.device : 'auto',
      cw: n(u.cw, MINDIM, 16384, UI0.cw), ch: n(u.ch, MINDIM, 16384, UI0.ch),
      fmt: one(u.fmt, ['png', 'jpg'], 'png'), q: n(u.q, 60, 100, 92),
      pack: one(Number(u.pack), [7, 14, 30, 60, 100], 30),
      view: one(u.view, ['list', 'studio', 'preview'], 'preview'),
    };
  }
  // language: saved choice, otherwise follow the browser (Hindi browsers start in Hindi)
  S.ui.lang = data && data.ui && ['en', 'hi'].includes(data.ui.lang) ? data.ui.lang : /^hi\b/i.test(navigator.language || '') ? 'hi' : 'en';
  LANG = S.ui.lang;
  if (!items.length) {
    const y = new Date().getFullYear() + 1;
    items.push(makeItem({
      title: L(`New Year ${y}`, `नया साल ${y}`), emoji: '🎆', target: new Date(y, 0, 1, 0, 0, 0).getTime(),
      quote: L('Make it count.', 'हर दिन को यादगार बनाइए।'), theme: 'aurora', bg: 'aurora', preset: 'festival',
    }));
  }
  S.items = items;
  S.sel = data && items.some((i) => i.id === data.sel) ? data.sel : items[0].id;
  // tidy orphaned photos
  const ids = new Set(items.map((i) => i.id));
  store.keys().filter((k) => k.startsWith(PHOTO_KEY) && !ids.has(k.slice(PHOTO_KEY.length))).forEach((k) => store.del(k));
  // restore photo backgrounds
  items.forEach((it) => { if (it.bg === 'photo') restorePhoto(it.id); });
}

let saveTimer = 0;
function saveNow() { clearTimeout(saveTimer); store.set(KEY, JSON.stringify({ v: 1, items: S.items, sel: S.sel, ui: S.ui })); }
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 220); }

const cur = () => S.items.find((i) => i.id === S.sel) || S.items[0];
const byId = (id) => S.items.find((i) => i.id === id);
const sortedItems = () => {
  const now = Date.now();
  return [...S.items].sort((a, b) => {
    if (a.draft !== b.draft) return a.draft ? -1 : 1; // unconfirmed drafts stay on top
    const da = a.target <= now, db = b.target <= now;
    return da !== db ? (da ? 1 : -1) : a.target - b.target;
  });
};

/* ---------------------------------------------------------------------
   Fonts
--------------------------------------------------------------------- */
const fontReady = {};
function ensureFont(key) {
  const ck = key + '|' + LANG;
  if (fontReady[ck]) return fontReady[ck];
  const f = FONTS[key] || FONTS.inter, can = document.fonts && document.fonts.load;
  const loads = f.weights.map((w) => (can ? document.fonts.load(`${w} 48px "${f.n}"`, '0123456789AaBb') : Promise.resolve()));
  // Hindi text falls back to Noto Sans Devanagari, so make sure that face is ready too
  if (LANG === 'hi' && can) [500, 600, 700, 800].forEach((w) => loads.push(document.fonts.load(`${w} 48px "Noto Sans Devanagari"`, 'दिनघंटेमिनटसेकंडआज')));
  return (fontReady[ck] = Promise.race([Promise.allSettled(loads), wait(2500)]));
}

/* ---------------------------------------------------------------------
   Canvas renderer — one function draws the preview, the live lock screen
   and every exported file, so what you see is exactly what you download.
--------------------------------------------------------------------- */
let noisePattern = null;
function getNoise(ctx) {
  if (!noisePattern) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), im = x.createImageData(256, 256), r = rng(7);
    for (let i = 0; i < im.data.length; i += 4) { const v = (r() * 255) | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0);
    noisePattern = ctx.createPattern(c, 'repeat');
  }
  return noisePattern;
}

const themeOf = (d) => THEMES[d.theme] || THEMES.aurora;

function paintBg(ctx, W, H, d, th, holder) {
  if (!holder) { drawBg(ctx, W, H, d, th); return; }
  const key = [W, H, d.id, d.theme, d.bg, d.accent || '', d.grain ? 1 : 0, d.bg === 'photo' ? photoVer : ''].join('|');
  if (holder.key !== key) {
    if (!holder.c) holder.c = document.createElement('canvas');
    holder.c.width = W; holder.c.height = H;
    drawBg(holder.c.getContext('2d'), W, H, d, th);
    holder.key = key;
  }
  ctx.drawImage(holder.c, 0, 0);
}

function drawBg(ctx, W, H, d, th) {
  const rnd = rng(hashStr(d.id + '|' + d.bg));
  const M = Math.max(W, H), m = Math.min(W, H);
  const accent = d.accent || th.accent;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const g = H >= W ? ctx.createLinearGradient(W * 0.15, 0, W * 0.85, H) : ctx.createLinearGradient(0, H * 0.1, W, H * 0.9);
  g.addColorStop(0, th.bg[0]); g.addColorStop(0.55, th.bg[1]); g.addColorStop(1, th.bg[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  let style = d.bg;
  const photo = style === 'photo' ? photos.get(d.id) : null;
  if (style === 'photo' && !photo) style = 'aurora';
  const screenMode = th.l ? 'source-over' : 'screen';

  const blob = (x, y, r, color, a, squash = 1, rot = 0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, squash);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    rg.addColorStop(0, rgba(color, a)); rg.addColorStop(0.55, rgba(color, a * 0.3)); rg.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = rg; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
  };

  ctx.globalCompositeOperation = screenMode;
  switch (style) {
    case 'aurora':
      for (let i = 0; i < 6; i++) blob(rnd() * W, rnd() * H, M * (0.3 + rnd() * 0.4), th.blobs[i % th.blobs.length], th.l ? 0.5 : 0.55, 0.4 + rnd() * 0.6, rnd() * Math.PI);
      break;
    case 'stars': {
      blob(W * (0.2 + rnd() * 0.6), H * 0.25, M * 0.5, th.blobs[0], 0.36, 0.7, rnd() * 3);
      blob(W * rnd(), H * (0.5 + rnd() * 0.4), M * 0.55, th.blobs[1], 0.28, 0.6, rnd() * 3);
      ctx.globalCompositeOperation = 'source-over';
      const n = clamp(Math.round((W * H) / 6500), 160, 1800), unit = m / 900;
      const col = th.l ? accent : '#ffffff';
      for (let i = 0; i < n; i++) {
        const x = rnd() * W, y = rnd() * H, sz = (0.5 + Math.pow(rnd(), 4) * 2.6) * unit;
        ctx.globalAlpha = th.l ? 0.25 + rnd() * 0.4 : 0.25 + rnd() * 0.75;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill();
        if (sz > 1.9 * unit) {
          const rg = ctx.createRadialGradient(x, y, 0, x, y, sz * 7);
          rg.addColorStop(0, rgba(accent, 0.38)); rg.addColorStop(1, rgba(accent, 0));
          ctx.fillStyle = rg; ctx.fillRect(x - sz * 7, y - sz * 7, sz * 14, sz * 14);
          ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.6, unit * 0.7);
          ctx.beginPath(); ctx.moveTo(x - sz * 5, y); ctx.lineTo(x + sz * 5, y); ctx.moveTo(x, y - sz * 5); ctx.lineTo(x, y + sz * 5); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'waves': {
      blob(W * 0.5, H * 0.3, M * 0.55, th.blobs[0], 0.3, 0.8, 0);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 5; i++) {
        const base = H * (0.5 + i * 0.1), amp = m * (0.035 + rnd() * 0.03);
        const fq = ((1 + rnd() * 1.6) * TAU) / W, ph = rnd() * TAU, col = th.blobs[i % th.blobs.length], step = Math.max(4, W / 160);
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W + step; x += step) ctx.lineTo(x, base + Math.sin(x * fq + ph) * amp + Math.sin(x * fq * 2.1 + ph * 1.6) * amp * 0.35);
        ctx.lineTo(W + step, H); ctx.closePath();
        const lg = ctx.createLinearGradient(0, base - amp, 0, H);
        lg.addColorStop(0, rgba(col, th.l ? 0.38 : 0.36 - i * 0.04)); lg.addColorStop(1, rgba(col, 0.03));
        ctx.fillStyle = lg; ctx.fill();
      }
      break;
    }
    case 'grid': {
      const hz = H * 0.6;
      blob(W / 2, hz, M * 0.55, accent, 0.45, 0.55, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip();
      const lg = ctx.createLinearGradient(0, hz, 0, H);
      lg.addColorStop(0, rgba(accent, 0)); lg.addColorStop(1, rgba(accent, th.l ? 0.6 : 0.65));
      ctx.strokeStyle = lg; ctx.lineWidth = Math.max(1, m / 700); ctx.beginPath();
      for (let i = -10; i <= 10; i++) { ctx.moveTo(W / 2, hz); ctx.lineTo(W / 2 + i * W * 0.2, H); }
      for (let j = 1; j <= 16; j++) { const y = hz + (H - hz) * Math.pow(j / 16, 2); ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke(); ctx.restore();
      ctx.fillStyle = rgba(accent, 0.55); ctx.fillRect(0, hz - Math.max(1, m / 900), W, Math.max(2, m / 450));
      break;
    }
    case 'dots': {
      blob(W * 0.5, H * 0.35, M * 0.6, th.blobs[0], 0.35, 0.8, 0);
      ctx.globalCompositeOperation = 'source-over';
      const sp = m / 26, fx = W * 0.5, fy = H * 0.38, maxD = Math.hypot(Math.max(fx, W - fx), Math.max(fy, H - fy));
      ctx.fillStyle = rgba(accent, th.l ? 0.34 : 0.42);
      for (let y = sp / 2, row = 0; y < H + sp; y += sp, row++) {
        for (let x = row % 2 ? sp : sp / 2; x < W + sp; x += sp) {
          const r = sp * 0.42 * Math.pow(clamp(1 - Math.hypot(x - fx, y - fy) / maxD, 0, 1), 1.1);
          if (r > 0.6) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
        }
      }
      break;
    }
    case 'minimal':
      blob(W / 2, H * 0.45, M * 0.6, th.blobs[0], 0.26, 0.9, 0);
      blob(W * 0.3, H * 0.82, M * 0.4, th.blobs[1], 0.16, 1, 0);
      break;
    case 'photo': {
      ctx.globalCompositeOperation = 'source-over';
      const iw = photo.naturalWidth || photo.width, ih = photo.naturalHeight || photo.height, ar = iw / ih, car = W / H;
      let sw, sh, sx, sy;
      if (ar > car) { sh = ih; sw = sh * car; sx = (iw - sw) / 2; sy = 0; } else { sw = iw; sh = sw / car; sx = 0; sy = (ih - sh) / 2; }
      ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, W, H);
      const sg = ctx.createLinearGradient(0, 0, 0, H);
      if (th.l) { sg.addColorStop(0, 'rgba(255,255,255,.3)'); sg.addColorStop(0.5, 'rgba(255,255,255,.5)'); sg.addColorStop(1, 'rgba(255,255,255,.4)'); }
      else { sg.addColorStop(0, 'rgba(0,0,0,.28)'); sg.addColorStop(0.5, 'rgba(0,0,0,.42)'); sg.addColorStop(1, 'rgba(0,0,0,.64)'); }
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      break;
    }
  }

  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const vg = ctx.createRadialGradient(W / 2, H / 2, m * 0.35, W / 2, H / 2, M * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, th.l ? 'rgba(90,70,40,.14)' : 'rgba(0,0,0,.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  if (d.grain) {
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = th.l ? 0.12 : 0.2;
    ctx.fillStyle = getNoise(ctx); ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/* ---- text utilities ---- */
const fontStr = (w, size, fam, italic) => `${italic ? 'italic ' : ''}${w} ${size}px ${fam}`;
// letter-spacing breaks Devanagari conjuncts, so it is switched off for Hindi
function setLS(c, px) { if ('letterSpacing' in c) c.letterSpacing = (LANG === 'hi' ? 0 : px) + 'px'; }

function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function breakWord(c, word, maxW) {
  const out = []; let cur = '';
  for (const ch of word) {
    if (cur && c.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
function wrapRaw(c, text, maxW) {
  const toks = [];
  for (const w of text.trim().split(/\s+/).filter(Boolean)) {
    if (c.measureText(w).width > maxW) toks.push(...breakWord(c, w, maxW)); else toks.push(w);
  }
  const lines = []; let line = '';
  for (const t of toks) {
    const test = line ? line + ' ' + t : t;
    if (!line || c.measureText(test).width <= maxW) line = test; else { lines.push(line); line = t; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}
function ellipsize(c, t, maxW) {
  if (c.measureText(t).width <= maxW) return t;
  const a = Array.from(t);
  while (a.length > 1 && c.measureText(a.join('') + '…').width > maxW) a.pop();
  return a.join('').trimEnd() + '…';
}
function wrapLines(c, text, maxW, maxLines) {
  const lines = wrapRaw(c, text, maxW);
  if (lines.length <= maxLines) return lines;
  const head = lines.slice(0, maxLines - 1);
  head.push(ellipsize(c, lines.slice(maxLines - 1).join(' '), maxW));
  return head;
}
function fitTitle(c, text, fam, maxW, start, min, maxLines) {
  let fs = start;
  for (;;) {
    c.font = fontStr(700, fs, fam);
    const lines = wrapRaw(c, text, maxW);
    if (lines.length <= maxLines || fs <= min) return { fs, lines: wrapLines(c, text, maxW, maxLines) };
    fs *= 0.92;
  }
}
/* tabular digits: every digit gets the same cell width, so ticking numbers never jitter */
function monoW(c, str) {
  let dw = 0;
  for (let i = 0; i < 10; i++) dw = Math.max(dw, c.measureText(String(i)).width);
  let w = 0;
  for (const ch of str) w += ch >= '0' && ch <= '9' ? dw : c.measureText(ch).width;
  return { w, dw };
}
function drawMono(c, str, x, y, align = 'center') {
  const { w, dw } = monoW(c, str);
  let px = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  for (const ch of str) {
    const cw = ch >= '0' && ch <= '9' ? dw : c.measureText(ch).width;
    c.fillText(ch, px + cw / 2, y); px += cw;
  }
}
function fitMono(c, str, weight, fam, fs, maxW) {
  c.font = fontStr(weight, fs, fam);
  const w = monoW(c, str).w;
  if (w > maxW) { fs *= maxW / w; c.font = fontStr(weight, fs, fam); }
  return fs;
}
const glow = (E, col, b) => { if (E.light) return; E.c.shadowColor = col; E.c.shadowBlur = b * E.sc; };
const noGlow = (E) => { E.c.shadowColor = 'transparent'; E.c.shadowBlur = 0; };

/* ---- foreground rows ---- */
const UNITS_N = { days: 1, hours: 2, minutes: 3, full: 4 };
// unit labels: [singular, plural] — tiles use the upper-case set, the stack layout the lower-case one
const LBL_EN = [['DAY', 'DAYS'], ['HOUR', 'HOURS'], ['MIN', 'MINS'], ['SEC', 'SECS']];
const STACK_EN = [['day', 'days'], ['hour', 'hours'], ['minute', 'minutes'], ['second', 'seconds']];
const UNITS_HI = [['दिन', 'दिन'], ['घंटा', 'घंटे'], ['मिनट', 'मिनट'], ['सेकंड', 'सेकंड']];
const unitLbl = (i, one) => (LANG === 'hi' ? UNITS_HI : LBL_EN)[i][one ? 0 : 1];
const stackLbl = (i, one) => (LANG === 'hi' ? UNITS_HI : STACK_EN)[i][one ? 0 : 1];
const numStr = (p, i) => { const v = [p.days, p.h, p.m, p.s][i]; return i === 0 ? String(v) : pad(v); };
const rawVal = (p, i) => [p.days, p.h, p.m, p.s][i];

function subText(p, prec) {
  if (prec === 'hours') return L(`${p.h} ${plural(p.h, 'hour')}`, `${p.h} ${p.h === 1 ? 'घंटा' : 'घंटे'}`);
  if (prec === 'minutes') return L(`${p.h}h ${pad(p.m)}m`, `${p.h} घंटे ${pad(p.m)} मिनट`);
  if (prec === 'full') return `${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`;
  return '';
}

function rowBadge(E) {
  const bd = E.compact ? 120 : 220;
  return { h: bd, draw(y) {
    const c = E.c, cy = y + bd / 2;
    const g = c.createRadialGradient(0, cy - bd * 0.2, bd * 0.05, 0, cy, bd * 0.55);
    g.addColorStop(0, rgba(E.accent, 0.4)); g.addColorStop(1, rgba(E.accent, 0.1));
    c.fillStyle = g; c.beginPath(); c.arc(0, cy, bd / 2, 0, TAU); c.fill();
    c.lineWidth = 3; c.strokeStyle = rgba(E.ink, 0.2); c.stroke();
    c.font = `${bd * 0.5}px ${EMOJI_FAM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = E.ink;
    c.fillText(E.d.emoji, 0, cy + bd * 0.03);
  } };
}
function rowTitle(E, text) {
  const c = E.c, start = E.wide ? 84 : 100;
  const f = fitTitle(c, text, E.fam, E.maxW, start, start * 0.55, 2), lh = f.fs * 1.12;
  return { h: f.lines.length * lh, draw(y) {
    c.font = fontStr(700, f.fs, E.fam); c.fillStyle = E.ink; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    f.lines.forEach((ln, i) => c.fillText(ln, 0, y + f.fs * 0.86 + i * lh));
  } };
}
function rowDate(E) {
  const fs = E.wide ? 34 : 40, c = E.c, txt = targetText(E.d.target);
  return { h: fs * 1.25, draw(y) {
    c.font = fontStr(500, fs, E.fam); c.fillStyle = rgba(E.ink, 0.68); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(ellipsize(c, txt, E.maxW), 0, y + fs * 0.9);
  } };
}
function rowMessage(E, big, sub) {
  const c = E.c;
  let fs = (E.wide ? 150 : 190) * (E.compact ? 0.8 : 1);
  c.font = fontStr(800, fs, E.fam);
  const w0 = c.measureText(big).width;
  if (w0 > E.maxW) { fs *= E.maxW / w0; c.font = fontStr(800, fs, E.fam); }
  const subFs = E.wide ? 44 : 52;
  return { h: fs * 0.92 + (sub ? 36 + subFs : 0), draw(y) {
    c.font = fontStr(800, fs, E.fam);
    const w = c.measureText(big).width, g = c.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, E.ink); g.addColorStop(1, E.accent);
    c.fillStyle = g; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    glow(E, rgba(E.accent, 0.5), 40); c.fillText(big, 0, y + fs * 0.76); noGlow(E);
    if (sub) { c.font = fontStr(500, subFs, E.fam); c.fillStyle = rgba(E.ink, 0.7); c.fillText(sub, 0, y + fs * 0.92 + 36 + subFs * 0.8); }
  } };
}
function drawTile(E, x, y, w, h, str, label) {
  const c = E.c;
  rr(c, x, y, w, h, Math.min(46, w * 0.14));
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, rgba(E.ink, E.light ? 0.08 : 0.17)); g.addColorStop(1, rgba(E.ink, E.light ? 0.03 : 0.05));
  c.fillStyle = g; c.fill();
  c.lineWidth = 2.5; c.strokeStyle = rgba(E.ink, E.light ? 0.15 : 0.22); c.stroke();
  const fs = fitMono(c, str, 700, E.fam, h * 0.46, w * 0.84);
  c.fillStyle = E.ink; glow(E, rgba(E.accent, 0.45), 34);
  drawMono(c, str, x + w / 2, y + h * 0.6, 'center'); noGlow(E);
  const lf = Math.max(20, h * 0.085);
  c.font = fontStr(600, lf, E.fam); setLS(c, lf * 0.16); c.fillStyle = E.accent; c.textAlign = 'center';
  c.fillText(label, x + w / 2 + lf * 0.08, y + h * 0.855); setLS(c, 0);
  return fs;
}
function rowTiles(E, p) {
  const n = UNITS_N[E.d.prec], gap = 30;
  let cols, tw, th;
  if (E.wide) { cols = n; tw = n === 1 ? 520 : Math.min(320, (E.maxW - gap * (n - 1)) / n); th = n === 1 ? 380 : 300; }
  else {
    cols = n === 1 ? 1 : n === 3 ? 3 : 2;
    tw = n === 1 ? 560 : (E.maxW - gap * (cols - 1)) / cols;
    th = n === 1 ? 420 : cols === 3 ? 300 : 330;
  }
  if (E.compact) th = Math.round(th * (E.wide ? 0.8 : 0.72)); // make room for the milestone timeline
  const nRows = Math.ceil(n / cols);
  return { h: nRows * th + (nRows - 1) * gap, draw(y) {
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), ci = i % cols, inRow = Math.min(cols, n - r * cols);
      const rowW = inRow * tw + (inRow - 1) * gap;
      drawTile(E, -rowW / 2 + ci * (tw + gap), y + r * (th + gap), tw, th, numStr(p, i), unitLbl(i, rawVal(p, i) === 1));
    }
  } };
}
function rowRing(E, p) {
  const c = E.c, D = (E.wide ? 400 : 720) * (E.compact ? 0.78 : 1), sub = subText(p, E.d.prec), subFs = E.wide ? 54 : 66;
  return { h: D + (sub ? 40 + subFs : 0), draw(y) {
    const cy = y + D / 2, lw = D * 0.055, r = D / 2 - lw / 2 - D * 0.01;
    c.lineWidth = lw; c.lineCap = 'round';
    c.beginPath(); c.arc(0, cy, r, 0, TAU); c.strokeStyle = rgba(E.ink, E.light ? 0.12 : 0.13); c.stroke();
    if (E.prog > 0.003) {
      const g = c.createLinearGradient(-r, cy - r, r, cy + r);
      g.addColorStop(0, E.accent); g.addColorStop(1, E.accent2);
      c.strokeStyle = g; glow(E, rgba(E.accent, 0.55), 30);
      c.beginPath(); c.arc(0, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * E.prog); c.stroke(); noGlow(E);
    }
    c.lineCap = 'butt';
    const str = String(p.days), fs = fitMono(c, str, 800, E.fam, D * 0.36, D * 0.58);
    c.fillStyle = E.ink; glow(E, rgba(E.accent, 0.4), 30);
    drawMono(c, str, 0, cy + fs * 0.22, 'center'); noGlow(E);
    const lf = D * 0.055;
    c.font = fontStr(600, lf, E.fam); setLS(c, lf * 0.2); c.fillStyle = E.accent; c.textAlign = 'center';
    c.fillText(unitLbl(0, p.days === 1), lf * 0.1, cy + fs * 0.22 + lf * 1.8); setLS(c, 0);
    if (sub) {
      c.font = fontStr(600, subFs, E.fam); c.fillStyle = rgba(E.ink, 0.9);
      drawMono(c, sub, 0, y + D + 40 + subFs * 0.8, 'center');
    }
  } };
}
function rowMinimal(E, p) {
  const c = E.c, sub = subText(p, E.d.prec), subFs = E.wide ? 56 : 68, lf = E.wide ? 44 : 52;
  const str = String(p.days);
  c.font = fontStr(800, 10, E.fam);
  const fs = fitMono(c, str, 800, E.fam, (E.wide ? 380 : 540) * (E.compact ? 0.78 : 1), E.maxW * 0.92);
  const numH = fs * 0.74;
  return { h: numH + 34 + lf + (sub ? 34 + subFs : 0), draw(y) {
    const g = c.createLinearGradient(0, y, 0, y + numH);
    g.addColorStop(0, E.ink); g.addColorStop(1, mix(E.ink, E.accent, 0.6));
    c.font = fontStr(800, fs, E.fam); c.fillStyle = g; glow(E, rgba(E.accent, 0.35), 50);
    drawMono(c, str, 0, y + numH, 'center'); noGlow(E);
    c.font = fontStr(600, lf, E.fam); setLS(c, lf * 0.3); c.fillStyle = E.accent; c.textAlign = 'center';
    c.fillText(L(p.days === 1 ? 'DAY TO GO' : 'DAYS TO GO', 'दिन बाकी'), lf * 0.15, y + numH + 34 + lf * 0.85); setLS(c, 0);
    if (sub) {
      c.font = fontStr(600, subFs, E.fam); c.fillStyle = rgba(E.ink, 0.88);
      drawMono(c, sub, 0, y + numH + 34 + lf + 34 + subFs * 0.8, 'center');
    }
  } };
}
function rowStack(E, p) {
  const c = E.c, n = UNITS_N[E.d.prec];
  const items = [];
  for (let i = 0; i < n; i++) items.push({ s: numStr(p, i), lab: stackLbl(i, rawVal(p, i) === 1) });
  if (E.wide) { // landscape screens: one wide poster row instead of a tall column
    const cw = Math.min(340, E.maxW / n), lf = 46;
    let fs = (n > 2 ? 230 : 300) * (E.compact ? 0.8 : 1), nw = 0;
    c.font = fontStr(800, fs, E.fam);
    items.forEach((it) => { nw = Math.max(nw, monoW(c, it.s).w); });
    if (nw > cw * 0.78) fs *= (cw * 0.78) / nw;
    const numH = fs * 0.74;
    return { h: numH + 24 + lf, draw(y) {
      items.forEach((it, i) => {
        const cx = -(n * cw) / 2 + cw * (i + 0.5);
        c.font = fontStr(800, fs, E.fam); c.fillStyle = rgba(E.ink, [1, 0.85, 0.7, 0.55][i]);
        if (i === 0) glow(E, rgba(E.accent, 0.4), 36);
        drawMono(c, it.s, cx, y + numH, 'center'); noGlow(E);
        c.font = fontStr(600, lf, E.fam); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillStyle = i === 0 ? E.accent : rgba(E.ink, 0.6);
        c.fillText(it.lab, cx, y + numH + 24 + lf * 0.8);
      });
    } };
  }
  let fs = (E.wide ? (n > 2 ? 100 : 150) : n > 2 ? 160 : 210) * (E.compact ? 0.78 : 1), numW = 0, labW = 0, gap = 0;
  for (let k = 0; k < 4; k++) {
    c.font = fontStr(800, fs, E.fam); numW = 0;
    items.forEach((it) => { numW = Math.max(numW, monoW(c, it.s).w); });
    c.font = fontStr(600, fs * 0.36, E.fam); labW = 0;
    items.forEach((it) => { labW = Math.max(labW, c.measureText(it.lab).width); });
    gap = fs * 0.22;
    const tot = numW + gap + labW;
    if (tot <= E.maxW) break;
    fs *= (E.maxW / tot) * 0.98;
  }
  const lh = fs * 1.02, tot = numW + gap + labW, x0 = -tot / 2;
  return { h: n * lh, draw(y) {
    items.forEach((it, i) => {
      const base = y + i * lh + fs * 0.8, a = [1, 0.82, 0.66, 0.5][i];
      c.font = fontStr(800, fs, E.fam); c.fillStyle = rgba(E.ink, a);
      if (i === 0) glow(E, rgba(E.accent, 0.4), 36);
      drawMono(c, it.s, x0 + numW, base, 'right'); noGlow(E);
      c.font = fontStr(600, fs * 0.36, E.fam); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillStyle = i === 0 ? E.accent : rgba(E.ink, 0.6);
      c.fillText(it.lab, x0 + numW + gap, base);
    });
  } };
}
function rowProgress(E, p) {
  const c = E.c, w = Math.min(E.maxW, E.wide ? 900 : 700), bh = 16, fs = E.wide ? 30 : 34;
  const pct = p.done ? 100 : Math.floor(E.prog * 100);
  // milestone markers sit on the bar at the point in time they fall
  const d = E.d, span = d.target - d.start;
  const marks = span > 0 ? (d.milestones || []).map((m) => ({ f: (m.at - d.start) / span, days: calDays(new Date(E.now), new Date(m.at)) })).filter((m) => m.f > 0.01 && m.f < 0.99) : [];
  return { h: E.compact ? bh + 12 : bh + 22 + fs, draw(y) {
    rr(c, -w / 2, y, w, bh, bh / 2); c.fillStyle = rgba(E.ink, E.light ? 0.13 : 0.15); c.fill();
    const fw = p.done ? w : Math.max(E.prog > 0 ? bh : 0, w * E.prog);
    if (fw > 0) {
      const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, E.accent); g.addColorStop(1, E.accent2);
      rr(c, -w / 2, y, fw, bh, bh / 2); c.fillStyle = g; glow(E, rgba(E.accent, 0.5), 22); c.fill(); noGlow(E);
    }
    marks.forEach((m) => { // filled = reached · bright = today · hollow = still ahead
      const x = -w / 2 + w * m.f, cy = y + bh / 2;
      c.beginPath(); c.arc(x, cy, bh * 0.85, 0, TAU);
      c.fillStyle = m.days < 0 ? E.accent : m.days === 0 ? E.ink : rgba(E.th.bg[0], 0.92); c.fill();
      c.lineWidth = 4; c.strokeStyle = E.accent; c.stroke();
    });
    if (E.compact) return; // the milestone list below tells the story, so the % line is dropped
    c.font = fontStr(500, fs, E.fam); c.fillStyle = rgba(E.ink, 0.62); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(p.done ? L('Completed', 'पूरा हुआ') : L(`${pct}% of the way there`, `${pct}% सफ़र पूरा`), 0, y + bh + 22 + fs * 0.85);
  } };
}

/* ---- milestones: a short, ordered timeline ending at the deadline ---- */
function milestoneItems(d, now) {
  const all = (d.milestones || []).filter((m) => m.at <= d.target).sort((a, b) => a.at - b.at).map((m) => { // a step can't fall after the deadline
    const days = calDays(new Date(now), new Date(m.at));
    return { label: m.label.trim() || L('Milestone', 'माइलस्टोन'), at: m.at, days, state: days < 0 ? 'done' : days === 0 ? 'today' : 'next' };
  });
  if (!all.length) return [];
  // show up to 3: the next ones ahead, topped up with the latest finished ones for context
  const up = all.filter((m) => m.state !== 'done').slice(0, 3), dn = all.filter((m) => m.state === 'done');
  const shown = [...dn.slice(Math.max(0, dn.length - (3 - up.length))), ...up];
  const tdays = calDays(new Date(now), new Date(d.target));
  shown.push({ label: L('Deadline', 'डेडलाइन'), at: d.target, days: tdays, state: now >= d.target ? 'done' : tdays === 0 ? 'today' : 'next', isEnd: true });
  return shown;
}
function msRight(m) {
  if (m.state === 'done') return m.isEnd ? L('Done', 'पूरा') : F().md.format(new Date(m.at));
  if (m.state === 'today') return L('Today', 'आज');
  return `${F().md.format(new Date(m.at))} · ${L(m.days + 'd', m.days + ' दिन')}`;
}
function rowMilestones(E, items) {
  const c = E.c, fs = E.wide ? 36 : 44, rh = E.wide ? 56 : 80, w = E.wide ? 900 : E.maxW;
  const x0 = -w / 2, iconX = x0 + 24, textX = x0 + 72, r = 16;
  const icon = (m, cx, cy) => {
    if (m.isEnd) { // the deadline itself: a diamond
      c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4); rr(c, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, 4);
      c.fillStyle = m.state === 'done' ? rgba(E.accent, 0.55) : E.accent; glow(E, rgba(E.accent, 0.6), 20); c.fill(); noGlow(E); c.restore(); return;
    }
    c.beginPath(); c.arc(cx, cy, r, 0, TAU);
    if (m.state === 'done') {
      c.fillStyle = rgba(E.accent, 0.5); c.fill();
      c.strokeStyle = E.ink; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(cx - 6.5, cy + 1); c.lineTo(cx - 1.5, cy + 6); c.lineTo(cx + 7, cy - 5.5); c.stroke(); c.lineCap = 'butt';
    } else if (m.state === 'today') {
      c.fillStyle = E.accent; glow(E, rgba(E.accent, 0.8), 26); c.fill(); noGlow(E);
      c.beginPath(); c.arc(cx, cy, r + 9, 0, TAU); c.strokeStyle = rgba(E.accent, 0.55); c.lineWidth = 3; c.stroke();
    } else {
      c.fillStyle = rgba(E.th.bg[0], 0.92); c.fill(); c.strokeStyle = E.accent; c.lineWidth = 4; c.stroke();
    }
  };
  return { h: items.length * rh, draw(y) {
    if (items.length > 1) { c.strokeStyle = rgba(E.ink, 0.24); c.lineWidth = 3; c.beginPath(); c.moveTo(iconX, y + rh / 2); c.lineTo(iconX, y + rh * (items.length - 0.5)); c.stroke(); }
    items.forEach((m, i) => {
      const cy = y + i * rh + rh / 2, base = cy + fs * 0.34, strong = m.state === 'today' || m.isEnd, done = m.state === 'done';
      icon(m, iconX, cy);
      const right = msRight(m);
      c.font = fontStr(500, fs * 0.86, E.fam); c.textAlign = 'right'; c.textBaseline = 'alphabetic';
      c.fillStyle = done ? rgba(E.ink, 0.5) : strong ? E.accent : rgba(E.ink, 0.72);
      c.fillText(right, x0 + w, base);
      const rw = c.measureText(right).width;
      c.font = fontStr(strong ? 700 : 600, fs, E.fam); c.textAlign = 'left';
      const label = ellipsize(c, m.label, w - 72 - rw - 28);
      c.fillStyle = done ? rgba(E.ink, 0.5) : strong ? E.ink : rgba(E.ink, 0.92);
      c.fillText(label, textX, base);
      if (done && !m.isEnd) { const lw = c.measureText(label).width; c.fillStyle = rgba(E.ink, 0.5); c.fillRect(textX, cy - 1.5, lw, 3); }
    });
  } };
}
function rowQuote(E) {
  const c = E.c, fs = E.wide ? 38 : 44, lh = fs * 1.4;
  c.font = fontStr(400, fs, E.fam, true);
  const lines = wrapLines(c, E.d.quote.trim(), E.maxW * 0.9, E.wide ? 2 : 3);
  return { h: lines.length * lh, draw(y) {
    c.font = fontStr(400, fs, E.fam, true); c.fillStyle = rgba(E.ink, 0.74); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    lines.forEach((ln, i) => c.fillText(ln, 0, y + fs * 1.02 + i * lh));
  } };
}

/* ---- lock-screen mock-up (preview + live lock only; never exported) ---- */
function drawMock(E) {
  const c = E.c, date = new Date(E.now), dateStr = F().long.format(date), timeStr = clockText(date);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = E.ink;
  if (!E.wide) {
    c.globalAlpha = 0.88; c.font = fontStr(500, 48, E.fam); c.fillText(dateStr, 500, 190); c.globalAlpha = 1;
    const fs = fitMono(c, timeStr, 600, E.fam, 260, 800);
    drawMono(c, timeStr, 500, 190 + 44 + fs * 0.72, 'center');
    for (const sx of [-1, 1]) {
      const cx = 500 + sx * 340, cy = 1800;
      c.beginPath(); c.arc(cx, cy, 74, 0, TAU); c.fillStyle = rgba(E.ink, 0.16); c.fill();
      c.strokeStyle = rgba(E.ink, 0.92); c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
      if (sx < 0) { rr(c, cx - 14, cy - 8, 28, 40, 7); c.stroke(); c.beginPath(); c.moveTo(cx - 9, cy - 8); c.lineTo(cx - 14, cy - 28); c.lineTo(cx + 14, cy - 28); c.lineTo(cx + 9, cy - 8); c.stroke(); }
      else { rr(c, cx - 30, cy - 18, 60, 42, 10); c.stroke(); c.beginPath(); c.arc(cx, cy + 3, 10, 0, TAU); c.stroke(); }
    }
    rr(c, 500 - 170, 1866, 340, 12, 6); c.fillStyle = rgba(E.ink, 0.7); c.fill();
  } else {
    c.globalAlpha = 0.88; c.font = fontStr(500, 30, E.fam); c.fillText(dateStr, 800, 46); c.globalAlpha = 1;
    const fs = fitMono(c, timeStr, 600, E.fam, 84, 560);
    drawMono(c, timeStr, 800, 46 + 14 + fs * 0.74, 'center');
  }
}

/* ---- the one render function ---- */
function render(ctx, W, H, d, now, o = {}) {
  const th = themeOf(d);
  paintBg(ctx, W, H, d, th, o.bgCache);
  const wide = W / H >= 0.9;
  const DW = wide ? 1600 : 1000, DH = wide ? 900 : 1900;
  const s0 = Math.min(W / DW, H / DH), ox = (W - DW * s0) / 2, oy = (H - DH * s0) / 2;
  const accent = d.accent || th.accent;
  const E = {
    c: ctx, d, th, now, wide, DW, DH, s0, sc: s0, ink: th.ink, light: th.l, accent,
    accent2: d.accent ? mix(d.accent, th.accent2, 0.5) : th.accent2,
    fam: famOf(d.font), maxW: wide ? 1380 : 880, prog: progress(d, now),
  };
  ctx.save();
  ctx.translate(ox, oy); ctx.scale(s0, s0);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  if (o.mock) drawMock(E);

  const p = parts(d.target, now, d.prec), rows = [];
  const msItems = milestoneItems(d, now);
  E.compact = msItems.length > 0; // with milestones on screen everything else tightens up a little
  const add = (gap, row) => rows.push({ gap: gap * (E.compact ? 0.72 : 1), ...row });
  const emoji = d.emoji.trim();
  if (!wide && emoji) add(0, rowBadge(E));
  add(rows.length ? 36 : 0, rowTitle(E, (wide && emoji ? emoji + '  ' : '') + titleOf(d)));
  if (d.date) add(16, rowDate(E));
  let cd;
  if (p.done) cd = rowMessage(E, L('Time’s up!', 'समय समाप्त!'), L('Ended ' + agoText(p.ago), agoText(p.ago) + ' समाप्त हुआ'));
  else if (p.today) {
    const t = new Date(d.target), midnight = t.getHours() === 0 && t.getMinutes() === 0;
    cd = rowMessage(E, L('Today', 'आज'), midnight ? L('is the day', 'आज ही वह दिन है') : L('at ' + F().time.format(t), F().time.format(t) + ' बजे'));
  }
  else if (d.layout === 'ring') cd = rowRing(E, p);
  else if (d.layout === 'minimal') cd = rowMinimal(E, p);
  else if (d.layout === 'stack') cd = rowStack(E, p);
  else cd = rowTiles(E, p);
  add(d.date ? 70 : 60, cd);
  if (d.bar) add(64, rowProgress(E, p));
  if (msItems.length) add(d.bar ? 44 : 60, rowMilestones(E, msItems));
  if (d.quote.trim()) add(d.bar ? 48 : 60, rowQuote(E));

  const total = rows.reduce((a, r, i) => a + r.h + (i ? r.gap : 0), 0);
  const top = wide ? 170 : 480, bottom = wide ? 870 : 1695, regionH = bottom - top;
  const k = Math.min(d.size / 100, regionH / total);
  const bh = total * k;
  const y0 = d.pos === 'top' ? top : d.pos === 'bottom' ? bottom - bh : top + (regionH - bh) / 2;
  E.sc = s0 * k;
  ctx.translate(DW / 2, y0); ctx.scale(k, k);
  let y = 0;
  rows.forEach((r, i) => { if (i) y += r.gap; r.draw(y); y += r.h; });
  ctx.restore();
}

/* ---------------------------------------------------------------------
   Photo backgrounds
--------------------------------------------------------------------- */
function restorePhoto(id) {
  const url = store.get(PHOTO_KEY + id);
  if (!url) return;
  const img = new Image();
  img.onload = () => { photos.set(id, img); photoVer++; drawAll(); syncPhotoUi(); };
  img.src = url;
}
function loadPhotoFile(file) {
  const d = cur();
  if (!file || !file.type.startsWith('image/')) { toast(L('Please choose an image file.', 'कृपया कोई इमेज फ़ाइल चुनें।')); return; }
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const long = Math.max(img.naturalWidth, img.naturalHeight), k = Math.min(1, 1600 / long);
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    let dataUrl = '';
    try { dataUrl = c.toDataURL('image/jpeg', 0.84); } catch { dataUrl = ''; }
    const ph = new Image();
    ph.onload = () => {
      photos.set(d.id, ph); photoVer++;
      const saved = dataUrl && store.set(PHOTO_KEY + d.id, dataUrl);
      update({ bg: 'photo' }, { sync: true });
      toast(saved ? L('Photo added.', 'फ़ोटो जुड़ गई।') : L('Photo added — it is too large to keep after you close this tab.', 'फ़ोटो जुड़ गई — लेकिन बहुत बड़ी होने से टैब बंद करने पर नहीं बचेगी।'));
    };
    ph.src = dataUrl || c.toDataURL('image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast(L('That image could not be opened.', 'यह इमेज खुल नहीं सकी।')); };
  img.src = url;
}
function copyPhoto(fromId, toId) {
  if (photos.has(fromId)) photos.set(toId, photos.get(fromId));
  const raw = store.get(PHOTO_KEY + fromId);
  if (raw) store.set(PHOTO_KEY + toId, raw);
}

/* ---------------------------------------------------------------------
   Toasts
--------------------------------------------------------------------- */
const toastEl = $('#toast');
let toastTimer = 0;
function toast(msg, opt = {}) {
  clearTimeout(toastTimer);
  toastEl.textContent = '';
  toastEl.append(el('span', '', msg));
  if (opt.action) {
    const b = el('button', '', opt.action.label); b.type = 'button';
    b.addEventListener('click', () => { hideToast(); opt.action.fn(); });
    toastEl.append(b);
  }
  toastEl.hidden = false;
  toastEl.style.animation = 'none'; void toastEl.offsetWidth; toastEl.style.animation = '';
  toastTimer = setTimeout(hideToast, opt.ms || 3200);
}
function hideToast() { toastEl.hidden = true; }

/* ---------------------------------------------------------------------
   Sharing / clipboard / download helpers
--------------------------------------------------------------------- */
function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s), bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function shareUrl(d) {
  const o = { ...d }; delete o.id; delete o.draft;
  if (o.bg === 'photo') o.bg = 'aurora'; // photos are private and never leave this device
  return location.href.split('#')[0] + '#d=' + b64urlEncode(JSON.stringify(o));
}
function importFromHash() {
  const m = /^#d=([A-Za-z0-9_\-+/=]+)$/.exec(location.hash);
  if (!m) return false;
  try {
    const raw = JSON.parse(b64urlDecode(m[1]));
    const it = clean({ ...raw, id: undefined, start: Date.now(), draft: false });
    if (!it) return false;
    it.title = it.title || L('Shared countdown', 'शेयर किया गया काउंटडाउन');
    S.items.unshift(it); S.sel = it.id; saveNow();
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  } catch { return false; }
}
async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.append(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}
async function copyLink() {
  const ok = await copyText(shareUrl(cur()));
  if (!ok) { toast(L('Could not copy automatically.', 'अपने-आप कॉपी नहीं हो सका।')); return; }
  toast(location.protocol === 'file:'
    ? L('Link copied — it opens once this app is hosted online.', 'लिंक कॉपी हो गया — यह तभी खुलेगा जब ऐप ऑनलाइन होस्ट होगा।')
    : L('Link copied — anyone can open this countdown.', 'लिंक कॉपी हो गया — कोई भी इस काउंटडाउन को खोल सकता है।'));
}
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/* ---- export ---- */
function screenPx() {
  const dpr = window.devicePixelRatio || 1;
  let w = Math.round((screen.width || innerWidth) * dpr), h = Math.round((screen.height || innerHeight) * dpr);
  if (!(w > 0 && h > 0)) { w = 1080; h = 1920; }
  return fitSize(w, h);
}
function exportSize() {
  const u = S.ui;
  if (u.device === 'auto') return screenPx();
  if (u.device === 'custom') return fitSize(u.cw, u.ch);
  const dv = DEVICE_MAP[u.device];
  return dv ? fitSize(dv.w, dv.h) : screenPx();
}
function deviceName() {
  const u = S.ui, [w, h] = exportSize();
  const n = u.device === 'auto' ? L('This screen', 'यह स्क्रीन') : u.device === 'custom' ? L('Custom size', 'अपना साइज़') : DEVICE_MAP[u.device].n;
  return `${n} · ${w} × ${h} px`;
}
async function renderBlob(d, W, H, fmt, q, now) {
  await ensureFont(d.font);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('no-canvas');
  render(ctx, W, H, d, now, { mock: false });
  const blob = await new Promise((res) => c.toBlob(res, fmt === 'jpg' ? 'image/jpeg' : 'image/png', q));
  c.width = c.height = 0;
  if (!blob) throw new Error('encode-failed');
  return blob;
}
const fileName = (d, W, H, fmt) => `deadline-os_${slug(d.title)}_${W}x${H}.${fmt}`;
const IMG_FAIL = () => L('Could not create the image — try a smaller size.', 'इमेज नहीं बन सकी — छोटा साइज़ आज़माएँ।');
let busyExport = false;
async function doDownload(btn) {
  if (busyExport) return; busyExport = true; btn && (btn.disabled = true);
  try {
    const d = cur(), [W, H] = exportSize(), { fmt, q } = S.ui;
    saveBlob(await renderBlob(d, W, H, fmt, q / 100, Date.now()), fileName(d, W, H, fmt));
    toast(L(`Saved ${W} × ${H} ${fmt.toUpperCase()}`, `${W} × ${H} ${fmt.toUpperCase()} सेव हो गई`));
  } catch { toast(IMG_FAIL()); }
  busyExport = false; btn && (btn.disabled = false);
}
async function doShare(btn) {
  if (busyExport) return; busyExport = true; btn && (btn.disabled = true);
  try {
    const d = cur(), [W, H] = exportSize(), { fmt, q } = S.ui;
    const blob = await renderBlob(d, W, H, fmt, q / 100, Date.now()), name = fileName(d, W, H, fmt);
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: titleOf(d) }); }
      catch (e) { if (!e || e.name !== 'AbortError') { saveBlob(blob, name); toast(L('Sharing was blocked — saved to your device instead.', 'शेयर करना रुक गया — इसके बजाय डिवाइस में सेव कर दिया।')); } }
    } else { saveBlob(blob, name); toast(L('Sharing is not supported here — saved instead.', 'यहाँ शेयर करना उपलब्ध नहीं — सेव कर दिया।')); }
  } catch { toast(IMG_FAIL()); }
  busyExport = false; btn && (btn.disabled = false);
}

/* ---- tiny ZIP writer (store, no compression — PNG/JPG are already compressed) ---- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function zipBlobs(files) {
  const enc = new TextEncoder(), parts = [], central = [], dt = new Date();
  const time = ((dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1)) & 0xFFFF;
  const date = (((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate()) & 0xFFFF;
  let offset = 0;
  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer()), name = enc.encode(f.name), crc = crc32(data), size = data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true); lh.setUint32(18, size, true);
    lh.setUint32(22, size, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true);
    ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((a, p) => a + p.byteLength, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(4, 0, true); end.setUint16(6, 0, true);
  end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

let packAbort = false, packBusy = false;
function packCount(d) {
  const p = parts(d.target, Date.now(), 'days');
  if (p.done) return 0;
  return Math.min(S.ui.pack, p.days + 1);
}
async function makePack() {
  if (packBusy) { packAbort = true; return; }
  const d = cur(), total = packCount(d);
  if (!total) { toast(L('This deadline has already passed.', 'यह डेडलाइन बीत चुकी है।')); return; }
  const [W, H] = exportSize(), { fmt, q } = S.ui, dd = { ...d, prec: 'days' };
  packBusy = true; packAbort = false;
  const bar = $('#packBar'), txt = $('#packText'), label = $('#btnPackLabel'), wrap = $('#packProg');
  wrap.hidden = false; bar.style.width = '0%'; txt.textContent = L('Preparing…', 'तैयारी हो रही है…'); label.textContent = L('Cancel', 'रद्द करें');
  try {
    await ensureFont(d.font);
    const t0 = new Date(), start = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate()), files = [];
    for (let i = 0; i < total; i++) {
      if (packAbort) throw new Error('abort');
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 0, 0, 1);
      const left = Math.max(0, calDays(day, new Date(d.target)));
      const blob = await renderBlob(dd, W, H, fmt, q / 100, day.getTime());
      files.push({ name: `${pad(i + 1)}_${ymd(day)}_${left}d-left.${fmt}`, blob });
      bar.style.width = `${Math.round(((i + 1) / total) * 100)}%`; txt.textContent = L(`Rendering ${i + 1} of ${total}`, `${total} में से ${i + 1} बन रही है`);
      await wait(0);
    }
    txt.textContent = L('Zipping…', 'ज़िप बन रही है…'); await wait(0);
    saveBlob(await zipBlobs(files), `deadline-os_${slug(d.title)}_${W}x${H}_pack.zip`);
    toast(L(`Saved a pack of ${total} wallpapers.`, `${total} वॉलपेपर का पैक सेव हो गया।`));
  } catch (e) {
    toast(e && e.message === 'abort' ? L('Pack cancelled.', 'पैक रद्द किया गया।') : L('Could not build the pack — try a smaller size or fewer days.', 'पैक नहीं बन सका — छोटा साइज़ या कम दिन आज़माएँ।'));
  }
  packBusy = false; packAbort = false; wrap.hidden = true; label.textContent = packBtnText();
}
const packBtnText = () => L('Build daily pack (.zip)', 'डेली पैक बनाएँ (.zip)');

/* ---------------------------------------------------------------------
   UI: list, editor, choices
--------------------------------------------------------------------- */
const dom = {
  list: $('#deadlines'), count: $('#dlCount'),
  inTitle: $('#inTitle'), inEmoji: $('#inEmoji'), inDate: $('#inDate'), dateHint: $('#dateHint'), inQuote: $('#inQuote'),
  presets: $('#presets'), emojiPick: $('#emojiPick'), quick: $('#quick'),
  themes: $('#themes'), bgs: $('#bgs'), layouts: $('#layouts'), fonts: $('#fonts'), poss: $('#poss'),
  inPrec: $('#inPrec'), inSize: $('#inSize'), sizeVal: $('#sizeVal'), inAccent: $('#inAccent'),
  swBar: $('#swBar'), swDate: $('#swDate'), swGrain: $('#swGrain'), swMock: $('#swMock'),
  photoRow: $('#photoRow'), photoHint: $('#photoHint'), btnPhotoClear: $('#btnPhotoClear'), inPhoto: $('#inPhoto'),
  inDevice: $('#inDevice'), customSize: $('#customSize'), inCW: $('#inCW'), inCH: $('#inCH'), sizeInfo: $('#sizeInfo'),
  fmts: $('#fmts'), qualityRow: $('#qualityRow'), inQ: $('#inQ'), qVal: $('#qVal'), snapNote: $('#snapNote'),
  inPack: $('#inPack'), packInfo: $('#packInfo'),
  stage: $('#stage'), device: $('#device'), canvas: $('#preview'), devLabel: $('#devLabel'),
  btnShare: $('#btnShare'), btnShare2: $('#btnShare2'),
  lock: $('#lock'), lockCanvas: $('#lockCanvas'),
};

/* ---- generic radio-style choice groups ---- */
const groups = [];
function buildChoices(container, entries, opt) {
  // fill() can be called again (language switch) — the labels are produced by the build() callbacks, which read L() at call time
  const fill = () => {
    container.textContent = '';
    for (const [value, build] of entries) {
      const b = el('button', opt.cls); b.type = 'button'; b.dataset.v = value; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
      build(b); container.append(b);
    }
  };
  fill();
  container.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b || !container.contains(b)) return;
    opt.onPick(b.dataset.v, b);
  });
  groups.push({ container, get: opt.get, fill });
}
function relabelDynamic() {
  groups.forEach((g) => g.fill());
  fillQuick(); fillDevices();
  $$('button[data-e]', dom.emojiPick).forEach((b) => {
    const label = b.dataset.e ? L('Use ', 'चुनें ') + b.dataset.e : L('No icon', 'कोई आइकन नहीं');
    b.setAttribute('aria-label', label); if (!b.dataset.e) b.title = label;
  });
  syncChoices();
}
const QUICK_DATES = [['1', 'Tomorrow', 'कल'], ['7', '1 week', '1 सप्ताह'], ['m1', '1 month', '1 महीना'], ['m3', '3 months', '3 महीने'], ['100', '100 days', '100 दिन'], ['ny', 'New Year', 'नया साल']];
function fillQuick() {
  dom.quick.textContent = '';
  for (const [k, en, hi] of QUICK_DATES) { const b = el('button', 'chip', L(en, hi)); b.type = 'button'; b.dataset.q = k; dom.quick.append(b); }
}
const GROUP_HI = { 'Phones': 'फ़ोन', 'Tablets': 'टैबलेट', 'Laptops, desktops & TVs': 'लैपटॉप, डेस्कटॉप और टीवी' };
function fillDevices() {
  const mk = (v, t) => { const o = el('option', '', t); o.value = v; return o; };
  dom.inDevice.textContent = '';
  dom.inDevice.append(mk('auto', L('This screen (auto-detect)', 'यह स्क्रीन (अपने-आप पता लगाएँ)')));
  for (const g of DEVICES) {
    const og = el('optgroup'); og.label = L(g.g, GROUP_HI[g.g] || g.g);
    g.items.forEach((i) => og.append(mk(i[0], `${i[1]} — ${i[2]}×${i[3]}`)));
    dom.inDevice.append(og);
  }
  dom.inDevice.append(mk('custom', L('Custom size…', 'अपना साइज़…')));
  dom.inDevice.value = S.ui.device;
}
function syncChoices() {
  const d = cur();
  for (const g of groups) {
    const v = g.get(d);
    $$('button[data-v]', g.container).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === String(v))));
  }
}
function buildStatic() {
  // presets
  buildChoices(dom.presets, PRESETS.map((p) => [p.id, (b) => { b.append(el('span', 'e', p.e), document.createTextNode(presetName(p))); }]), {
    cls: 'chip', get: (d) => d.preset, onPick: (id) => applyPreset(id),
  });
  // emoji picks (their aria-labels are filled in by relabelDynamic)
  for (const e of EMOJIS) { const b = el('button', '', e); b.type = 'button'; b.dataset.e = e; dom.emojiPick.append(b); }
  const none = el('button', '', '∅'); none.type = 'button'; none.dataset.e = ''; none.style.fontSize = '1rem'; dom.emojiPick.append(none);
  dom.emojiPick.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-e]'); if (!b) return;
    update({ emoji: b.dataset.e }, { sync: true });
  });
  // quick dates
  dom.quick.addEventListener('click', (ev) => { const b = ev.target.closest('button[data-q]'); if (b) quickDate(b.dataset.q); });
  // themes
  buildChoices(dom.themes, Object.entries(THEMES).map(([k, t]) => [k, (b) => {
    const i = el('i'), grad = `linear-gradient(135deg, ${t.bg[0]}, ${t.bg[1]} 50%, ${t.bg[2]})`, name = themeName(k);
    i.style.backgroundImage = `radial-gradient(circle at 72% 30%, ${t.accent} 0 13%, transparent 14%), ${grad}`;
    b.append(i, document.createTextNode(name)); b.setAttribute('aria-label', L(name + ' theme', name + ' थीम'));
  }]), { cls: 'swatch', get: (d) => d.theme, onPick: (v) => update({ theme: v, themeTouched: true }) });
  // backgrounds
  buildChoices(dom.bgs, BGS.map(([k, en, hi]) => [k, (b) => { b.textContent = L(en, hi); }]), {
    cls: 'chip', get: (d) => d.bg,
    onPick: (v) => { update({ bg: v }, { sync: true }); if (v === 'photo' && !photos.has(cur().id)) dom.inPhoto.click(); },
  });
  // layouts
  buildChoices(dom.layouts, LAYOUTS.map(([k, n, svg, hi]) => [k, (b) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = svg;
    b.append(s, document.createTextNode(L(n, hi)));
  }]), { cls: 'layout', get: (d) => d.layout, onPick: (v) => update({ layout: v }) });
  // fonts
  buildChoices(dom.fonts, Object.entries(FONTS).map(([k, f]) => [k, (b) => { b.textContent = f.n; b.style.fontFamily = f.fam; }]), {
    cls: 'chip', get: (d) => d.font, onPick: (v) => { update({ font: v }); ensureFont(v).then(drawAll); },
  });
  // position
  buildChoices(dom.poss, [['top', 'Top', 'ऊपर'], ['center', 'Middle', 'बीच'], ['bottom', 'Bottom', 'नीचे']].map(([k, en, hi]) => [k, (b) => { b.textContent = L(en, hi); }]), {
    cls: '', get: (d) => d.pos, onPick: (v) => update({ pos: v }),
  });
  // formats
  buildChoices(dom.fmts, [['png', 'PNG · sharp', 'PNG · साफ़'], ['jpg', 'JPG · smaller', 'JPG · छोटी फ़ाइल']].map(([k, en, hi]) => [k, (b) => { b.textContent = L(en, hi); }]), {
    cls: '', get: () => S.ui.fmt, onPick: (v) => { S.ui.fmt = v; save(); syncExport(); },
  });
  fillQuick(); fillDevices();
}

function applyPreset(id) {
  const p = PRESETS.find((x) => x.id === id), d = cur();
  if (!p) return;
  const patch = { preset: id, emoji: p.e };
  // only overwrite the title / quote when they are still untouched defaults (in either language)
  const titleIsDefault = !d.title.trim() || DEFAULT_TITLES.includes(d.title) || PRESETS.some((x) => x.t && (x.t === d.title || x.tH === d.title));
  const quoteIsDefault = !d.quote.trim() || PRESETS.some((x) => x.q && (x.q === d.quote || x.qH === d.quote));
  if (p.t && titleIsDefault) patch.title = L(p.t, p.tH);
  if (p.id !== 'custom' && quoteIsDefault) patch.quote = L(p.q, p.qH);
  if (p.th && !d.themeTouched) patch.theme = p.th;
  if (!d.milestones.length || d.msAuto) { patch.milestones = suggestMilestones({ ...d, preset: id }); patch.msAuto = true; } // fresh steps that fit this kind of event
  update(patch, { sync: true });
  if (id === 'custom') dom.inTitle.focus();
}

function addMonths(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth() + n, 1, date.getHours(), date.getMinutes());
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), last));
  return d;
}
function quickDate(k) {
  const d = cur(), now = new Date(), old = new Date(d.target);
  let t;
  if (k === 'ny') t = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
  else {
    t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), old.getHours(), old.getMinutes(), 0);
    if (k === 'm1') t = addMonths(t, 1); else if (k === 'm3') t = addMonths(t, 3); else t.setDate(t.getDate() + Number(k));
  }
  update({ target: t.getTime(), start: Date.now() }, { sync: true });
}

/* ---- the update pipeline ---- */
function update(patch, opt = {}) {
  const d = cur();
  Object.assign(d, patch);
  if (patch.target !== undefined) { // moving the deadline: auto-suggested steps follow it, hand-made ones stay put
    if (d.msAuto) d.milestones = suggestMilestones(d);
    renderMilestones();
  }
  save();
  renderList();
  syncChoices();
  if (opt.sync) syncEditor();
  syncHints();
  drawAll();
}

function renderList() {
  const now = Date.now(), items = sortedItems();
  dom.count.textContent = L(`${items.length} ${plural(items.length, 'countdown')}`, `${items.length} काउंटडाउन`);
  dom.list.textContent = '';
  for (const it of items) {
    const th = themeOf(it), li = el('li', 'dl'); li.dataset.id = it.id;
    li.dataset.active = String(it.id === S.sel); li.dataset.done = String(it.target <= now); li.dataset.draft = String(!!it.draft);
    const main = el('button', 'dl-main'); main.type = 'button'; main.setAttribute('aria-pressed', String(it.id === S.sel));
    main.setAttribute('aria-label', `${titleOf(it)}, ${targetText(it.target)}`);
    const badge = el('span', 'dl-badge', it.emoji.trim() || '⏳'); badge.style.setProperty('--g', `linear-gradient(135deg, ${th.bg[1]}, ${th.blobs[0]})`);
    const meta = el('span', 'dl-meta');
    if (it.draft) meta.append(el('span', 'dl-pill', L('Draft', 'ड्राफ़्ट')));
    meta.append(el('span', 'dl-cd', cardCountdown(it, now)), el('span', 'dl-date', targetText(it.target)));
    const info = el('span', 'dl-info'); info.append(el('span', 'dl-title', titleOf(it)), meta);
    main.append(badge, info);
    const del = el('button', 'dl-del'); del.type = 'button'; del.setAttribute('aria-label', L('Delete ', 'हटाएँ: ') + titleOf(it));
    del.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-trash"/></svg>';
    const bar = el('span', 'dl-bar'), fill = el('i'); fill.style.width = (progress(it, now) * 100).toFixed(1) + '%'; bar.append(fill);
    li.append(main, del, bar); dom.list.append(li);
  }
}
function tickList(now) {
  $$('.dl', dom.list).forEach((li) => {
    const it = byId(li.dataset.id); if (!it) return;
    const cd = $('.dl-cd', li), txt = cardCountdown(it, now);
    if (cd.textContent !== txt) cd.textContent = txt;
    const done = String(it.target <= now); if (li.dataset.done !== done) li.dataset.done = done;
  });
}

function syncEditor() {
  const d = cur();
  dom.inTitle.value = d.title; dom.inEmoji.value = d.emoji; dom.inQuote.value = d.quote;
  dom.inDate.value = toLocalInput(d.target); dom.inDate.removeAttribute('aria-invalid');
  dom.inPrec.value = d.prec; dom.inSize.value = d.size; dom.sizeVal.textContent = d.size + '%';
  dom.swBar.checked = d.bar; dom.swDate.checked = d.date; dom.swGrain.checked = d.grain;
  dom.swMock.checked = S.ui.mock;
  dom.inAccent.value = d.accent || themeOf(d).accent;
  syncChoices(); syncHints(); syncPhotoUi(); syncExport(); syncConfirm(); renderMilestones();
}

/* ---- milestone editor ---- */
const toDateInput = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
function fromDateInput(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); if (!m) return null;
  const t = new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  return Number.isFinite(t) && t > 0 && t <= MAXT ? t : null;
}
function renderMilestones() {
  const d = cur(), ul = $('#msList'), maxDate = toDateInput(d.target);
  ul.textContent = '';
  d.milestones.forEach((m, i) => {
    const li = el('li', 'ms-row');
    const lab = el('input', 'ms-label'); lab.type = 'text'; lab.maxLength = 28; lab.value = m.label; lab.autocomplete = 'off'; lab.enterKeyHint = 'done';
    lab.placeholder = L('Short step, e.g. Mock test', 'छोटा पड़ाव, जैसे: मॉक टेस्ट'); lab.setAttribute('aria-label', L('Milestone name', 'माइलस्टोन का नाम'));
    const dt = el('input', 'ms-date'); dt.type = 'date'; dt.value = toDateInput(m.at); dt.max = maxDate; dt.setAttribute('aria-label', L('Milestone date', 'माइलस्टोन की तारीख़'));
    const del = el('button', 'ms-del'); del.type = 'button'; del.setAttribute('aria-label', L('Remove milestone', 'माइलस्टोन हटाएँ'));
    del.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-x"/></svg>';
    lab.addEventListener('input', () => { m.label = lab.value; d.msAuto = false; save(); drawAll(); });
    lab.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); lab.blur(); } });
    dt.addEventListener('change', () => {
      const t = fromDateInput(dt.value);
      if (t == null) { dt.value = toDateInput(m.at); return; } // cleared or invalid: keep the old date
      m.at = t; d.msAuto = false; d.milestones.sort((a, b) => a.at - b.at); save(); renderMilestones(); drawAll();
    });
    del.addEventListener('click', () => { d.milestones.splice(i, 1); d.msAuto = false; save(); renderMilestones(); drawAll(); });
    li.append(lab, dt, del); ul.append(li);
  });
  $('#btnMsAdd').disabled = d.milestones.length >= 6;
  $('#msEmpty').hidden = d.milestones.length > 0;
}
function addMilestone() {
  const d = cur(); if (d.milestones.length >= 6) return;
  const now = Date.now(), at = d.target > now ? dayStart(now + (d.target - now) / 2) : dayStart(now);
  d.milestones.push({ label: '', at }); d.milestones.sort((a, b) => a.at - b.at); d.msAuto = false;
  save(); renderMilestones(); drawAll();
  const inputs = $$('.ms-label'), idx = d.milestones.findIndex((m) => m.at === at && m.label === '');
  if (inputs[idx]) inputs[idx].focus();
}
function suggestForMe() {
  const d = cur(), list = suggestMilestones(d);
  if (!list.length) { toast(L('Not enough time before the deadline for milestones.', 'डेडलाइन से पहले माइलस्टोन के लिए पर्याप्त समय नहीं है।')); return; }
  d.milestones = list; d.msAuto = true; save(); renderMilestones(); drawAll();
}
/* Confirm bar: new events are drafts until "Create" is tapped; existing events get a "Done" button. */
function syncConfirm() {
  const d = cur();
  $('#confirmLabel').textContent = d.draft ? L('Create', 'बनाएँ') : L('Done', 'हो गया');
  $('#btnCancel').hidden = !d.draft;
  $('#draftNote').hidden = !d.draft;
}
function syncHints() {
  const d = cur(), now = Date.now(), p = parts(d.target, now, 'full');
  dom.dateHint.classList.toggle('warn', p.done);
  if (p.done) dom.dateHint.textContent = L('That moment has passed — the wallpaper will say “Time’s up!”. Pick a future date to count down.', 'वह समय बीत चुका है — वॉलपेपर पर “समय समाप्त!” दिखेगा। गिनती के लिए आगे की तारीख़ चुनें।');
  else {
    const dd = calDays(new Date(now), new Date(d.target));
    dom.dateHint.textContent = dd >= 2 ? L(`${dd} days from today.`, `आज से ${dd} दिन बाद।`)
      : p.days >= 1 ? L('About a day from now.', 'लगभग एक दिन बाद।')
      : L(`${p.h} ${plural(p.h, 'hour')} ${p.m} min from now.`, `${p.h} घंटे ${p.m} मिनट बाद।`);
  }
  dom.inAccent.value = d.accent || themeOf(d).accent;
  const n = packCount(d);
  dom.packInfo.textContent = n
    ? L(`Will create ${n} ${plural(n, 'image')} — one for each day from today until the deadline, always showing “days left”.`, `${n} इमेज बनेंगी — आज से डेडलाइन तक हर दिन की एक, जिसमें हमेशा “बचे हुए दिन” दिखेंगे।`)
    : L('This deadline has already passed.', 'यह डेडलाइन बीत चुकी है।');
  $('#btnPack').disabled = !n && !packBusy;
  dom.snapNote.textContent = d.prec === 'days'
    ? L('Tip: a wallpaper is a still picture. “Days only” stays correct all day — re-export once a day, or use the daily pack below.', 'सुझाव: वॉलपेपर एक स्थिर तस्वीर होती है। “सिर्फ़ दिन” पूरे दिन सही रहता है — दिन में एक बार दोबारा एक्सपोर्ट करें या नीचे डेली पैक इस्तेमाल करें।')
    : L('Heads-up: a wallpaper is a still picture, so hours, minutes and seconds show the moment you export. For something that stays accurate choose “Days only”, build a daily pack, or open the live lock screen.', 'ध्यान दें: वॉलपेपर एक स्थिर तस्वीर है, इसलिए घंटे, मिनट और सेकंड वही दिखेंगे जो एक्सपोर्ट के समय थे। हमेशा सही रहने के लिए “सिर्फ़ दिन” चुनें, डेली पैक बनाएँ या लाइव लॉक स्क्रीन खोलें।');
}
function syncPhotoUi() {
  const d = cur(), isPhoto = d.bg === 'photo', has = photos.has(d.id);
  dom.photoRow.hidden = !isPhoto;
  dom.btnPhotoClear.hidden = !has;
  $('#btnPhotoLabel').textContent = has ? L('Change photo', 'फ़ोटो बदलें') : L('Choose photo', 'फ़ोटो चुनें');
  dom.photoHint.textContent = has ? L('Stays on this device only.', 'सिर्फ़ इसी डिवाइस पर रहती है।') : L('No photo yet — showing the aurora background instead.', 'अभी कोई फ़ोटो नहीं — ऑरोरा बैकग्राउंड दिख रहा है।');
}
function ratioText(w, h) {
  const a = w / h;
  const list = [['9:21', 9 / 21], ['9:20', 9 / 20], ['9:19.5', 9 / 19.5], ['9:16', 9 / 16], ['10:16', 10 / 16], ['3:4', 3 / 4], ['2:3', 2 / 3], ['1:1', 1], ['4:3', 4 / 3], ['3:2', 3 / 2], ['16:10', 16 / 10], ['16:9', 16 / 9], ['21:9', 21 / 9], ['32:9', 32 / 9]];
  let best = null;
  for (const [t, v] of list) { const e = Math.abs(a - v) / v; if (!best || e < best.e) best = { t, e }; }
  return best && best.e < 0.04 ? best.t : a.toFixed(2) + ':1';
}
const SCALED_NOTE = () => L(' · scaled to fit your browser’s limit', ' · ब्राउज़र की सीमा के हिसाब से छोटा किया गया');
function syncExport() {
  const u = S.ui, [W, H] = exportSize();
  dom.inDevice.value = u.device;
  dom.customSize.hidden = u.device !== 'custom';
  dom.inCW.value = u.cw; dom.inCH.value = u.ch;
  const asked = u.device === 'custom' ? [u.cw, u.ch] : null;
  const scaled = asked && (W !== asked[0] || H !== asked[1]);
  dom.sizeInfo.textContent = `${W} × ${H} px · ${(W * H / 1e6).toFixed(1)} MP · ${ratioText(W, H)}` + (scaled ? SCALED_NOTE() : '');
  dom.qualityRow.hidden = u.fmt !== 'jpg'; dom.inQ.value = u.q; dom.qVal.textContent = u.q;
  dom.inPack.value = String(u.pack);
  dom.devLabel.textContent = deviceName();
  syncChoices();
}

/* ---- tabs & views ---- */
function setTab(t, focus) {
  S.ui.tab = t; save();
  $$('.tab').forEach((b) => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  $$('.pane').forEach((p) => { p.hidden = p.id !== 'pane-' + t; });
}
function setView(v) {
  S.ui.view = v; save();
  document.body.dataset.view = v;
  $$('#bottomNav button').forEach((b) => { if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  requestAnimationFrame(() => { fitPreview(); window.scrollTo({ top: 0 }); });
}
const isSmall = () => matchMedia('(max-width: 899.98px)').matches;

/* ---- list actions ---- */
function selectItem(id) {
  S.sel = id; save();
  renderList(); syncEditor(); fitPreview();
  if (isSmall()) setView('preview');
}
let placeholderId = null;
function removeItem(id, opt = {}) {
  const i = S.items.findIndex((x) => x.id === id); if (i < 0) return;
  const [item] = S.items.splice(i, 1);
  let msg = L('Deleted “' + titleOf(item) + '”', '“' + titleOf(item) + '” हटा दिया गया');
  placeholderId = null;
  if (!S.items.length) { const f = makeItem(); f.draft = false; S.items.push(f); S.sel = f.id; placeholderId = f.id; msg += L(' — started a fresh one', ' — एक नया शुरू कर दिया'); }
  else if (S.sel === id) S.sel = sortedItems()[0].id;
  saveNow(); renderList(); syncEditor(); fitPreview();
  if (opt.silent) { toast(opt.silent); return; } // discarding a draft needs no undo
  toast(msg, { ms: 6000, action: { label: L('Undo', 'पूर्ववत'), fn: () => {
    if (placeholderId) { const k = S.items.findIndex((x) => x.id === placeholderId); if (k >= 0) S.items.splice(k, 1); placeholderId = null; }
    S.items.splice(Math.min(i, S.items.length), 0, item); S.sel = item.id;
    saveNow(); renderList(); syncEditor(); fitPreview();
  } } });
}
const LIMIT_MSG = () => L('You have reached the 60-countdown limit.', 'आप 60 काउंटडाउन की सीमा तक पहुँच गए हैं।');

/* New events start as a draft: nothing is "real" until the user taps Create. */
let draftReturn = null;
function newItem() {
  if (S.items.length >= 60) { toast(LIMIT_MSG()); return; }
  draftReturn = cur().draft ? draftReturn : S.sel;
  const it = makeItem({ draft: true }); S.items.push(it); S.sel = it.id; save();
  renderList(); setTab('event'); syncEditor(); fitPreview();
  if (isSmall()) setView('studio');
  if (matchMedia('(hover: hover)').matches) setTimeout(() => { dom.inTitle.focus(); dom.inTitle.select(); }, 60);
}
function confirmItem() {
  const d = cur();
  if (!d.title.trim()) { // an event needs a name
    setTab('event'); dom.inTitle.setAttribute('aria-invalid', 'true'); dom.inTitle.focus();
    toast(L('Give your event a name first.', 'पहले इवेंट का नाम लिखें।')); return;
  }
  dom.inTitle.removeAttribute('aria-invalid');
  const wasDraft = d.draft; d.draft = false; draftReturn = null; saveNow();
  renderList(); syncConfirm(); drawAll();
  toast(wasDraft ? L('Countdown created ✓', 'काउंटडाउन बन गया ✓') : L('Saved ✓', 'सेव हो गया ✓'));
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (isSmall()) setView('preview');
}
function cancelDraft() {
  const d = cur(); if (!d.draft) return;
  const back = draftReturn; draftReturn = null;
  removeItem(d.id, { silent: L('Draft discarded.', 'ड्राफ़्ट हटा दिया गया।') });
  if (back && byId(back)) { S.sel = back; save(); renderList(); syncEditor(); fitPreview(); }
  if (isSmall()) setView('list');
}
function dupItem() {
  if (S.items.length >= 60) { toast(LIMIT_MSG()); return; }
  const d = cur(), c = clean({ ...d, id: uid(), title: d.title + L(' (copy)', ' (कॉपी)'), start: Date.now(), draft: false });
  copyPhoto(d.id, c.id); S.items.push(c); S.sel = c.id; save();
  renderList(); syncEditor(); fitPreview(); toast(L('Duplicated.', 'कॉपी बन गई।'));
}

/* ---- UI theme ---- */
function applyUiTheme() {
  const t = S.ui.theme === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : S.ui.theme;
  document.documentElement.setAttribute('data-theme', t);
  const meta = $('meta[name="theme-color"]'); if (meta) meta.content = t === 'light' ? '#eef1ff' : '#05071a';
}

/* ---------------------------------------------------------------------
   Preview canvas
--------------------------------------------------------------------- */
const prevBg = {}, lockBg = {};
let prevW = 0, prevH = 0, lastStage = '';
function fitPreview() {
  const st = dom.stage;
  if (!st.clientWidth) return;
  st.style.setProperty('--need', '9999px'); // let the stage grow to its CSS maximum so we can measure it
  const maxH = st.clientHeight;
  if (!maxH) return;
  const [W, H] = exportSize(), a = W / H;
  const kind = a < 0.62 ? 'phone' : a < 0.9 ? 'tablet' : 'screen';
  const pad2 = 26;
  const availW = Math.max(120, st.clientWidth - pad2 * 2), availH = Math.max(160, maxH - pad2 * 2);
  let w = availW, h = w / a;
  if (h > availH) { h = availH; w = h * a; }
  w = Math.floor(w); h = Math.floor(h);
  st.style.setProperty('--need', h + pad2 * 2 + 'px'); // …then shrink the stage to hug the device
  lastStage = st.clientWidth + 'x' + st.clientHeight;
  const dev = dom.device;
  dev.dataset.kind = kind;
  dev.style.width = w + 'px'; dev.style.height = h + 'px';
  dev.style.setProperty('--bz', clamp(Math.round(w * 0.022), 4, 10) + 'px');
  dev.style.setProperty('--dr', (kind === 'phone' ? w * 0.13 : kind === 'tablet' ? w * 0.045 : Math.min(14, w * 0.02)) + 'px');
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
  if (dom.canvas.width !== cw || dom.canvas.height !== ch) { dom.canvas.width = cw; dom.canvas.height = ch; }
  prevW = cw; prevH = ch;
  dom.canvas.setAttribute('aria-label', L(`Wallpaper preview for ${titleOf(cur())}`, `${titleOf(cur())} के लिए वॉलपेपर प्रीव्यू`));
  drawPreview(Date.now());
}
function drawPreview(now) {
  if (!prevW || !prevH) return;
  const ctx = dom.canvas.getContext('2d', { alpha: false });
  render(ctx, prevW, prevH, cur(), now, { mock: S.ui.mock, bgCache: prevBg });
}
function drawAll() {
  const now = Date.now();
  if (!document.hidden) { drawPreview(now); if (lock.active) drawLock(now); }
}

/* ---------------------------------------------------------------------
   Live lock screen (full-screen)
--------------------------------------------------------------------- */
const lock = { active: false, uiTimer: 0, wake: null, opener: null };
function sizeLock() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  let w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
  const cap = 9e6, area = w * h; if (area > cap) { const k = Math.sqrt(cap / area); w = Math.round(w * k); h = Math.round(h * k); }
  dom.lockCanvas.width = Math.max(2, w); dom.lockCanvas.height = Math.max(2, h);
  drawLock(Date.now());
}
function drawLock(now) {
  const c = dom.lockCanvas;
  render(c.getContext('2d', { alpha: false }), c.width, c.height, cur(), now, { mock: true, bgCache: lockBg });
}
function showLockUi() {
  dom.lock.classList.add('ui-on');
  clearTimeout(lock.uiTimer);
  lock.uiTimer = setTimeout(() => dom.lock.classList.remove('ui-on'), 3500);
}
async function wakeLock() {
  try { if ('wakeLock' in navigator && lock.active) lock.wake = await navigator.wakeLock.request('screen'); } catch { /* not supported / denied */ }
}
function openLock() {
  if (lock.active) return;
  lock.active = true; lock.opener = document.activeElement;
  dom.lock.hidden = false; document.body.classList.add('locked');
  ensureFont(cur().font).then(drawAll);
  sizeLock(); showLockUi();
  try { const p = dom.lock.requestFullscreen && dom.lock.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ }
  wakeLock();
  $('#lockExit').focus({ preventScroll: true });
}
function closeLock() {
  if (!lock.active) return;
  lock.active = false; dom.lock.hidden = true; document.body.classList.remove('locked'); dom.lock.classList.remove('ui-on');
  clearTimeout(lock.uiTimer);
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch { /* ignore */ }
  try { if (lock.wake) lock.wake.release(); } catch { /* ignore */ }
  lock.wake = null;
  if (lock.opener && lock.opener.focus) lock.opener.focus({ preventScroll: true });
}
function stepLock(dir) {
  const items = sortedItems(), i = items.findIndex((x) => x.id === S.sel);
  S.sel = items[(i + dir + items.length) % items.length].id; save();
  renderList(); syncEditor(); fitPreview(); drawLock(Date.now()); showLockUi();
}

/* ---------------------------------------------------------------------
   Clock tick (aligned to the second)
--------------------------------------------------------------------- */
let lastMinute = -1;
function tick() {
  const now = Date.now();
  if (!document.hidden) {
    tickList(now); drawPreview(now); if (lock.active) drawLock(now);
    const mn = Math.floor(now / 60000);
    if (mn !== lastMinute) { lastMinute = mn; syncHints(); }
  }
  setTimeout(tick, 1000 - (Date.now() % 1000) + 12);
}

/* ---------------------------------------------------------------------
   Wire everything up
--------------------------------------------------------------------- */
function bind() {
  // list
  dom.list.addEventListener('click', (e) => {
    const li = e.target.closest('.dl'); if (!li) return;
    if (e.target.closest('.dl-del')) removeItem(li.dataset.id); else selectItem(li.dataset.id);
  });
  $('#btnNew').addEventListener('click', newItem);
  $('#btnDup').addEventListener('click', dupItem);
  $('#btnDel').addEventListener('click', () => removeItem(S.sel));

  // event pane
  dom.inTitle.addEventListener('input', () => { dom.inTitle.removeAttribute('aria-invalid'); update({ title: dom.inTitle.value }); });
  dom.inEmoji.addEventListener('input', () => update({ emoji: Array.from(dom.inEmoji.value.trim()).slice(0, 14).join('') }));
  dom.inQuote.addEventListener('input', () => update({ quote: dom.inQuote.value }));
  // Enter confirms — but never while a Hindi/IME composition is still in progress
  for (const inp of [dom.inTitle, dom.inQuote]) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); confirmItem(); } });
  $('#btnMsAdd').addEventListener('click', addMilestone);
  $('#btnMsSuggest').addEventListener('click', suggestForMe);
  $('#btnConfirm').addEventListener('click', confirmItem);
  $('#btnCancel').addEventListener('click', cancelDraft);
  $('.lang-switch').addEventListener('click', (e) => { const b = e.target.closest('button[data-lang]'); if (b) setLang(b.dataset.lang); });
  dom.inDate.addEventListener('input', () => {
    const t = dom.inDate.value ? new Date(dom.inDate.value).getTime() : NaN;
    if (Number.isFinite(t) && t >= 0 && t <= MAXT) { dom.inDate.removeAttribute('aria-invalid'); update({ target: t }); }
    else dom.inDate.setAttribute('aria-invalid', 'true');
  });
  $('#btnRestart').addEventListener('click', () => { update({ start: Date.now() }); toast(L('Progress restarted from now.', 'प्रगति अभी से दोबारा शुरू हुई।')); });
  $('#btnQuote').addEventListener('click', () => {
    const d = cur(), list = QUOTES[LANG]; let q = pick(list); for (let i = 0; i < 4 && q === d.quote; i++) q = pick(list);
    update({ quote: q }, { sync: true });
  });

  // style pane
  dom.inPrec.addEventListener('change', () => update({ prec: dom.inPrec.value }));
  dom.inSize.addEventListener('input', () => { dom.sizeVal.textContent = dom.inSize.value + '%'; update({ size: Number(dom.inSize.value) }); });
  dom.inAccent.addEventListener('input', () => update({ accent: dom.inAccent.value.toLowerCase() }));
  $('#btnAccentReset').addEventListener('click', () => update({ accent: null }, { sync: true }));
  dom.swBar.addEventListener('change', () => update({ bar: dom.swBar.checked }));
  dom.swDate.addEventListener('change', () => update({ date: dom.swDate.checked }));
  dom.swGrain.addEventListener('change', () => update({ grain: dom.swGrain.checked }));
  $('#btnPhoto').addEventListener('click', () => dom.inPhoto.click());
  dom.inPhoto.addEventListener('change', () => { const f = dom.inPhoto.files && dom.inPhoto.files[0]; dom.inPhoto.value = ''; if (f) loadPhotoFile(f); });
  dom.btnPhotoClear.addEventListener('click', () => {
    const d = cur(); photos.delete(d.id); store.del(PHOTO_KEY + d.id); photoVer++;
    update({ bg: 'aurora' }, { sync: true });
  });

  // preview & export
  dom.swMock.addEventListener('change', () => { S.ui.mock = dom.swMock.checked; save(); drawPreview(Date.now()); });
  dom.inDevice.addEventListener('change', () => { S.ui.device = dom.inDevice.value; save(); syncExport(); syncHints(); fitPreview(); });
  const customChange = () => { S.ui.cw = clamp(Math.round(Number(dom.inCW.value)) || MINDIM, MINDIM, 16384); S.ui.ch = clamp(Math.round(Number(dom.inCH.value)) || MINDIM, MINDIM, 16384); save(); const [w, h] = exportSize(); dom.sizeInfo.textContent = `${w} × ${h} px · ${(w * h / 1e6).toFixed(1)} MP · ${ratioText(w, h)}` + (w !== S.ui.cw || h !== S.ui.ch ? ' · scaled to fit your browser’s limit' : ''); dom.devLabel.textContent = deviceName(); fitPreview(); };
  dom.inCW.addEventListener('input', customChange); dom.inCH.addEventListener('input', customChange);
  dom.inCW.addEventListener('change', syncExport); dom.inCH.addEventListener('change', syncExport);
  dom.inQ.addEventListener('input', () => { S.ui.q = Number(dom.inQ.value); dom.qVal.textContent = S.ui.q; save(); });
  dom.inPack.addEventListener('change', () => { S.ui.pack = Number(dom.inPack.value); save(); syncHints(); });
  $('#btnDownload').addEventListener('click', (e) => doDownload(e.currentTarget));
  $('#btnDownload2').addEventListener('click', (e) => doDownload(e.currentTarget));
  dom.btnShare.addEventListener('click', (e) => doShare(e.currentTarget));
  dom.btnShare2.addEventListener('click', (e) => doShare(e.currentTarget));
  $('#btnPack').addEventListener('click', makePack);
  $('#btnEdit').addEventListener('click', () => setView('studio'));
  try {
    const probe = new File([''], 'a.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [probe] })) { dom.btnShare.hidden = false; dom.btnShare2.hidden = false; }
  } catch { /* share unsupported */ }

  // tabs
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  $('#tabs').addEventListener('keydown', (e) => {
    const tabs = $$('.tab'), i = tabs.findIndex((t) => t.dataset.tab === S.ui.tab);
    if (e.key === 'ArrowRight') { e.preventDefault(); setTab(tabs[(i + 1) % tabs.length].dataset.tab, true); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(tabs[(i + tabs.length - 1) % tabs.length].dataset.tab, true); }
    else if (e.key === 'Home') { e.preventDefault(); setTab(tabs[0].dataset.tab, true); }
    else if (e.key === 'End') { e.preventDefault(); setTab(tabs[tabs.length - 1].dataset.tab, true); }
  });
  $('#bottomNav').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });

  // top bar
  $('#btnLock').addEventListener('click', openLock);
  $('#btnLink').addEventListener('click', copyLink);
  $('#btnTheme').addEventListener('click', () => {
    const now = document.documentElement.getAttribute('data-theme');
    S.ui.theme = now === 'dark' ? 'light' : 'dark'; save(); applyUiTheme();
  });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (S.ui.theme === 'auto') applyUiTheme(); });

  // lock screen
  $('#lockExit').addEventListener('click', (e) => { e.stopPropagation(); closeLock(); });
  $('#lockPrev').addEventListener('click', (e) => { e.stopPropagation(); stepLock(-1); });
  $('#lockNext').addEventListener('click', (e) => { e.stopPropagation(); stepLock(1); });
  dom.lock.addEventListener('click', () => { if (dom.lock.classList.contains('ui-on')) { dom.lock.classList.remove('ui-on'); clearTimeout(lock.uiTimer); } else showLockUi(); });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && lock.active) closeLock(); });
  document.addEventListener('keydown', (e) => {
    if (!lock.active) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLock(); }
    else if (e.key === 'ArrowLeft') stepLock(-1);
    else if (e.key === 'ArrowRight') stepLock(1);
    else if (e.key === 'Tab') { showLockUi(); }
  });
  window.addEventListener('resize', () => { if (lock.active) sizeLock(); });
  window.addEventListener('orientationchange', () => setTimeout(() => { if (lock.active) sizeLock(); fitPreview(); syncExport(); }, 250));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveNow();
    else { drawAll(); tickList(Date.now()); if (lock.active) wakeLock(); }
  });
  window.addEventListener('pagehide', saveNow);
  window.addEventListener('hashchange', () => { if (importFromHash()) { renderList(); syncEditor(); fitPreview(); toast(IMPORTED()); } });

  // keep the preview sized to its stage
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (dom.stage.clientWidth + 'x' + dom.stage.clientHeight !== lastStage) fitPreview(); }).observe(dom.stage);
  else window.addEventListener('resize', fitPreview);
}

/* ---------------------------------------------------------------------
   Boot
--------------------------------------------------------------------- */
const IMPORTED = () => L('Countdown imported from link.', 'लिंक से काउंटडाउन जुड़ गया।');

/* ---- language: every translatable element keeps its English text and carries Hindi in data-hi* attributes ---- */
function translateStatic() {
  const hi = LANG === 'hi';
  $$('[data-hi]').forEach((e) => { if (e.dataset.en === undefined) e.dataset.en = e.textContent; e.textContent = hi ? e.dataset.hi : e.dataset.en; });
  $$('[data-hi-html]').forEach((e) => { if (e.dataset.enHtml === undefined) e.dataset.enHtml = e.innerHTML; e.innerHTML = hi ? e.dataset.hiHtml : e.dataset.enHtml; });
  for (const a of ['placeholder', 'aria-label', 'title']) {
    $$(`[data-hi-${a}]`).forEach((e) => {
      if (!e.hasAttribute('data-en-' + a)) e.setAttribute('data-en-' + a, e.getAttribute(a) || '');
      e.setAttribute(a, e.getAttribute((hi ? 'data-hi-' : 'data-en-') + a));
    });
  }
}
function applyLang() {
  document.documentElement.lang = LANG;
  document.title = L('Deadline OS — Your Personal Countdown Lock Screen', 'डेडलाइन OS — आपकी अपनी काउंटडाउन लॉक स्क्रीन');
  translateStatic();
  $$('.lang-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
  $('#btnPackLabel').textContent = packBusy ? L('Cancel', 'रद्द करें') : packBtnText();
  relabelDynamic();
  renderList(); syncEditor(); fitPreview();
  drawAll();
  ensureFont(cur().font).then(drawAll); // Hindi needs the Devanagari face loaded before the canvas can draw it
}
function setLang(l) {
  if (l === LANG || !['en', 'hi'].includes(l)) return;
  // auto-suggested milestones keep their dates but swap to the other language's label
  for (const it of S.items) {
    if (!it.msAuto) continue;
    const set = MS_LABELS[it.preset] || MS_LABELS.generic, from = set[LANG === 'hi' ? 1 : 0], to = set[l === 'hi' ? 1 : 0];
    it.milestones.forEach((m) => { const i = from.indexOf(m.label); if (i >= 0) m.label = to[i]; });
  }
  LANG = l; S.ui.lang = l; saveNow();
  applyLang();
}

function init() {
  loadState();
  const imported = importFromHash();
  applyUiTheme();
  buildStatic();
  bind();
  setTab(S.ui.tab);
  document.body.dataset.view = S.ui.view;
  $$('#bottomNav button').forEach((b) => { if (b.dataset.view === S.ui.view) b.setAttribute('aria-current', 'page'); });
  applyLang(); // translates the page, renders the list + editor + preview
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { prevBg.key = ''; drawAll(); });
  tick();
  if (imported) toast(IMPORTED());
}
init();

})();
