async function checkVoeDetails() {
  const landingUrl = "https://tracylocalschool.com/e/izdt6shhdfyz";
  const res = await fetch(landingUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
  });
  const text = await res.text();
  
  const b64 = text.match(/let\s+sources\s*=\s*\{([^}]+)\}/i) || text.match(/var\s+sources\s*=\s*\{([^}]+)\}/i) || text.match(/const\s+sources\s*=\s*\{([^}]+)\}/i);
  if (b64) console.log("sources block:", b64[0]);

  const b64strings = text.match(/atob\(['"]([A-Za-z0-9+/=]+)['"]\)/g);
  if (b64strings) {
    b64strings.forEach(s => {
      const inside = s.match(/atob\(['"]([^'"]+)['"]\)/)[1];
      try {
        console.log("Decoded atob:", Buffer.from(inside, "base64").toString("utf-8"));
      } catch(e){}
    });
  }
}
checkVoeDetails();
