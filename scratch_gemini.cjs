const fs = require('fs');

async function testGemini() {
  const models = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro", "gemini-flash-latest"];
  const b64Key = process.env.VITE_GEMINI_KEY_B64 || ""; // I'll grab from .env
  
  // Read .env
  const envFile = fs.readFileSync('.env', 'utf-8');
  const match = envFile.match(/VITE_GEMINI_KEY_B64=(.*)/);
  let GEMINI_API_KEY = "";
  if (match) {
    GEMINI_API_KEY = Buffer.from(match[1], 'base64').toString('utf-8');
  } else {
    const match2 = envFile.match(/VITE_GEMINI_API_KEY=(.*)/);
    if (match2) {
      GEMINI_API_KEY = match2[1];
    }
  }

  const payload = {
    contents: [
      { role: "user", parts: [{ text: "Onde fica a pasta de documentos" }] }
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  };

  for (const model of models) {
    console.log("Testing model:", model);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log(`Model ${model} returned status: ${res.status}`);
      if (res.status !== 200) {
        console.log("Error data:", data);
      } else {
        console.log("Success for", model);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

testGemini();
