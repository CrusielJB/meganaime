import { scrapeEpisode } from "../src/utils/scraper";

async function runTest() {
  const testId = "one-piece-1080";
  console.log(`[TEST] Scraping episode "${testId}" in parallel...`);
  
  const startTime = Date.now();
  try {
    const result = await scrapeEpisode(testId);
    const duration = Date.now() - startTime;
    
    console.log(`[TEST] Completed in ${duration}ms!`);
    console.log(`[TEST] Episode Title: ${result.title}`);
    console.log(`[TEST] Video Url: ${result.videoUrl}`);
    console.log(`[TEST] Servers Count: ${result.videoServers?.length || 0}`);
    console.log(`[TEST] Video Servers:`, JSON.stringify(result.videoServers, null, 2));
    
    if (result.videoServers && result.videoServers.length > 0) {
      console.log(`\n[SUCCESS] Successfully scraped and validated active servers!`);
      process.exit(0);
    } else {
      console.error(`\n[FAILURE] Scraper returned empty servers.`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n[FAILURE] Exception occurred during scrape:`, error);
    process.exit(1);
  }
}

runTest();
