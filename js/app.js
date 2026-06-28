const API_KEY = 'AIzaSyAbS9-AVTAGaMc5YqawUAbpXxzTLsRGYLY';

const TEMPLES = [
  {
    id:        'somnath',
    name:      'સોમનાથ',
    channelId: 'UCT1egsvA08YcdMLiEu1DTRg',
    emoji:     '🔱',
    img:       'img/somnath.jpg',
    ytUrl:     'https://www.youtube.com/@@SomnathTempleOfficialChannel/streams',
  },
  {
    id:        'mahakal',
    name:      'મહાકાળેશ્વર',
    channelId: 'UC7hmH7rEu5HPA8iDT7zkEow',
    emoji:     '🕉️',
    img:       'img/mahakal.jpg',
    ytUrl:     'https://www.youtube.com/@ujjainmahakallive/streams',
  },
  {
    id:        'dwarka',
    name:      'દ્વારકાધીશ',
    channelId: 'UCBAvMHZO3BIfMMhOK9LMOYQ',
    emoji:     '🪷',
    img:       'img/dwarka.jpg',
    ytUrl:     'https://www.youtube.com/channel/UCBAvMHZO3BIfMMhOK9LMOYQ/streams',
  },
  {
    id:        'vaishno',
    name:      'વૈષ્ણો દેવી',
    channelId: 'UCziZy6xAlJWPzgIY4duxAeQ',
    emoji:     '🌸',
    img:       'img/vaishno.jpg',
    ytUrl:     'https://www.youtube.com/@MHONESHRADDHA/streams',
  },
];

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
const STATUS  = {};  // channelId → { live: bool, videoId: str|null }
let backTimer = null;
let currentTemple = null;  // temple object currently open

// ══════════════════════════════════════════════
// DOM REFS
// ══════════════════════════════════════════════
const homeEl    = document.getElementById('home');
const playerEl  = document.getElementById('player');
const offlineEl = document.getElementById('offline-screen');
const gridEl    = document.getElementById('grid');
const frameEl   = document.getElementById('frame');
const backEl    = document.getElementById('back');
const catchEl   = document.getElementById('catch');
const sdot      = document.getElementById('sdot');
const stext     = document.getElementById('stext');

const offlineTempleNameEl = document.getElementById('offline-temple-name');
const offlineOpenBtn      = document.getElementById('offline-open-btn');
const offlineBackBtn      = document.getElementById('offline-back-btn');

// ══════════════════════════════════════════════
// BUILD GRID
// ══════════════════════════════════════════════
function buildGrid() {
  TEMPLES.forEach(t => {
    const c = document.createElement('div');
    c.className = 'card';
    c.id = 'card-' + t.id;
    c.innerHTML = `
      <img class="card-img" src="${t.img}" alt="${t.name}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        loading="lazy">
      <div class="card-fallback">${t.emoji}</div>
      <div class="card-info">
        <div class="card-name">${t.name}</div>
        <span class="badge loading" id="b-${t.id}">
          <span class="bdot"></span>&nbsp;તપાસ...
        </span>
      </div>`;
    c.addEventListener('click', () => openTemple(t));
    gridEl.appendChild(c);
  });
}

// ══════════════════════════════════════════════
// YOUTUBE LIVE-STATUS CHECK
// ══════════════════════════════════════════════
async function checkAll() {
  setStatus('checking', 'સ્થિતિ તપાસવામાં...');
  await Promise.allSettled(TEMPLES.map(checkOne));
  const anyLive = TEMPLES.some(t => STATUS[t.channelId]?.live);
  setStatus('done', anyLive ? 'કેટલાક મંદિર હાલ લાઈવ છે ✦' : 'હાલ કોઈ લાઈવ નથી');
}

async function checkOne(t) {
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=id&channelId=${t.channelId}&eventType=live` +
      `&type=video&maxResults=1&key=${API_KEY}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    const items = d.items || [];
    if (items.length) {
      STATUS[t.channelId] = { live: true, videoId: items[0].id.videoId };
      badge(t.id, 'live', '● લાઈવ');
    } else {
      STATUS[t.channelId] = { live: false, videoId: null };
      badge(t.id, 'offline', 'ઑફલાઇન');
    }
  } catch (e) {
    console.warn('Live check failed for', t.name, e.message);
    STATUS[t.channelId] = { live: false, videoId: null };
    badge(t.id, 'offline', 'ઑફલાઇન');
  }
}

function badge(id, cls, label) {
  const el = document.getElementById('b-' + id);
  if (!el) return;
  el.className = 'badge ' + cls;
  el.innerHTML = `<span class="bdot"></span>&nbsp;${label}`;
}

function setStatus(state, txt) {
  sdot.className = 'sdot ' + state;
  stext.textContent = txt;
}

// ══════════════════════════════════════════════
// OPEN A TEMPLE
// ══════════════════════════════════════════════
function openTemple(t) {
  currentTemple = t;
  const s = STATUS[t.channelId];

  if (s?.live && s.videoId) {
    // LIVE: embed the stream
    const src =
      `https://www.youtube-nocookie.com/embed/${s.videoId}` +
      `?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    frameEl.src = src;
    showScreen(playerEl);
    triggerBack();
  } else {
    // OFFLINE: show interstitial
    offlineTempleNameEl.textContent = t.name;
    showScreen(offlineEl);
  }
}

// ══════════════════════════════════════════════
// OFFLINE INTERSTITIAL ACTIONS
// ══════════════════════════════════════════════
offlineOpenBtn.addEventListener('click', () => {
  if (currentTemple) window.open(currentTemple.ytUrl, '_blank');
});
offlineOpenBtn.addEventListener('touchend', e => {
  e.preventDefault();
  if (currentTemple) window.open(currentTemple.ytUrl, '_blank');
}, { passive: false });

offlineBackBtn.addEventListener('click', goHome);
offlineBackBtn.addEventListener('touchend', e => {
  e.preventDefault();
  goHome();
}, { passive: false });

// ══════════════════════════════════════════════
// BACK BUTTON (PLAYER)
// ══════════════════════════════════════════════
function triggerBack() {
  clearTimeout(backTimer);
  backEl.classList.add('show');
  catchEl.style.pointerEvents = 'none';  // let taps through to iframe
  backTimer = setTimeout(hideBack, 5000);
}

function hideBack() {
  backEl.classList.remove('show');
  catchEl.style.pointerEvents = 'auto';  // re-arm invisible overlay
}

// invisible overlay → re-show back button on any tap
catchEl.addEventListener('click', triggerBack);
catchEl.addEventListener('touchend', e => {
  e.preventDefault();
  triggerBack();
}, { passive: false });

// back button
backEl.addEventListener('click', e => { e.stopPropagation(); goHome(); });
backEl.addEventListener('touchend', e => {
  e.stopPropagation();
  e.preventDefault();
  goHome();
}, { passive: false });

// ══════════════════════════════════════════════
// NAVIGATION HELPERS
// ══════════════════════════════════════════════
function showScreen(el) {
  [homeEl, playerEl, offlineEl].forEach(s => {
    if (s === el) s.classList.remove('hidden');
    else          s.classList.add('hidden');
  });
}

function goHome() {
  clearTimeout(backTimer);
  hideBack();
  frameEl.src = 'about:blank';
  showScreen(homeEl);
  currentTemple = null;
}

// ══════════════════════════════════════════════
// AUTO-REFRESH EVERY 5 MINUTES
// ══════════════════════════════════════════════
function scheduleRefresh() {
  setTimeout(() => {
    checkAll().then(scheduleRefresh);
  }, 5 * 60 * 1000);
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
buildGrid();
checkAll().then(scheduleRefresh);
