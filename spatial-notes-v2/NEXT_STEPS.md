# Nästa Steg - JavaScript Modularisering

## 🎯 Mål: Dela upp main.js i 17 moduler

Baserat på `MODULE_EXTRACTION_SUMMARY.txt` analys.

## ⚡ STEG-FÖR-STEG PLAN

### Fas 1: Säkra Moduler (LOW RISK)

#### 1️⃣ Debug & Utilities (80 rader)
```bash
sed -n '8127,8333p' main.js > debug.js
# Funktioner: debugDumpPositions, logState, etc.
```

#### 2️⃣ Theme Management (250 rader)
```bash
sed -n '10746,10991p' main.js > themes.js
# Funktioner: toggleDarkTheme, applyCardTheme, getCurrentTheme
```

#### 3️⃣ Search & Boolean (180 rader)
```bash
sed -n '4057,4238p' main.js > search.js
# Funktioner: performSearch, evaluateBooleanQuery
```

#### 4️⃣ Text Measurement (340 rader) ⭐ MEST ANVÄND
```bash
sed -n '3009,3348p' main.js > text-measurement.js
# KRITISK: getMeasuredTextHeight() - används överallt
```

**Testing efter Fas 1:**
- [ ] Themes fungerar (Ctrl+T eller ⚙️ Meny → tema)
- [ ] Sök fungerar
- [ ] Debug-kommandon fungerar
- [ ] Kort skapas med korrekt höjd

---

### Fas 2: Tidiga Moduler (LOW-MEDIUM RISK)

#### 5️⃣ Image Handling (380 rader)
```bash
sed -n '2247,2627p' main.js > image-handling.js
# Funktioner: processImage, createImageNode, handlePasteImage
```

#### 6️⃣ Card Editing (400 rader)
```bash
sed -n '12707,13100p' main.js > card-editing.js
# Funktion: editCard (unified editor)
```

#### 7️⃣ Cytoscape Init (700 rader) ⚠️ KRITISK
```bash
sed -n '3349,4056p' main.js > cytoscape-init.js
# Funktion: initCytoscape() + 25 event listeners
# MÅSTE köras FÖRST, alla andra moduler beror på 'cy'
```

**Testing efter Fas 2:**
- [ ] Bilder kan laddas upp
- [ ] Edit-dialog fungerar (dubbelklick på kort)
- [ ] Cytoscape initialiseras korrekt
- [ ] Alla event listeners fungerar

---

### Fas 3: Medium Komplexitet

#### 8️⃣ Annotation & Drawing (350 rader)
#### 9️⃣ Dialogs & Menus (830 rader)
#### 🔟 Sorting & Temporal (730 rader)

---

### Fas 4: Högre Komplexitet

#### 1️⃣1️⃣ Save & Load (1,200 rader)
#### 1️⃣2️⃣ Arrangement (800 rader)
#### 1️⃣3️⃣ Card Creation (1,200 rader)
#### 1️⃣4️⃣ Keyboard Commands (1,900 rader)
#### 1️⃣5️⃣ Google Drive (900 rader)

---

### Fas 5: Högsta Risken (SIST)

#### 1️⃣6️⃣ AI Assistant (2,000 rader) - STÖRSTA MODULEN
#### 1️⃣7️⃣ Column View (1,600 rader) - Bidirektionell sync

---

## 🔧 IMPLEMENTATIONSMETODER

### Metod A: Global Functions (Rekommenderas för fas 1-3)

**Pros:** Enkelt, inga breaking changes, fungerar direkt
**Cons:** Global namespace pollution, svårare att underhålla

```javascript
// I varje modul-fil:
window.functionName = function() { ... }

// Eller ännu enklare - behåll bara function declarations:
function functionName() { ... }
// (Dessa blir automatiskt globala om de inte är i en modul)
```

**Inget behöver ändras i index.html**, bara ladda filerna i rätt ordning:
```html
<script src="js/config.js"></script>
<script src="js/debug.js"></script>
<script src="js/themes.js"></script>
<!-- etc -->
```

### Metod B: ES6 Modules (För framtiden)

**Pros:** Modern, tree-shaking, explicit dependencies
**Cons:** Kräver större omskrivning

```javascript
// themes.js
export function toggleDarkTheme() { ... }
export function getCurrentTheme() { ... }

// main.js eller andra filer
import { toggleDarkTheme, getCurrentTheme } from './themes.js';
```

**Kräver ändringar i HTML:**
```html
<script type="module" src="js/main.js"></script>
```

---

## 📋 CHECKLISTA FÖR VARJE MODUL

### Före extraktion:
- [ ] Identifiera alla funktioner i modulen (använd grep)
- [ ] Identifiera alla globala variabler som används
- [ ] Identifiera beroenden (vilka andra funktioner anropas?)
- [ ] Dokumentera i kommentar överst i filen

### Efter extraktion:
- [ ] Verifiera syntax (inga oavslutade brackets)
- [ ] Lägg till i index.html i korrekt ordning
- [ ] Testa funktionaliteten
- [ ] Kör full applikationstest (skapa kort, söka, tema-byte, etc.)

---

## 🚨 KRITISKA BEROENDEN

### Globala variabler som ALLA moduler behöver:
```javascript
// config.js (måste laddas FÖRST)
let cy;                    // Cytoscape instance
let searchActive = false;
let copiedCards = [];
let annotationMode = 'select';
let annotationColor = '#ff6b6b';
// ... totalt 36 globala variabler
```

### Load Order Dependencies:
```
config.js (globala variabler)
  ↓
text-measurement.js (getMeasuredTextHeight används av nästan allt)
  ↓
cytoscape-init.js (skapar 'cy' instance)
  ↓
[övriga moduler i valfri ordning]
```

---

## 🧪 TESTSCRIPT

Efter varje modul-extraktion, testa:

```javascript
// I browser console:

// Test 1: Globala variabler existerar
console.log('cy exists?', typeof cy !== 'undefined');
console.log('searchActive exists?', typeof searchActive !== 'undefined');

// Test 2: Viktiga funktioner existerar
console.log('initCytoscape exists?', typeof initCytoscape === 'function');
console.log('performSearch exists?', typeof performSearch === 'function');
console.log('toggleDarkTheme exists?', typeof toggleDarkTheme === 'function');

// Test 3: Skapa kort
// Högerklicka → "Skapa nytt kort" → Skriv text → Spara

// Test 4: Sök
// Skriv i sökfältet → Verifiera att kort hittas

// Test 5: Tema
// ⚙️ Meny → 🌙 Mörkt Tema → Verifiera att temat ändras
```

---

## 📊 FÖRVÄNTAD TIDSLINJE

| Fas | Tid | Risk | Testning |
|-----|-----|------|----------|
| Fas 1 (4 moduler) | 30 min | Låg | 15 min |
| Fas 2 (3 moduler) | 45 min | Medium | 30 min |
| Fas 3 (3 moduler) | 1 h | Medium | 45 min |
| Fas 4 (5 moduler) | 2 h | Hög | 1 h |
| Fas 5 (2 moduler) | 1.5 h | Mycket hög | 1 h |
| **Totalt** | **~6 timmar** | | **~3.5 timmar** |

---

## 💡 TIPS & TRICKS

### Hitta funktioner i main.js:
```bash
grep -n "^function " js/main.js
grep -n "^const .* = function" js/main.js
grep -n "^let .* = function" js/main.js
```

### Hitta beroenden för en funktion:
```bash
# T.ex. hitta alla anrop till getMeasuredTextHeight:
grep -n "getMeasuredTextHeight" js/main.js
```

### Räkna rader i en sektion:
```bash
sed -n '3009,3348p' js/main.js | wc -l
# Output: 340 (antal rader)
```

### Verifiera att extraktion är korrekt:
```bash
# Kolla första och sista raden:
sed -n '3009p' js/main.js  # Första raden
sed -n '3348p' js/main.js  # Sista raden
```

---

## 🎯 FRAMGÅNGSKRITERIER

### När är JavaScript-modulariseringen klar?

- [ ] Alla 17 moduler extraherade
- [ ] index.html laddar alla moduler i rätt ordning
- [ ] ALLA applikationsfunktioner fungerar:
  - [ ] Skapa kort (manuellt, importera, bilder)
  - [ ] Redigera kort
  - [ ] Söka och filtrera
  - [ ] Arrangera kort (V, H, G+V, G+H, G+T, Q, S)
  - [ ] Spara/ladda (localStorage, fil, JSON)
  - [ ] Google Drive sync
  - [ ] Tema-byte (4 teman)
  - [ ] Kolumnvy
  - [ ] Keyboard shortcuts (15+ kommandon)
  - [ ] AI-assistent (båda systemn)
  - [ ] Annotation tools
- [ ] Inga console errors
- [ ] Performance är lika bra eller bättre
- [ ] Token-usage reducerat med 80%+ för vanliga ändringar

---

## 🆘 OM NÅGOT GÅR FEL

### Fallback-strategi:
1. **Spara backup av fungerande main.js:**
   ```bash
   cp js/main.js js/main.backup.js
   ```

2. **Om applikationen slutar fungera:**
   - Kolla Console för fel (F12)
   - Identifiera vilken funktion som saknas
   - Lägg tillbaka i main.js tillfälligt
   - Debugga beroendet

3. **Återställ till fungerande version:**
   ```bash
   cp js/main.backup.js js/main.js
   ```

4. **Steg-för-steg rollback:**
   - Kommentera ut modul i index.html
   - Lägg tillbaka kod i main.js
   - Testa
   - Repeat

---

Lycka till! 🚀
