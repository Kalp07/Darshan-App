# દર્શન — Live Temple Darshan App

A simple Progressive Web App (PWA) for the iPad that lets grandma watch live temple darshan with a single tap.

---

## What It Does

- Shows 4 temple cards on a beautiful dark/gold home screen in Gujarati
- Automatically checks YouTube every 5 minutes for live streams
- If a temple is **live** → taps opens the embedded live stream directly
- If a temple is **offline** → taps shows a friendly interstitial with a button to open YouTube in a new tab (to browse recent videos)
- Back button appears for 5 seconds, then hides; tapping the screen brings it back

---

## Project Structure

```
darshan/
├── index.html          ← app shell
├── css/
│   └── style.css       ← all styles
├── js/
│   └── app.js          ← all logic (config, live-check, navigation)
├── img/
│   ├── somnath.jpg     ← Somnath temple photo
│   ├── mahakal.jpg     ← Mahakaleshwar temple photo
│   ├── dwarka.jpg      ← Dwarkadhish temple photo
│   └── vaishno.jpg     ← Vaishno Devi temple photo
└── README.md
```

---

## Setup

### 1. Add Temple Images

Place your 4 photos in the `img/` folder with exactly these names:

| File | Temple |
|------|--------|
| `somnath.jpg` | Somnath |
| `mahakal.jpg` | Mahakaleshwar, Ujjain |
| `dwarka.jpg` | Dwarkadhish, Dwarka |
| `vaishno.jpg` | Vaishno Devi |

Portrait or square crops work best (the cards use a 3:4 ratio).
Wikipedia photos are fine — just right-click → Save Image in your browser.

### 2. Get a YouTube Data API v3 Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable **YouTube Data API v3**
4. Go to **Credentials → Create Credentials → API key**
5. Copy the key

### 3. Restrict the API Key (important — prevents abuse)

1. Still in Credentials, click **Edit** on your key
2. Under **Application restrictions** → select **HTTP referrers**
3. Add: `https://YOUR_GITHUB_USERNAME.github.io/*`
4. Save

This means the key only works when called from your GitHub Pages URL.
Even if someone reads your source, they can't use it from elsewhere.

### 4. Add the Key to the App

Open `js/app.js` and replace the placeholder on line 10:

```js
const API_KEY = 'YOUR_API_KEY_HERE';
```

### 5. Deploy to GitHub Pages

```bash
# First time
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/darshan.git
git push -u origin main

# Go to repo Settings → Pages → Source: main branch / root
# Your app will be live at: https://YOUR_USERNAME.github.io/darshan/
```

For updates later:
```bash
git add .
git commit -m "update"
git push
```

---

## Installing on the iPad

1. Open Safari on the iPad
2. Go to `https://YOUR_USERNAME.github.io/darshan/`
3. Tap the **Share** button (box with arrow)
4. Tap **"Add to Home Screen"**
5. Tap **Add**

The app now appears as a full-screen icon on the home screen with no browser chrome.

---

## Adding More Temples

In `js/app.js`, add an entry to the `TEMPLES` array:

```js
{
  id:        'kashi',             // unique short name (no spaces)
  name:      'કાશી વિશ્વનાથ',     // Gujarati display name
  channelId: 'UCxxxxxxxxxxxxxxxxx', // YouTube channel ID (see below)
  emoji:     '🔱',               // fallback if image fails to load
  img:       'img/kashi.jpg',    // put this file in img/
  ytUrl:     'https://www.youtube.com/channel/UCxxxxxxxxxx/videos',
},
```

**How to find a YouTube Channel ID:**
1. Go to the channel on YouTube
2. Click **About** tab
3. Click **Share channel → Copy channel ID**
   (It starts with `UC...`)

Then add the corresponding `img/kashi.jpg` file.

---

## How the Live Check Works

Every 5 minutes, the app calls the YouTube Data API v3:

```
GET /youtube/v3/search
  ?part=id
  &channelId={channelId}
  &eventType=live
  &type=video
  &maxResults=1
  &key={API_KEY}
```

If `items` is non-empty, the channel is live. The video ID is extracted and embedded via `youtube-nocookie.com` for a clean player with minimal branding.

---

## API Quota

The YouTube Data API gives you **10,000 units/day** for free.
Each `search` call costs **100 units**.
4 temples × every 5 min × 24 hrs = 4 × 288 = **1,152 units/day** well within the limit.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| All temples show "ઑફલાઇન" | API key invalid or not restricted correctly | Check Cloud Console logs |
| Images not showing | Wrong filename in `img/` | Double-check filenames are exact matches |
| App not full-screen on iPad | Not installed via "Add to Home Screen" | Re-install from Safari Share menu |
| Back button doesn't appear | Tap the screen once | It hides after 5 sec, tap to bring back |
| "YouTube refused to connect" in iframe | Happens with channel/playlist URLs | This is fixed — only video IDs are embedded now |
