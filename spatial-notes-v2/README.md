# Spatial Notes v2

A modular visual note-taking tool built with Cytoscape.js that lets users create, arrange, and connect note cards on an infinite canvas.

**Live URL:** https://ximonse.github.io/spatial-notes-v2/

## 🚀 Features

### Core Functionality
- **Visual Canvas**: Infinite workspace for organizing notes
- **Card System**: Create manual cards, import from PDFs/images, or use Zotero
- **Arrangement Tools**: Vertical/horizontal columns, grids, clusters, and stacks
- **Search & Filter**: Boolean search with tag filtering
- **Color Coding**: 8-color palette with keyboard shortcuts (1-8)
- **Markdown Support**: Column view with live preview
- **Multi-platform**: Works on desktop and mobile/iPad

### Image & PDF Support
- **Drag & Drop Images**: Direct upload to canvas
- **PDF Import**: Each page becomes a separate image card
- **Multi-platform Upload**: Camera, gallery, and file picker on mobile
- **Smart Compression**: WebP → PNG → JPEG fallback

### 🆕 Command Palette & UI Enhancements (2025-11-01 PM)
- **Command Palette (Ctrl+K)**: Search and execute 50+ commands
  - 13 organized categories: Save & Google Drive, File Operations, Card Creation, Colors, etc.
  - Fuzzy search by command name or category
  - Keyboard navigation with arrows
  - Shows keyboard shortcuts for each command
  - Smart scroll - selected item always visible
- **Keyboard Shortcuts (Ctrl+Q)**: Interactive cheat sheet
  - All commands listed with shortcuts and descriptions
  - Download as .txt file for offline reference
  - Organized by category for easy learning
- **Enhanced Menus**:
  - Simplified toolbar with board/column view toggle
  - Right-click tagging and coloring now works for multiple cards
  - Escape key closes all dialogs and overlays

### 🆕 Gemini OCR Integration (2025-11-01 AM)
- **Single Image OCR**: Right-click → "✨ Läs med Gemini" to extract text from images
- **Batch Processing**: Select multiple image cards and process them all at once
  - Desktop: Select cards → Right-click → "✨ Läs X bilder med Gemini"
  - Mobile Board View: Select cards → Long-press → Context menu → Gemini OCR
  - Mobile Column View: Select cards → Long-press → "✨ Läs bild med Gemini"
- **Edit Dialog Integration**: "✨ Läs bild med Gemini OCR" button in image card editor
- **Smart Text Handling**: Appends to existing text or replaces empty fields
- **Auto-tagging**: Gemini automatically adds relevant hashtags

### Mobile Optimizations
- **Unified Context Menus**: Single, beautiful menu system for mobile
- **Smart Long-press**:
  - Single card → Opens edit dialog
  - Multiple selected cards → Opens context menu (same as desktop right-click)
- **Touch-optimized**: All features accessible via touch gestures

### AI Integration
- **Claude AI Panel**: Chat with AI about your notes
- **ChatGPT Stacks**: Automatic grouping and organization
- **Gemini Vision**: OCR for handwritten and printed text

### Arrangement Commands
- **V**: Vertical column
- **H**: Horizontal row
- **G+V/H/T**: Grid layouts
- **Q**: Cluster (pile)
- **S**: Stack

### Color System
- **1-6**: Direct coloring (green, orange, red, yellow, purple, blue)
- **7-8**: Gray and white
- **0**: Remove color
- **T**: Color picker dialog

## 🎨 Themes
- Light (default)
- Dark
- Sepia
- E-ink (optimized for Viwood AiPaper Mini)

## 📱 Platform Support
- ✅ Desktop (Chrome/Edge recommended)
- ✅ Mobile browsers
- ✅ iPad
- ✅ Touch devices

## 🛠️ Technology Stack
- **Cytoscape.js** 3.26.0 - Graph visualization
- **jQuery** 3.6.0 - DOM manipulation
- **PDF.js** 3.11.174 - PDF rendering
- **Google Gemini API** - OCR and vision processing
- **Google Drive API** - Cloud storage
- **Modular Architecture**: Separated CSS and JS modules for maintainability

## 📂 Project Structure

```
spatial-notes-v2/
├── index.html              # Main HTML with module imports
├── css/                    # 10 CSS modules (~2000 lines total)
│   ├── toolbar.css
│   ├── canvas.css
│   ├── cards-colors.css    # 8-color system
│   ├── menus-mobile.css
│   ├── column-view.css
│   ├── ai-panel.css
│   ├── ai-assistant.css
│   ├── theme-dark.css
│   ├── theme-sepia.css
│   └── theme-eink.css
├── js/                     # JavaScript modules
│   ├── main.js             # Core application
│   ├── image-handling.js   # Image upload & Gemini OCR
│   ├── card-editing.js     # Edit dialogs
│   ├── cytoscape-init.js   # Canvas initialization
│   ├── dialogs.js          # Context menus
│   ├── annotation.js       # Drawing tools
│   └── ...                 # Other modules
└── README.md               # This file
```

## 🚦 Quick Start

### Local Development
```bash
cd spatial-notes-v2
npx http-server -p 8080
```
Open http://127.0.0.1:8080

### Using Gemini OCR
1. Upload images to canvas (📷 Bilder button)
2. **Single image**: Right-click → "✨ Läs med Gemini"
3. **Multiple images**:
   - Select images (Shift+click or box select)
   - Right-click on any selected image
   - Click "✨ Läs X bilder med Gemini"
4. Enter your Google AI API key when prompted
5. Wait for processing (progress shown in status bar)

### Mobile Usage
1. **Upload**: Tap 📷 Bilder → Camera/Gallery
2. **Select multiple**: Tap cards to select
3. **Long-press** on selected card → Context menu
4. **Gemini OCR**: Tap "✨ Läs bild med Gemini"

## 🔑 API Keys

### Google AI (Gemini)
Get your key at: https://aistudio.google.com/apikey
- Used for: Image OCR, text extraction
- Stored: localStorage (browser only)

### Claude AI
Get your key at: https://console.anthropic.com/
- Used for: AI chat panel
- Stored: localStorage (browser only)

### OpenAI
Get your key at: https://platform.openai.com/api-keys
- Used for: ChatGPT stacks
- Stored: localStorage (browser only)

## 📝 Usage Tips

### Creating Cards
- **Manual**: ➕ button or double-click canvas
- **Images**: Drag & drop or 📷 button
- **PDF**: Each page becomes a separate image card

### Organizing
- Select multiple cards (Shift+click or box select)
- Use arrangement commands (V, H, G+V, etc.)
- Apply colors for visual grouping

### Searching
- Boolean: `"term1 AND term2 OR term3 NOT term4"`
- Tags: `#todo AND #urgent NOT #done`
- Filter by selection: Enable "Endast markerade"

### Batch OCR Workflow
1. Import multiple document images
2. Select all images (Ctrl+A or box select)
3. Right-click → "✨ Läs X bilder med Gemini"
4. Wait for processing (shows "Läser bild 1/10..." etc.)
5. All cards now have extracted text + hashtags
6. Use search to filter by content

## 🐛 Known Issues

- **localStorage limits**: Use Google Drive fallback for large projects
- **PDF quality**: Renders at 2x scale for retina displays
- **Mobile paste**: Clipboard API has strict permissions

## 🏗️ Development

### Modular Architecture
The project uses a modular architecture for better maintainability:
- **CSS**: 10 separate modules (~200-500 lines each)
- **JS**: Core functionality split into specialized modules
- **Token Efficiency**: Edit specific modules without loading entire codebase

### Contributing
See `.claude/CLAUDE.md` for detailed development guidelines and session history.

## 📜 License

Personal project - See repository for details

## 🙏 Credits

Built with:
- Cytoscape.js - Graph visualization library
- PDF.js - PDF rendering
- Google Gemini - Vision AI
- Claude Code - Development assistance

---

**Last Updated**: 2025-11-01
**Version**: 2.0 (Modular + Gemini OCR)
