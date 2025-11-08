# Spatial View

> **Visual Second Brain för handskrivna anteckningar**

Spatial View är en modern omskrivning av spatial-notes-v2 med fokus på performance, enkelhet och skalbarhet.

## ✨ Features (v1.0 Roadmap)

- ✅ **Modern arkitektur**: Konva.js canvas + IndexedDB storage
- ✅ **Device-optimerad**: Automatisk anpassning för desktop, mobile och e-ink
- 🚧 **OCR Integration**: Gemini 2.5 Flash för handskrivna anteckningar
- 🚧 **Incremental Sync**: Delta-baserad export/import mellan enheter
- 🚧 **Visual Organization**: Drag-drop canvas med arrangemang-kommandon
- 🚧 **Themes**: Light, Dark, Sepia, E-ink

## 🏗️ Tech Stack

- **Canvas**: Konva.js (WebGL rendering)
- **Storage**: IndexedDB via Dexie.js
- **Build**: Vite
- **AI**: Google Gemini 2.5 Flash
- **Hosting**: GitHub Pages (v1.0), Cloudflare Pages (future)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
spatial-view/
├── src/
│   ├── lib/           # Core modules
│   │   ├── canvas.js      # Konva canvas handling
│   │   ├── storage.js     # IndexedDB with Dexie
│   │   └── gemini.js      # OCR integration
│   ├── views/         # View components
│   │   ├── board-view.js  # Canvas view
│   │   └── column-view.js # List view
│   ├── utils/         # Utilities
│   │   ├── image-processing.js
│   │   └── delta-sync.js
│   ├── assets/        # Themes and styles
│   ├── main.js        # Entry point
│   └── styles.css     # Base styles
├── docs/              # Architecture Decision Records
│   ├── ADR-001-why-konva.md
│   ├── ADR-002-indexeddb-storage.md
│   └── ADR-003-incremental-sync.md
└── index.html
```

## 📋 Development Phases

### Phase 1: Core Canvas (1 vecka)
- Konva stage med zoom/pan
- Drag-drop kort
- Save/load från IndexedDB

### Phase 2: Image Import (1 vecka)
- Camera API
- Image compression
- EXIF metadata

### Phase 3: Gemini OCR (3 dagar)
- OCR integration
- Metadata extraction
- Batch processing

### Phase 4: Views & Devices (1 vecka)
- Column view
- Device detection
- E-ink optimizations

### Phase 5: Search & Sort (3 dagar)
- Boolean search
- Temporal sorting
- Tag filtering

### Phase 6: Arrangement (3 dagar)
- Visual layouts (V, H, G, Q)
- Command palette

### Phase 7: Polish & PWA (1 vecka)
- Offline mode
- Service worker
- Install prompt

### Phase 8: Migration (3 dagar)
- Import from v2
- Data migration tool

## 🎯 Success Metrics

- Load 100 kort: **<2s** (vs >10s i v2)
- Memory usage: **<100MB** (vs >300MB i v2)
- Bundle size: **<200KB** gzipped
- Code size: **<10,000 lines** (vs 28k i v2)

## 🔍 Key Improvements from v2

### Architecture
- ❌ Cytoscape.js (graf-visualisering) → ✅ Konva.js (canvas)
- ❌ localStorage (5-10MB) → ✅ IndexedDB (unlimited)
- ❌ 80+ metadata fields → ✅ 15 fields
- ❌ 28k lines code → ✅ <10k lines

### Performance
- ✅ Async I/O (no UI blocking)
- ✅ Blob storage (no base64 overhead)
- ✅ Indexed queries
- ✅ Lazy loading
- ✅ Web Workers (OCR, search)

### UX
- ✅ Device-specific optimizations
- ✅ Simplified metadata
- ✅ Faster load times
- ✅ Smooth animations

## 📖 Documentation

- [ADR-001: Why Konva.js](docs/ADR-001-why-konva.md)
- [ADR-002: IndexedDB Storage](docs/ADR-002-indexeddb-storage.md)
- [ADR-003: Incremental Sync](docs/ADR-003-incremental-sync.md)

## 📄 License

MIT License - see LICENSE file

## 🙏 Credits

Built with:
- [Konva.js](https://konvajs.org/)
- [Dexie.js](https://dexie.org/)
- [Vite](https://vitejs.dev/)
- [Google Gemini](https://ai.google.dev/)

---

**Status**: 🚧 Phase 0 Complete - Ready for Phase 1 development
