// Vercel Serverless Function (Node.js)
// Denna fil hanterar alla API-anrop till Gemini säkert.

// Tillåt "Cross-Origin Resource Sharing" (CORS) så att din app kan anropa denna funktion
// från både lokala `vercel dev` och din Vercel preview-URL.
const allowCors = (fn) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Du kan låsa detta till din Vercel-URL senare
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Hantera "preflight" OPTIONS-förfrågningar som webbläsare skickar
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// Huvudfunktionen
async function handler(req, res) {
  // Tillåt bara POST-förfrågningar
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'API-nyckel saknas. Har du lagt till GEMINI_API_KEY i Vercels miljövariabler?' });
    return;
  }

  // Hämta prompten och verktygen från klientens förfrågan
  const { prompt, tools } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Ingen "prompt" hittades i förfrågan.' });
    return;
  }

  // URL till Google Gemini API
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  // Bygg upp payloaden för Gemini
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    // Lägg till verktyg om de skickades med
    ...(tools && tools.length > 0 && { tools: tools })
  };

  try {
    // Anropa Gemini API:t
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      // Skicka vidare ett mer detaljerat fel om Google API:t misslyckas
      const errorData = await geminiResponse.json();
      console.error('Fel från Gemini API:', errorData);
      res.status(geminiResponse.status).json({ error: 'Fel vid anrop till Gemini API', details: errorData });
      return;
    }

    const data = await geminiResponse.json();
    
    // Skicka tillbaka det fullständiga svaret från Gemini till din klient
    res.status(200).json(data);

  } catch (error) {
    console.error('Internt serverfel:', error);
    res.status(500).json({ error: 'Internt serverfel', details: error.message });
  }
}

// Exportera den "inlindade" funktionen med CORS-stöd
module.exports = allowCors(handler);