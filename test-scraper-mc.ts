import { scrapeEpisode } from './src/utils/scraper.js';

async function test() {
  console.log(await scrapeEpisode("boku-no-hero-academia-7th-season-1"));
  console.log(await scrapeEpisode("kimetsu-no-yaiba-hashira-geiko-hen-1"));
}
test();
