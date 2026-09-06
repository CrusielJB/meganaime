async function testProxy() {
  const target = "https://vidcache.net:8161/a2026082563P80JxjEJD/video.mp4";
  const referer = "https://www.yourupload.com/embed/0hR0YgPXjOjd";
  
  const proxyUrl = `https://megaanime-1c250.web.app/api/proxy-stream?url=${encodeURIComponent(target)}&referer=${encodeURIComponent(referer)}`;
  console.log("Testing proxy URL:", proxyUrl);
  
  try {
    const res = await fetch(proxyUrl, { headers: { "Range": "bytes=0-100" } });
    console.log("Proxy status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
  } catch(e) {
    console.log("Proxy error:", e.message);
  }
}
testProxy();
