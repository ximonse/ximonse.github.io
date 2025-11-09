# Spatial View - Arkitektur

## Principer

### Modularisering
- **Ingen fil över 300 rader** (helst under 200)
- **En fil = ett ansvar** (Single Responsibility Principle)
- **Dela upp tidigt** - vänta inte tills filen är för stor

### Filstruktur

```
src/
├── main.js              (< 100 rader - endast app init)
├── core/
│   └── app.js           (huvudsaklig init-logik)
├── ui/
│   ├── toolbar.js       (toolbar interactions)
│   ├── search-bar.js    (sök-funktionalitet UI)
│   └── view-switcher.js (view-hantering)
├── canvas/
│   ├── core.js          (stage, layer, init)
│   ├── rendering.js     (renderTextCard, renderImageCard)
│   ├── editing.js       (editors, dialogs)
│   ├── interactions.js  (klick, touch, drag)
│   ├── clipboard.js     (copy/paste)
│   └── search.js        (canvas search-logik)
├── lib/
│   ├── storage.js       (IndexedDB)
│   ├── arrangement.js   (arrangerings-algoritmer)
│   └── gemini.js        (AI-integration)
└── utils/
    ├── image-processing.js
    └── delta-sync.js
```

### Innan du lägger till en funktion

1. **Fråga**: Vilken modul hör detta till?
2. **Kolla**: Är filen redan över 200 rader?
3. **Om ja**: Skapa en ny modul eller dela upp befintlig först
4. **Importera**: Använd named exports, inte default exports

### Refactoring-signaler

- **Fil > 300 rader** = Akut refactoring
- **Fil > 200 rader** = Planera uppdelning
- **Funktion > 50 rader** = Överväg att dela upp

### Exempel på bra struktur

```javascript
// canvas/editing.js - ENDAST editing-relaterad kod
export function createInlineEditor(cardData, onSave) { ... }
export function createBulkEditor(cardIds) { ... }
export function showTouchBulkMenu(x, y) { ... }

// canvas/rendering.js - ENDAST rendering
export function renderTextCard(group, cardData) { ... }
export function renderImageCard(group, cardData) { ... }
export function getCardColor(cardColor) { ... }

// canvas/core.js - importerar och använder
import { renderTextCard, renderImageCard } from './rendering.js';
import { createInlineEditor } from './editing.js';
```

## Nuvarande status (2025-11-09)

⚠️ **AKUT REFACTORING KRÄVS**
- canvas.js: 3706 rader (måste delas upp)
- main.js: 606 rader (måste delas upp)

## Nästa steg

1. Refactorera canvas.js → 6 moduler
2. Refactorera main.js → 4 moduler
3. Följ denna guide för alla framtida ändringar

---

**Kom ihåg**: När du lägger till en funktion, lägg den i rätt modul från början!
