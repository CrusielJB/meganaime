async function test() {
  const url = "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4";
  try {
    console.log("Testing Mixkit fetch...");
    const res = await fetch(url, { method: "HEAD" });
    console.log("Mixkit Status:", res.status);
    console.log("Content-Length:", res.headers.get("content-length"));
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
