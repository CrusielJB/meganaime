import fetch from "node-fetch";

async function run() {
  const res = await fetch("https://www.animeid.tv/v/one-piece-1100");
  const text = await res.text();
  const arr = text.split('\n').filter(l => l.includes('data-url') || l.includes('iframe') || l.includes('video'));
  console.log(arr.join('\n').slice(0, 1000));
}
run();
