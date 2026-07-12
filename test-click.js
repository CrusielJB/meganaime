import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('ERROR:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  // Try to click an anime card
  try {
    const cards = await page.$$('.cursor-pointer'); // assuming cards have this class
    if (cards.length > 0) {
      console.log(`Found ${cards.length} clickable elements. Clicking the first one...`);
      await cards[0].click();
      await new Promise(r => setTimeout(r, 2000)); //(2000);
      const html = await page.evaluate(() => document.body.innerText);
      console.log('VISIBLE TEXT AFTER CLICK:', html.substring(0, 500));
    }
  } catch (err) {
    console.log("Click failed:", err);
  }

  await browser.close();
})();
