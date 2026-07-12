async function runTest() {
  const url = "http://localhost:3000/api/episode/one-piece-1080";
  console.log(`[TEST] Fetching API endpoint: ${url}`);
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[FAILURE] Server returned status ${res.status}`);
      process.exit(1);
    }
    const data = await res.json();
    console.log(`[TEST] Response status: ${res.status}`);
    console.log(`[TEST] Episode Title: ${data.title}`);
    console.log(`[TEST] Video Url: ${data.videoUrl}`);
    console.log(`[TEST] Servers Count: ${data.videoServers?.length || 0}`);
    console.log(`[TEST] Video Servers:`, JSON.stringify(data.videoServers, null, 2));
    
    if (data.videoServers && data.videoServers.length > 0) {
      console.log(`\n[SUCCESS] API endpoint returned valid servers list!`);
      process.exit(0);
    } else {
      console.error(`\n[FAILURE] API returned empty servers list.`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n[FAILURE] Failed to connect to server:`, err.message);
    process.exit(1);
  }
}

runTest();
