# Spatial Notes - Modular Version - Claude Memory

## 📋 PROJECT OVERVIEW

Spatial Notes är ett visuellt anteckningsverktyg byggt med Cytoscape.js som låter användare skapa, arrangera och koppla ihop anteckningskort på en oändlig canvas.

**Live URL:** https://ximonse.github.io/spatial-notes-v2/

**Repo:** `C:\Users\ximon\Kodprojekt\pdf_extractor\ximonse-github-io\spatial-notes-v2\`

**Lokal utveckling:** `C:\Users\ximon\Kodprojekt\spatial-notes-modular\`

---

## 🚀 SNABBSTART

### Starta lokal utvecklingsserver:
```bash
cd C:\Users\ximon\Kodprojekt\spatial-notes-modular
npx http-server -p 8080
```

### Öppna i webbläsare:
http://127.0.0.1:8080

### Stoppa servern:
Ctrl+C i terminalen

---

## 📂 PROJEKTSTRUKTUR

```
spatial-notes-modular/
├── .claude/
│   └── CLAUDE.md           # Detta dokumentet
├── index.html              # Minimal HTML med CSS/JS imports
├── css/                    # 10 separata CSS-moduler (~2000 rader totalt)
│   ├── toolbar.css         # Toolbar och projekt-selector (302 rader)
│   ├── canvas.css          # Cytoscape canvas och base styling
│   ├── cards-colors.css    # Kortsystem färgpalett - 8 färger (213 rader)
│   ├── menus-mobile.css    # Context menus och mobile controls
│   ├── column-view.css     # Kolumnvy styling
│   ├── ai-panel.css        # AI chat panel (Claude)
│   ├── ai-assistant.css    # AI assistant panel (ChatGPT)
│   ├── theme-dark.css      # Mörkt tema (~200 rader)
│   ├── theme-sepia.css     # Sepia tema (~200 rader)
│   └── theme-eink.css      # E-ink tema för Viwood AiPaper Mini (~200 rader)
├── js/
│   └── main.js             # JavaScript (~15,000 rader) - PLANERAD uppdelning till 17 moduler
├── README.md               # Teknisk översikt och körningsinstruktioner
└── NEXT_STEPS.md           # Plan för JavaScript-modularisering
```

---

## 🔄 GIT WORKFLOW

### Deploy till GitHub Pages:

1. **Kopiera filer till git repo:**
```bash
cp spatial-notes-modular/index.html ximonse-github-io/spatial-notes-v2/index.html
cp spatial-notes-modular/js/main.js ximonse-github-io/spatial-notes-v2/js/main.js
# Kopiera CSS-filer om de ändrats
```

2. **Commit och push:**
```bash
cd ximonse-github-io
git add spatial-notes-v2/
git commit -m "Beskrivning av ändring"
git push
```

3. **Resultat:**
- Live på https://ximonse.github.io/spatial-notes-v2/ inom 2-3 minuter

---

## 🎨 HUVUDFUNKTIONER

### Kortsystem:
- **Manuella kort**: Skapa via ➕ eller dubbelklick på canvas
- **Import**: PDF-extractor, Zotero, JSON, multi-import
- **Bilder**: Drag-drop, Ctrl+V paste, 📷 knapp
- **PDF**: Alla sidor blir separata bildkort

### Arrangement:
- **V**: Vertikal kolumn
- **H**: Horisontell rad
- **G+V/G+H/G+T**: Grid-layouts
- **Q**: Kluster (skräphög)
- **S**: Stack (hög)

### Färger:
- **1-6**: Direktfärgning (grön, orange, röd, gul, lila, blå)
- **0**: Ta bort färg
- **T**: Färgväljare-dialog

### Sökning:
- Boolean search: "term1 AND term2 OR term3 NOT term4"
- Tag-filter: #todo, #done, kombinationer
- Sök i markerade kort

### AI-integration:
- ChatGPT Högar (automatisk gruppering)
- Claude AI chat-panel

---

## 📜 UTVECKLINGSHISTORIK

### 🔄 SPATIAL NOTES MODULAR PROJECT (2025-10-24)

**HUVUDMÅL:** Modulär omstrukturering för Claude Code token-effektivitet

**"Från 17,273-raders monolitisk HTML till separata CSS/JS-moduler!"**

#### ✅ UPPNÅDDA FÖRBÄTTRINGAR

**1. CSS Modularisering (100% KLAR)**
- **Före**: 17,273 rader monolitisk HTML
- **Efter**: 10 separata CSS-filer (~200-500 rader vardera)
- **Token-besparing**:
  - Ändra färgsystem: 98.8% (läs 213 rader istället för 17,273)
  - Ändra themes: 98.8% (läs ~200 rader istället för 17,273)
  - Ändra toolbar: 98.3% (läs 302 rader istället för 17,273)

**2. JavaScript Extraktion (DELVIS KLAR)**
- **Status**: All JS-kod extraherad från HTML till `js/main.js` (15,039 rader)
- **Fungerar**: Ja, applikationen är fullt funktionell
- **Token-besparing hittills**: 12.9% (läs 15k rader istället för 17k)
- **Nästa steg**: Dela upp main.js i 17 moduler enligt plan i `NEXT_STEPS.md`

#### 📊 TOKEN-EFFEKTIVITET JÄMFÖRELSE

| Uppgift | Monolitisk (före) | Modulär (efter) | Besparing |
|---------|-------------------|-----------------|-----------|
| Ändra färgsystem | 17,273 rader | 213 rader (`cards-colors.css`) | **98.8%** |
| Ändra themes | 17,273 rader | ~200 rader (theme-fil) | **98.8%** |
| Ändra toolbar | 17,273 rader | 302 rader (`toolbar.css`) | **98.3%** |
| Ändra JavaScript | 17,273 rader | 15,039 rader (`main.js`) | **12.9%** |
| Efter JS-modularisering | 17,273 rader | 80-2000 rader (specifik modul) | **80-99%** (förväntat) |

---

### 📄 SPATIAL NOTES PDF IMPORT (2025-10-29) ✅

**HUVUDUPPGIFT:** PDF-sidor som bildkort i modulära versionen

**"Från enbart bilder till PDF-stöd - varje sida blir ett separat kort!"**

#### IMPLEMENTERADE PDF-FEATURES:

1. **PDF.js Integration**
   - CDN bibliotek för PDF-rendering (v3.11.174)
   - Worker configuration för canvas-konvertering
   - Automatisk PDF-detection via file.type

2. **Multi-page PDF Support**
   - Alla sidor konverteras automatiskt
   - Varje sida = ett separat bildkort
   - Naming format: "filename.pdf - Sida 1/3"
   - Sequential processing med status-updates

3. **Samma kvalitet som bilder**
   - 800px bredd (konsistent med bildimport)
   - 2x rendering scale för retina-kvalitet
   - WebP/PNG format (~35-90 KB per sida)
   - Smart format-selection (WebP → PNG fallback)

#### TEKNISK IMPLEMENTATION:

**Modifierade filer:**
- **index.html** (rad 13): `<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>`
- **index.html** (rad 241): `accept="image/*,.pdf"` i filväljare
- **main.js** (rad 121-136): `handleImageFiles()` detekterar och hanterar PDF
- **main.js** (rad 271-369): `processPdfFile()` async funktion

**Key Functions:**

```javascript
// Process PDF file and convert all pages to image nodes
async function processPdfFile(file) {
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://...pdf.worker.min.js';

    // Load PDF
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        // Render to canvas (2x scale)
        const viewport = page.getViewport({scale: 2.0});
        await page.render({canvasContext: ctx, viewport}).promise;

        // Scale to 800px and convert to WebP/PNG
        // Create image node with createImageNode()
    }
}
```

#### ANVÄNDNINGSWORKFLOW:

**För användaren:**
1. Klicka på **📷 Bilder** knappen i toolbar
2. Välj en PDF-fil (istället för bilder)
3. Alla sidor konverteras automatiskt i bakgrunden
4. Varje sida skapas som ett separat bildkort
5. Arrangera med V/H/G+V/G+H precis som vanliga kort

---

## 🎓 TIDIGARE MILESTONES

### Färgsystem (2025-08-07)
- 6-färgs palett med numrerade shortcuts (1-6)
- T-tangent färgväljare med visuella prickar
- Bulk-färgning av markerade kort
- Temamedvetenhet (light/dark/sepia/eink)

### Bildsystem (2025-08-30)
- Multi-platform bilduppladdning (iPad/desktop)
- Smart format-val: WebP → PNG → JPEG
- 800px upplösning med kontrastförbättring
- Fullständig JSON export/import-stöd

### Kolumnvy (2025-09-04)
- Markdown-formatering med live preview
- Viktighets-sortering (äldsta #todo först)
- Färg-sortering (röd→blå)
- Temporal markings med todo/done-stöd

---

## 🔮 FRAMTIDA FÖRBÄTTRINGAR

### JavaScript Modularisering (Fas 2)

**PHASE 1 (Säkra att extrahera):**
1. `debug.js` (80 rader) - Debug utilities
2. `themes.js` (250 rader) - Theme management
3. `search.js` (180 rader) - Search & boolean queries
4. `text-measurement.js` (340 rader) - getMeasuredTextHeight() m.m.

**PHASE 2 (Efter testing):**
5. `image-handling.js` (380 rader) - Bilduppladdning och processning
6. `card-editing.js` (400 rader) - Edit-dialogs
7. `cytoscape-init.js` (700 rader) - ⚠️ KRITISK - Initialisering

**Se NEXT_STEPS.md för fullständig plan**

---

## 🎯 KODNINGSPRINCIPER

### När du gör ändringar:

1. **Testa lokalt först**: Starta http-server och verifiera funktionalitet
2. **Bevara beroenden**: Många funktioner är sammankopplade
3. **Följ namnkonventioner**: camelCase för funktioner, kebab-case för CSS
4. **Dokumentera stora ändringar**: Uppdatera denna CLAUDE.md
5. **Testa alla teman**: Light, dark, sepia, e-ink
6. **Verifiera mobile**: Touch-events och responsive design

### Viktiga varningar:

⚠️ **getMeasuredTextHeight()** - Mest använd funktion, ändra försiktigt
⚠️ **Cytoscape init** - Kritisk för hela applikationen
⚠️ **Theme-funktioner** - Påverkar alla CSS-moduler
⚠️ **Event listeners** - Måste köras i rätt ordning

---

## 📚 TEKNISKA DETALJER

### Beroenden:
- **Cytoscape.js** 3.26.0 - Graph visualization
- **jQuery** 3.6.0 - DOM manipulation
- **PDF.js** 3.11.174 - PDF rendering
- **Google APIs** - Sign-In, Drive API

### Browser-kompatibilitet:
- ✅ Chrome/Edge (rekommenderad)
- ✅ Firefox
- ✅ Safari (iPad)
- ✅ Mobile browsers

### Performance:
- Canvas rendering för PDF (2x scale)
- WebP komprimering för bilder
- Lazy loading för stora projekt
- Memoization för text-measurements

---

## 🐛 KÄNDA PROBLEM & LÖSNINGAR

### Problem: Edit-dialoger "fastnar"
**Lösning:** clearAllEditDialogs() före nya dialogs

### Problem: Färger försvinner vid reload
**Lösning:** Kontrollera att cardColor sparas i saveBoard()

### Problem: PDF-import ger fel
**Lösning:** Kontrollera att PDF.js worker URL är korrekt

### Problem: Bilder/PDFer croppas till kortstandard
**Lösning:** Ändra background-fit från 'cover' till 'contain' i alla image restore-points

### Problem: Save-funktion säger "sparningen misslyckades" trots inloggning
**Lösning:** localStorage full (quota exceeded) - QuotaExceededError detection + Google Drive fallback

---

## 👨‍💻 SESSIONS-HISTORIK

- **2025-10-29**: PDF import implementation
- **2025-10-24**: Modulär omstrukturering (CSS klar)
- **2025-09-04**: Kolumnvy shortcuts
- **2025-08-30**: Bildsystem
- **2025-08-07**: Färgsystem
- **2025-08-06**: Edit-dialog unifiering

---

Ximon + Claude Code - Spatial Notes Projekt 🎨📝
