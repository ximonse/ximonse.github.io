/**
 * Detta är den nya "hjärnan" för din Gemini-assistent på klientsidan.
 * Den hanterar hela "agent-loopen" med "Tool Calling".
 *
 * 1. Den anropar din säkra Vercel-proxy (/api/gemini).
 * 2. Den tar emot ett svar.
 * 3. Om svaret är text -> returnera det till chatten.
 * 4. Om svaret är ett funktionsanrop (Tool Call) -> pausa.
 * 5. Den kör din LOKALA app-funktion (t.ex. boardView.createCard).
 * 6. Den skickar resultatet från funktionen tillbaka till proxyn.
 * 7. Den väntar på ett nytt svar (t.ex. "Okej, jag har skapat kortet!").
 * 8. Den returnerar det slutliga textsvaret.
 */

// URL till din proxy.
// Den fungerar både lokalt (`vercel dev`) och i produktion.
const API_PROXY_URL = '/api/gemini';

/**
 * Huvudfunktion som kör hela chat-agent-flödet.
 *
 * @param {string} userPrompt - Användarens textmeddelande.
 * @param {Array<Object>} toolDefinitions - JSON-schemat för dina verktyg.
 * @param {Object} toolRegistry - En mappning av verktygsnamn till dina faktiska lokala JS-funktioner.
 * Exempel: { 'createCard': (args) => boardView.createCard(args.content, args.x, args.y) }
 * @param {Array<Object>} [history=[]] - (Valfri) En befintlig chatthistorik att fortsätta på.
 * @returns {Promise<string>} - Ett löfte som löses med Geminis slutgiltiga textsvar.
 */
export async function executeGeminiAgent(userPrompt, toolDefinitions, toolRegistry, history = []) {
  console.log('Startar Gemini Agent-flöde...');

  // Lägg till användarens nya meddelande i historiken
  const chatHistory = [
    ...history,
    { role: 'user', parts: [{ text: userPrompt }] }
  ];

  try {
    // Starta agent-loopen. Den kan köra flera varv om verktyg anropas.
    while (true) {
      // 1. Bygg payloaden för proxyn
      //    Vi skickar ALLTID hela historiken.
      const proxyPayload = {
        // ÄNDRING 1: Skicka hela 'chatHistory' istället för bara 'userPrompt'.
        // Detta är avgörande för att Gemini ska minnas konversationen.
        contents: chatHistory,
        tools: toolDefinitions
      };

      // 2. Anropa din säkra proxy
      const response = await fetch(API_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Fel från API-proxy:', errorData);
        throw new Error(`API-fel: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      // 3. Analysera Geminis svar
      if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        throw new Error('Inget giltigt svar (candidates) från Gemini.');
      }

      const candidate = data.candidates[0];
      const part = candidate.content.parts[0];

      // 4. Kolla om Gemini vill anropa ett verktyg eller bara prata
      if (part.functionCall) {
        // ----- FALL 1: GEMINI VILL AGERA (Tool Call) -----
        const functionCall = part.functionCall;
        const toolName = functionCall.name;
        const toolArgs = functionCall.args;

        console.log(`Gemini anropar verktyg: ${toolName}`, toolArgs);

        // ÄNDRING 2: Lägg till Geminis 'functionCall'-svar i historiken
        // så att den vet vad den just gjorde.
        chatHistory.push(candidate.content);

        // Hitta den lokala funktionen i ditt register
        const localFunction = toolRegistry[toolName];
        if (!localFunction) {
          throw new Error(`Okänt verktyg anropat av Gemini: ${toolName}`);
        }

        // Kör den lokala funktionen (t.ex. boardView.createCard)
        // Vi använder try/catch här för att rapportera fel tillbaka till Gemini
        let functionResult;
        try {
          const result = await localFunction(toolArgs);
          // Se till att resultatet är något vi kan JSON-stringifiera
          functionResult = result || { success: true };
        } catch (e) {
          console.error(`Fel vid körning av lokalt verktyg: ${toolName}`, e);
          functionResult = { success: false, error: e.message };
        }

        console.log('Resultat från lokalt verktyg:', functionResult);

        // ÄNDRING 3: Lägg till *resultatet* av funktionen i historiken
        // Detta är det viktiga "function"-svaret.
        chatHistory.push({
          role: 'function', // Särskild roll för verktygssvar
          parts: [{
            functionResponse: {
              name: toolName,
              response: {
                // Innehållet MÅSTE vara ett objekt,
                // även om det bara är en enkel sträng.
                content: typeof functionResult === 'object' 
                  ? functionResult 
                  : { result: functionResult }
              },
            },
          }],
        });

        // ÄNDRING 4: Starta om loopen
        // Gå tillbaka till början av 'while(true)' och anropa Gemini igen,
        // denna gång med historiken som nu innehåller verktygets resultat.
        // Gemini kommer då att generera ett text-svar, t.ex. "Okej, jag skapade kortet!".
        continue; 

      } else if (part.text) {
        // ----- FALL 2: GEMINI SVARAR MED TEXT -----
        console.log('Gemini svarade med text.');
        // Detta är det slutgiltiga textsvaret. Returnera det och avsluta loopen.
        return part.text;
      } else {
        // Fånga upp oväntade svar
        throw new Error('Oväntat svar från Gemini, varken text eller functionCall.');
      }
    } // slut på while-loop

  } catch (error) {
    console.error('Fel i executeGeminiAgent:', error);
    return `Ett fel inträffade: ${error.message}`;
  }
}

/**
 * En enkel testfunktion du kan anropa från din main.js för att se
 * att proxyn och denna fil fungerar.
 */
export async function testGeminiProxy(testPrompt = "Hej, fungerar detta?") {
  console.log('Testar Gemini-proxy...');
  
  const response = await fetch(API_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: testPrompt }) // Skickar bara en enkel prompt
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('Proxy-test misslyckades:', err);
    return `Test misslyckades: ${err.error || 'Okänt fel'}`;
  }

  const data = await response.json();
  console.log('Proxy-test lyckades:', data);
  
  if (data.candidates && data.candidates[0].content.parts[0].text) {
    return `Testsvar: ${data.candidates[0].content.parts[0].text}`;
  }
  
  return 'Testet lyckades, men fick oväntat svar.';
}