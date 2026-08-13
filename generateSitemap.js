import fs from 'fs';
import path from 'path';

const catalogPath = path.join(process.cwd(), 'src/data/catalog.json');
const distPath = path.join(process.cwd(), 'dist');
const sitemapPath = path.join(distPath, 'sitemap.xml');

let catalog = [];
try {
  if (fs.existsSync(catalogPath)) {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  }
} catch (e) {
  console.error("Error reading catalog for sitemap:", e);
}

const todayStr = new Date().toISOString().split('T')[0];

let urlsXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://megaanime.net/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

catalog.forEach(anime => {
  if (!anime.id) return;
  const cleanId = encodeURIComponent(anime.id);
  urlsXml += `
  <url>
    <loc>https://megaanime.net/anime/${cleanId}</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
});

urlsXml += `\n</urlset>`;

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

fs.writeFileSync(sitemapPath, urlsXml, 'utf8');
console.log(`[SEO] Successfully generated dist/sitemap.xml with ${catalog.length + 1} URLs.`);
