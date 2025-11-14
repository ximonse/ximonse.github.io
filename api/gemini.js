// api/gemini.js
const fetch = require('node-fetch');

// Huvudfunktionen för Vercel serverless function
module.exports = async function handler(request, response) {
  // 1. Säkerhetsåtgärd: Tillåt endast POST-anrop
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // 2. Hämta API-nyckeln från serverns miljövariabler
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_AI_API_KEY is not set on the server.');
    response.status(500).json({ error: 'Server configuration error: API key is missing.' });
    return;
  }

  // 3. Bygg URL:en till Google AI API
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;

  try {
    // 4. Vidarebefordra klientens request body till Gemini
    // request.body innehåller redan den deserialiserade JSON-datan
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body), // Se till att skicka vidare som en JSON-sträng
    });

    // 5. Hantera fel från Gemini API
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Error from Gemini API:', errorData);
      response.status(geminiResponse.status).json({
        error: 'Failed to get a valid response from Gemini API.',
        details: errorData,
      });
      return;
    }

    // 6. Skicka tillbaka det framgångsrika svaret från Gemini till klienten
    const data = await geminiResponse.json();
    response.status(200).json(data);

  } catch (error) {
    console.error('Error in the proxy function:', error);
    response.status(500).json({ error: 'An internal server error occurred.' });
  }
}
