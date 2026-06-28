/**
 * Darshan App - YouTube Live Status Cloudflare Worker
 * 
 * This worker implements a hybrid workflow to check if a YouTube channel is live:
 * 1. Zero-Quota RSS Feed Check: Fetches the channel's live stream playlist RSS feed (UULV...)
 *    and standard upload RSS feed. Extracting video IDs from here is 100% reliable and bypassed
 *    YouTube's anti-bot blocks.
 * 2. Low-Quota API Status Check: Queries YouTube's official `videos.list` endpoint for the candidate IDs.
 *    This costs only 1 API quota unit (100x cheaper than `search.list`), allowing up to 10,000 checks/day.
 * 3. Robust HTML Scraper Fallback: If the API fails or quota is exhausted, falls back to scrape the HTML.
 * 4. Edge Caching: Caches statuses at Cloudflare's edge for 2 minutes to keep quota usage minimal.
 */

const API_KEY = "AIzaSyAbS9-AVTAGaMc5YqawUAbpXxzTLsRGYLY"; // Default fallback key

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const channelId = url.searchParams.get("channel");

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (!channelId) {
      return Response.json(
        { error: "Missing channel parameter." },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Determine API Key from environment or fallback
    const apiKey = env.YOUTUBE_API_KEY || API_KEY;

    // Use Cache API (caches GET requests with status 200 and Cache-Control headers)
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      // Re-apply CORS headers to the cached response if needed
      const headers = new Headers(cachedResponse.headers);
      for (const [key, val] of Object.entries(corsHeaders())) {
        headers.set(key, val);
      }
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers
      });
    }

    try {
      // 1. Fetch candidate video IDs from RSS feeds
      const videoIds = await fetchVideoIdsFromFeeds(channelId);

      let result = null;
      let apiFailed = false;

      if (videoIds && videoIds.length > 0) {
        try {
          // 2. Query YouTube API for live status
          const idsToQuery = videoIds.slice(0, 5).join(",");
          const apiRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${idsToQuery}&key=${apiKey}`
          );

          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            const items = apiJson.items || [];
            
            // Find the video that is currently streaming live
            const liveItem = items.find(
              (item) => item.snippet?.liveBroadcastContent === "live"
            );

            // Find if there is an upcoming scheduled stream
            const upcomingItem = items.find(
              (item) => item.snippet?.liveBroadcastContent === "upcoming"
            );

            if (liveItem) {
              result = { live: true, videoId: liveItem.id };
            } else if (upcomingItem) {
              result = { 
                live: false, 
                videoId: null, 
                upcoming: true, 
                scheduledStartTime: upcomingItem.liveStreamingDetails?.scheduledStartTime || null 
              };
            } else {
              result = { live: false, videoId: null };
            }
          } else {
            apiFailed = true;
          }
        } catch (apiErr) {
          apiFailed = true;
        }
      }

      // 3. Fallback to HTML scraping if feed had no IDs or the API failed
      if (result === null || apiFailed) {
        result = await fallbackScrapeLiveStatus(channelId);
      }

      // Construct JSON Response
      const response = Response.json(result, {
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=120" // Cache for 2 minutes
        }
      });

      // Cache the response asynchronously
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;
    } catch (err) {
      return Response.json(
        { error: err.message },
        { status: 500, headers: corsHeaders() }
      );
    }
  }
};

/**
 * Fetch video IDs from the channel's XML feeds.
 * - UULV...: Live streams playlist feed
 * - UC...: Channel uploads feed
 */
async function fetchVideoIdsFromFeeds(channelId) {
  const suffix = channelId.substring(2);
  const feeds = [
    `https://www.youtube.com/feeds/videos.xml?playlist_id=UULV${suffix}`,
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  ];

  const videoIds = new Set();

  for (const url of feeds) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RSS Reader"
        }
      });
      if (res.ok) {
        const xml = await res.text();
        const matches = xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g);
        for (const match of matches) {
          videoIds.add(match[1]);
        }
      }
    } catch (e) {
      // Gracefully continue to check other feeds
    }
  }

  return Array.from(videoIds);
}

/**
 * Fallback to scraping the channel live page if API is down or quota-depleted.
 */
async function fallbackScrapeLiveStatus(channelId) {
  try {
    const yt = await fetch(
      `https://www.youtube.com/channel/${channelId}/live?hl=en`,
      {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      }
    );

    const finalUrl = yt.url;
    const videoIdFromRedirect = finalUrl.match(/youtube\.com\/watch\?v=([^&]+)/)?.[1];

    if (videoIdFromRedirect) {
      return { live: true, videoId: videoIdFromRedirect };
    }

    const html = await yt.text();

    const canonical = html.match(
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([^"]+)"/
    );
    if (canonical) {
      return { live: true, videoId: canonical[1] };
    }

    const live = html.match(
      /"liveStreamabilityRenderer":\{"videoId":"([^"]+)"/
    );
    if (live) {
      const isLiveActive = html.includes('"style":"PLAYBACK_STYLE_LIVE"') || 
                           html.includes('"isLive":true') || 
                           html.includes('"status":"LIVE"');
      if (isLiveActive) {
        return { live: true, videoId: live[1] };
      }
      
      const isUpcoming = html.includes('"style":"PLAYBACK_STYLE_SCHEDULED"') || 
                         html.includes('"status":"UPCOMING"') ||
                         html.includes('"isLive":false');
      if (isUpcoming) {
        return { live: false, videoId: null, upcoming: true };
      }
    }

    return { live: false, videoId: null };
  } catch (err) {
    return { live: false, videoId: null, error: err.message };
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };
}
