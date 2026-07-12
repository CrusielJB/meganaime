import fetch from "node-fetch";

async function test() {
  const res = await fetch("https://www.animeid.tv/v/one-piece-1100");
  const html = await res.text();
  
  // Find script tags containing "var video" or similar
  const scripts = html.match(/<script[\s\S]*?<\/script>/gi);
  if (scripts) {
    for (const s of scripts) {
      if (s.includes("https://") && (s.includes("video") || s.includes("server"))) {
         console.log(s);
      }
    }
  }
}
test();
