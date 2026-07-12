import fetch from "node-fetch";

async function test() {
  const res = await fetch("https://www.animeid.tv/v/one-piece-1100");
  const html = await res.text();
  console.log("HTML length:", html.length);
  const match = html.match(/.{0,50}mega\.nz.{0,50}/gi);
  console.log("Mega matches:", match);
  const match2 = html.match(/.{0,50}iframe.{0,50}/gi);
  console.log("Iframe matches:", match2?.slice(0, 5));
}
test();
