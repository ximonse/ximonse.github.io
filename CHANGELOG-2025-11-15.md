# Ändringslogg 2025-11-15

## Problem och Återställning

### Vad hände
- Försökte lägga till lokal API-nyckel-stöd (.env) för utveckling
- Ändrade Gemini-modellnamn flera gånger baserat på felaktiga antaganden
- Skapade konflikter mellan root `api/gemini.js` och `spatial-view/api/gemini.js`
- Ändrade miljövariabelnamn mellan GEMINI_API_KEY och GOOGLE_API_KEY
- Detta ledde till att Gemini-funktioner slutade fungera både lokalt och på Vercel

### Återställning
- Återställde till commit `a640587` från 2025-11-13 23:53
- Detta var innan alla problematiska ändringar
- Både `master` och `gemini-integration` branches återställda

### Nuvarande State (a640587)
- Gemini API fungerar med Vercel proxy
- Ingen lokal .env-stöd (kräver Vercel deploy för att testa Gemini-funktioner)
- Vercel miljövariabel: `GOOGLE_API_KEY` måste vara satt för Production, Preview och Development

## Vercel Konfiguration
När du skapar nytt Vercel-projekt:
1. Root Directory: `spatial-view`
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Environment Variables:
   - Namn: `GOOGLE_API_KEY`
   - Värde: [Din Google AI API-nyckel]
   - Environments: Production, Preview, Development (alla tre!)

## Gemini API Setup
- Modell: (se `spatial-view/api/gemini.js` för aktuell modell)
- API Version: v1beta
- Endpoint: `/api/gemini` (Vercel serverless function)
