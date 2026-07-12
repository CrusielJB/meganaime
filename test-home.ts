import { scrapeHome } from './src/utils/scraper.js';

async function run() {
  console.log(await scrapeHome());
}
run();
