const TEMPLES = [
  {
    id:        'somnath',
    name:      'સોમનાથ',
    channelId: 'UCT1egsvA08YcdMLiEu1DTRg',
    emoji:     '🔱',
    img:       'img/somnath.jpg',
    ytUrl:     'https://www.youtube.com/@SomnathTempleOfficialChannel/live',
  },
  {
    id:        'mahakal',
    name:      'મહાકાળેશ્વર',
    channelId: 'UC7hmH7rEu5HPA8iDT7zkEow',
    emoji:     '🕉️',
    img:       'img/mahakal.jpg',
    ytUrl:     'https://www.youtube.com/@ujjainmahakallive/live',
  },
  {
    id:        'dwarka',
    name:      'દ્વારકાધીશ',
    channelId: 'UCBAvMHZO3BIfMMhOK9LMOYQ',
    emoji:     '🪷',
    img:       'img/dwarka.jpg',
    ytUrl:     'https://www.youtube.com/channel/UCBAvMHZO3BIfMMhOK9LMOYQ/live',
  },
  {
    id:        'vaishno',
    name:      'વૈષ્ણો દેવી',
    channelId: 'UCziZy6xAlJWPzgIY4duxAeQ',
    emoji:     '🌸',
    img:       'img/vaishno.jpg',
    ytUrl:     'https://www.youtube.com/@MHONESHRADDHA/live',
  },
];

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
const STATUS  = {};  // channelId → { live: bool, videoId: str|null, upcoming: bool, scheduledStartTime: str }
let backTimer = null;
let currentTemple = null;  // temple object currently open
let player = null;         // YouTube Player instance
let ytReady = false;       // YouTube IFrame API ready status

// ══════════════════════════════════════════════
// DOM REFS
// ══════════════════════════════════════════════
const homeEl    = document.getElementById('home');
const playerEl  = document.getElementById('player');
const offlineEl = document.getElementById('offline-screen');
const gridEl      = document.getElementById('grid');
const containerEl = document.getElementById('frame-container');
const backEl      = document.getElementById('back');

function resetPlayerDOM() {
  if (player) {
    try { player.destroy(); } catch (e) {}
    player = null;
  }
  containerEl.innerHTML = '<div id="frame"></div>';
}
const catchEl   = document.getElementById('catch');
const sdot      = document.getElementById('sdot');
const stext     = document.getElementById('stext');
const refreshBtn = document.getElementById('refresh');

const offlineTempleNameEl = document.getElementById('offline-temple-name');
const offlineMsgEl        = document.getElementById('offline-msg');
const offlineSubEl        = document.getElementById('offline-sub');
const offlineOpenBtn      = document.getElementById('offline-open-btn');
const offlineBackBtn      = document.getElementById('offline-back-btn');

// YouTube API ready callback
window.onYouTubeIframeAPIReady = function() {
  ytReady = true;
};

// Gujarati date formatting helper
function formatTimeGujarati(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const options = { 
      day: 'numeric', 
      month: 'long', 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    };
    return d.toLocaleDateString('gu-IN', options);
  } catch (e) {
    return "";
  }
}

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
  setStatus('checking', 'મંદિરની લાઈવ સ્થિતિ તપાસવામાં આવી રહી છે...');
  await Promise.allSettled(TEMPLES.map(checkOne));
  
  const total = TEMPLES.length;
  const liveCount = TEMPLES.filter(t => STATUS[t.channelId]?.live).length;
  
  let msg = 'હાલ કોઈ મંદિર લાઈવ નથી';
  if (liveCount === total) {
    msg = 'બધા જ મંદિર હાલ લાઈવ છે!';
  } else if (liveCount > 0) {
    msg = 'કેટલાક મંદિર હાલ લાઈવ છે';
  }
  
  setStatus('done', msg);
}

async function checkOne(t) {
  try {
    const r = await fetch(
      `https://darshan-app.joshikalp111.workers.dev/?channel=${t.channelId}`
    );

    const data = await r.json();

    STATUS[t.channelId] = data;

    if (data.live) {
      badge(t.id, "live", "લાઈવ");
    } else if (data.upcoming) {
      badge(t.id, "upcoming", "નિયત કરેલ છે");
    } else {
      badge(t.id, "offline", "ઑફલાઇન");
    }

    return data;

  } catch (e) {
    console.warn(e);

    STATUS[t.channelId] = {
      live: false,
      videoId: null
    };

    badge(t.id, "offline", "ઑફલાઇન");

    return STATUS[t.channelId];
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
async function openTemple(t) {
  currentTemple = t;
  let s = STATUS[t.channelId];

  if (s === undefined || (!s.live && !s.upcoming)) {
    badge(t.id, "loading", "તપાસ...");
    s = await checkOne(t);
  }

  if (s.live && s.videoId) {
    showScreen(playerEl);
    triggerBack();

    // Load YouTube video with iframe API to catch embedding restrictions
    if (window.YT && ytReady) {
      if (player) {
        try { player.destroy(); } catch (e) {}
      }
      player = new YT.Player('frame', {
        videoId: s.videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1
        },
        events: {
          'onError': onPlayerError
        }
      });
    } else {
      // Fallback if API not ready
      containerEl.innerHTML = `
        <iframe class="p-frame-inner" id="frame"
          src="https://www.youtube-nocookie.com/embed/${s.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
          style="width: 100%; height: 100%; border: none; position: absolute; inset: 0;">
        </iframe>`;
    }
  } else {
    offlineTempleNameEl.textContent = t.name;
    
    // Dynamic message for scheduled or normal offline state
    if (s.upcoming && s.scheduledStartTime) {
      offlineMsgEl.textContent = "આગામી લાઈવ પ્રસારણ";
      offlineSubEl.textContent = "આગામી સમય: " + formatTimeGujarati(s.scheduledStartTime);
    } else {
      offlineMsgEl.textContent = "હાલ લાઈવ નથી";
      offlineSubEl.textContent = "છેલ્લા વિડિઓ YouTube પર જોઈ શકો છો";
    }
    
    showScreen(offlineEl);
  }
}

function onPlayerError(event) {
  console.warn("YouTube Player error:", event.data);
  // 101 or 150 = embedding restricted by owner
  if (event.data === 101 || event.data === 150) {
    if (currentTemple) {
      offlineTempleNameEl.textContent = currentTemple.name;
    }
    offlineMsgEl.textContent = "આ એપમાં ઉપલબ્ધ નથી";
    offlineSubEl.textContent = "આ વિડિઓ ફક્ત YouTube પર જ જોઈ શકાશે";
    showScreen(offlineEl);

    resetPlayerDOM();
  }
}

// ══════════════════════════════════════════════
// OFFLINE INTERSTITIAL ACTIONS
// ══════════════════════════════════════════════
offlineOpenBtn.addEventListener('click', () => {
  if (currentTemple) {
    const s = STATUS[currentTemple.channelId];
    if (s && s.videoId) {
      window.open(`https://www.youtube.com/watch?v=${s.videoId}`, '_blank');
    } else {
      window.open(currentTemple.ytUrl, '_blank');
    }
  }
});
offlineOpenBtn.addEventListener('touchend', e => {
  e.preventDefault();
  if (currentTemple) {
    const s = STATUS[currentTemple.channelId];
    if (s && s.videoId) {
      window.open(`https://www.youtube.com/watch?v=${s.videoId}`, '_blank');
    } else {
      window.open(currentTemple.ytUrl, '_blank');
    }
  }
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
  resetPlayerDOM();
  showScreen(homeEl);
  currentTemple = null;
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
refreshBtn.addEventListener('click', checkAll);
buildGrid();
checkAll();

// Load the YouTube Iframe Player API asynchronously
if (!window.YT) {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else if (window.YT && window.YT.Player) {
  ytReady = true;
}
