// URL till vår Vercel API-proxy. /api/gemini pekar på api/gemini.js-filen.
const PROXY_URL = '/api/gemini';

/**
 * Anropar vår Vercel-proxy med en hel konversationshistorik och verktyg.
 * @param {Array<Object>} contents - Hela konversationshistoriken (Gemini-format).
 * @param {Array<Object>} [tools] - (Valfritt) En lista med verktygsdefinitioner.
 * @returns {Promise<Object>} - Hela svaret från Gemini (inkl. candidates).
 */
async function callProxy(contents, tools) {
  console.log('Anropar proxy med historik:', contents);
  if (tools) {
    console.log('...och med verktyg:', tools);
  }

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents, // Skicka hela historiken
        ...(tools && { tools: tools }) // Skicka verktyg om de finns
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Fel från API-proxy:', errorData);
      throw new Error(`API-proxy-fel: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log('Svar från proxy:', data);
    return data;

  } catch (error) {
    console.error('Nätverksfel eller fel vid anrop av proxy:', error);
    throw new Error(`Kunde inte anropa proxyn: ${error.message}`);
  }
}

/**
 * En enkel testfunktion för att se om proxyn fungerar.
 * Anropar proxyn med en enkel textsträng.
 * @param {string} prompt - En enkel textfråga.
 * @returns {Promise<string>} - Textsvaret från Gemini.
 */
export async function testGeminiProxy(prompt) {
  console.log('Startar testGeminiProxy...');
  try {
    // Skickar en enkel prompt-sträng (Vår proxy hanterar detta i "FALL 2")
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Fel från API-proxy (test):', errorData);
      const details = errorData.details ? JSON.stringify(errorData.details) : '';
      return `Test misslyckades: ${errorData.error || 'Okänt fel'}${details ? '. Details: ' + details : ''}`;
    }

    const data = await response.json();
    console.log('Testsvar från proxy:', data);

    // Plocka ut textsvaret
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return `Testsvar: ${text}`;
    } else {
      return 'Test lyckades, men fick inget text-svar.';
    }

  } catch (error) {
    console.error('Fel under testGeminiProxy:', error);
    return `Test misslyckades: ${error.message}`;
  }
}


/**
 * Kör hela Gemini-agent-loopen med verktyg.
 * @param {string} userPrompt - Användarens ursprungliga fråga.
 * @param {Array<Object>} toolDefinitions - JSON-schemadefinitioner för dina verktyg.
 * @param {Object} toolRegistry - Ett objekt där nycklar är verktygsnamn och värden är de faktiska lokala JS-funktionerna (t.ex. { createCard: boardView.createCard }).
 * @param {Array<Object>} [chatHistory] - (Valfritt) Befintlig chatthistorik.
 * @returns {Promise<string>} - Det slutgiltiga textsvaret från AI:n.
 */
export async function executeGeminiAgent(userPrompt, toolDefinitions, toolRegistry, chatHistory = []) {
  
  // 1. Lägg till användarens nya fråga i historiken
  let history = [
    ...chatHistory,
    { role: 'user', parts: [{ text: userPrompt }] }
  ];

  let safetyStop = 0; // Förhindra oändliga loopar
  const MAX_LOOPS = 10;

  while (safetyStop < MAX_LOOPS) {
    safetyStop++;

    // 2. Anropa proxyn med den aktuella historiken och verktygen
    const data = await callProxy(history, toolDefinitions);

    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('Inget giltigt svar (candidate) från Gemini.');
    }

    const responsePart = candidate.content.parts[0];
    
    // 3. Lägg till AI:ns svar (även om det är ett toolCall) i historiken
    // Vi måste skicka tillbaka detta till Gemini, annars blir den förvirrad
    history.push({
      role: 'model',
      parts: candidate.content.parts
    });

    // 4. Kolla om svaret är ett funktionsanrop (Tool Call)
    if (responsePart.functionCall) {
      const call = responsePart.functionCall;
      const toolName = call.name;
      const toolArgs = call.args;

      console.log(`Agenten vill anropa verktyg: ${toolName}`, toolArgs);

      // Hitta den faktiska lokala funktionen i vårt register
      const toolFunction = toolRegistry[toolName];

      if (toolFunction) {
        try {
          // 5. Kör den lokala funktionen
          const result = await toolFunction(toolArgs);

          // 6. Lägg till verktygets *resultat* i historiken
          history.push({
            role: 'function', // Särskild roll för verktygssvar
            parts: [
              { functionResponse: { name: toolName, response: { result: result } } }
            ]
          });
          
          // 7. Fortsätt loopen: Skicka den uppdaterade historiken (med verktygsresultatet) tillbaka till Gemini
          // för att få ett slutgiltigt text-svar.
          console.log('Verktyg kört. Fortsätter loopen med resultat.');
          continue; 

        } catch (error) {
          console.error(`Fel vid körning av lokalt verktyg "${toolName}":`, error);
          // Lägg till ett felmeddelande i historiken och fortsätt
          history.push({
            role: 'function',
            parts: [
              { functionResponse: { name: toolName, response: { error: `Fel: ${error.message}` } } }
            ]
          });
          continue;
        }
      } else {
        console.warn(`Gemini försökte anropa ett okänt verktyg: ${toolName}`);
        // Lägg till ett felmeddelande och fortsätt
        history.push({
          role: 'function',
          parts: [
            { functionResponse: { name: toolName, response: { error: 'Fel: Verktyget finns inte.' } } }
          ]
        });
        continue;
      }
    } 
    
    // 8. Om det INTE var ett funktionsanrop, då är det ett vanligt text-svar.
    // Då är loopen klar!
    if (responsePart.text) {
      console.log('Agenten gav ett slutgiltigt textsvar:', responsePart.text);
      return {
        responseText: responsePart.text,
        finalHistory: history
      };
    }

    // Om vi hamnar här var svaret varken text eller toolcall (konstigt)
    throw new Error('Gemini-svar var varken text eller funktionsanrop.');
  }

  // Om vi når hit har vi fastnat i en loop
  throw new Error('Agenten fastnade i en loop utan att ge ett textsvar.');
}

/**
 * Read image with Gemini Vision API
 * @param {string} cardId - The card ID to read
 * @returns {Promise<string>} - The extracted text from the image
 */
export async function readImageWithGemini(cardId) {
  try {
    // Import storage functions
    const { getCard, updateCard } = await import('./storage.js');

    // Get the card
    const card = await getCard(cardId);
    if (!card || !card.image) {
      throw new Error('Inget bildkort hittades');
    }

    // Get base64 image data
    const imageData = typeof card.image === 'string' ? card.image : card.image.base64;

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;

    // Determine mime type from data URL or default to jpeg
    let mimeType = 'image/jpeg';
    if (imageData.startsWith('data:')) {
      const match = imageData.match(/data:([^;]+);/);
      if (match) mimeType = match[1];
    }

    console.log('Skickar bild till Gemini för OCR...');

    // Call Gemini API with vision
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Läs all text i denna bild. Skriv ut texten exakt som den står, bevara formatering och struktur. Om det inte finns någon text, beskriv bilden kortfattat.'
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Detaljerat fel från Gemini API:', errorData);
      const details = errorData.details ? JSON.stringify(errorData.details) : '';
      throw new Error(`Gemini API-fel: ${errorData.error || response.statusText}${details ? '. Details: ' + details : ''}`);
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!extractedText) {
      throw new Error('Inget svar från Gemini');
    }

    console.log('Gemini OCR resultat:', extractedText);

    // Update card with extracted text on the back
    await updateCard(cardId, {
      backText: extractedText,
      flipped: false // Keep it on front, user can flip to see back
    });

    return extractedText;

  } catch (error) {
    console.error('Fel vid Gemini bildläsning:', error);
    throw error;
  }
}