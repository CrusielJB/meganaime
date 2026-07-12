import { scrapeEpisode } from './src/utils/scraper.js';

async function test() {
  console.log(await scrapeEpisode("one-piece-1100"));
}
test();
