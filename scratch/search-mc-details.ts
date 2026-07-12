import fetch from 'node-fetch';

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
};

async function searchMc() {
  const domain = "https://monoschinos.st";
  const url = `${domain}/buscar?q=daemons`;
  console.log("Searching MonosChinos for 'daemons' via:", url);
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      const html = await res.text();
      const regex = /href=["']?(?:https?:\/\/[^\/]+)?\/anime\/([^"'\s>]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      console.log("Results found:");
      while ((match = regex.exec(html)) !== null) {
        const slug = match[1];
        const title = match[2].replace(/<[^>]*>/g, "").trim();
        if (title) {
          console.log(`  - Title: "${title}", Slug: "${slug}"`);
        }
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

searchMc().catch(console.error);
