import fetch from "node-fetch";

async function test() {
  const res = await fetch("https://www.animeid.tv/v/one-piece-1100");
  const html = await res.text();
  
  const partsRegex = /<ul id="partes">([\s\S]*?)<\/ul>/i;
  const partsMatch = html.match(partsRegex);
  if (partsMatch) {
     console.log(partsMatch[1]);
  }
  
  const liRegex = /data-url="([^"]+)"/g;
  let m;
  while(m = liRegex.exec(html)) {
    console.log("SERVER:", m[1]);
  }
  
  const aRegex = /<iframe[^>]*src="([^"]+)"/g;
  let am;
  while(am = aRegex.exec(html)) {
    console.log("IFRAME:", am[1]);
  }
}
test();
