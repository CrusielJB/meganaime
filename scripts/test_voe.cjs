async function testVoeLanding() {
  const landingUrl = "https://tracylocalschool.com/e/izdt6shhdfyz";
  const res = await fetch(landingUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  console.log("Landing status:", res.status, "len:", html.length);
  const m = html.match(/https?:\/\/[^"'`\s\\]+\.m3u8\b[^"'`\s]*/i) || html.match(/https?:\/\/[^"'`\s\\]+\.mp4\b[^"'`\s]*/i);
  if (m) console.log("Found in VOE landing:", m[0]);
  
  // also check if any JSON or base64 sources exist
  const hlsMatch = html.match(/'hls':\s*'([^']+)'/i) || html.match(/"hls":\s*"([^"]+)"/i);
  if (hlsMatch) console.log("HLS match:", hlsMatch[1]);

  const directMatch = html.match(/'mp4':\s*'([^']+)'/i) || html.match(/"mp4":\s*"([^"]+)"/i);
  if (directMatch) console.log("MP4 match:", directMatch[1]);
}
testVoeLanding();
