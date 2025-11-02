# Development Learnings & Work Log

## Session: 2025-11-01 - Google Drive Integration Cleanup

### Initial Goal
Clean up Google Drive integration code - remove duplicates and hardcoded API keys.

### What We Actually Fixed (The Rabbit Hole)

#### 1. **Google Drive Code Cleanup**
- **Problem**: 1,307 lines of duplicated/messy code in `google-drive.js`
- **Solution**: Rewrote to 232 clean lines
- **Removed**: Hardcoded Google Client ID and API Key from code
- **Result**: All credentials now in localStorage only

#### 2. **Duplicate Variable Declarations Crisis**
- **Problem**: When adding `config.js` first in load order, variables declared in multiple files caused "Identifier already declared" syntax errors
- **Files affected**: `main.js`, `annotation.js`, `config.js`
- **Variables**: `cy`, `undoStack`, `redoStack`, `textRuler`, `heightCache`, `currentClickHandler`, `sortMode`, `hasChanges`, `autosaveInterval`, `showMetadata`, `isSimplifiedToolbar`, `aiChatHistory`, `AI_STORAGE_KEY`, `aiColorCycle`, `aiAssistantState`
- **Solution**: Declared all global variables ONLY in `config.js`, removed from other files
- **Learning**: Load order matters! Config must load before other scripts.

#### 3. **Global Function Exposure**
- **Problem**: HTML onclick handlers couldn't find functions (e.g., `toggleProjectDropdown`, `zoomOutToCenter`)
- **Solution**: Exposed all onclick functions via `window.functionName` at end of `main.js`
- **Learning**: Functions in script files aren't automatically global - must explicitly expose via `window`

#### 4. **Google Drive Project Sync**
- **Problem**: `isSignedIn`, `accessToken` not accessible between `google-drive.js` and `main.js`
- **Solution**: Made all auth variables global via `window` object
- **Missing functions**: Added `loadFromGoogleDrive()` that main.js needed

#### 5. **Google Picker Loading Issue**
- **Problem**: Clicking G button too fast after page load → "Picker not ready"
- **Solution**: Added retry logic - waits up to 5 seconds for picker API to load
- **Learning**: Async external APIs need graceful waiting, not just error messages

#### 6. **Annotation Styling Lost on Load**
- **Problem**: Shapes/annotations lost color, size, and form when loading projects from Drive
- **Root cause**: `loadFromGoogleDrive()` didn't restore styling from JSON
- **Solution**: Added code to restore `backgroundColor`, `width`, `height`, `fontSize`, CSS classes, and edge styling
- **Learning**: Styling must be explicitly reapplied when recreating nodes from JSON

#### 7. **Image Quality Improvement**
- **Problem**: Imported images too blurry, especially text on light backgrounds
- **Solution**:
  - Increased resolution: 800px → 700px (balanced, not 1000px overkill)
  - Added sharpening filter (unsharp mask convolution)
  - Increased WebP quality: 95% → 97%
  - High-quality image smoothing enabled
- **Learning**: Display size (300px) ≠ optimal storage size (700px for Retina + OCR)

### Key Learnings

1. **Script Load Order is Critical**: Global variables must be declared before scripts that use them
2. **Window Object for Globals**: `let`/`const` in scripts aren't globally accessible - use `window.varName`
3. **Styling Isn't Automatic**: When recreating Cytoscape nodes from JSON, all styling must be explicitly reapplied
4. **API Key Management**: Never hardcode - always use localStorage with prompts
5. **External API Loading**: Add retry logic with timeouts for async-loaded libraries
6. **Image Quality Balance**: Higher resolution (700px) needed for text clarity on Retina screens, not just display size
7. **Gemini is a worthless coding buddy at the moment** - As unfocused as a border collie on crack

### Files Modified
- `spatial-notes-v2/js/google-drive.js` - Complete rewrite (1307 → 420 lines including new features)
- `spatial-notes-v2/js/config.js` - Added project variables, made globals
- `spatial-notes-v2/js/main.js` - Removed duplicates, exposed functions globally
- `spatial-notes-v2/js/annotation.js` - Removed duplicate declarations
- `spatial-notes-v2/js/image-handling.js` - Improved sharpening and resolution
- `spatial-notes-v2/index.html` - Added config.js to load order, removed duplicate scripts

### Final State
✅ All features working:
- Google Drive project sync
- Image import from Drive
- Annotations preserve styling
- OCR with Gemini (though Gemini itself is terrible for coding)
- Sharper image quality

### Time Investment
- **Planned**: 30 minutes
- **Actual**: ~3 hours (worth it for cleanup!)

### Session Philosophy
> "Låt oss inte trilla ner i kaninhålet igen" - Stop while things work! ✅

---

## Previous Sessions

_(Add future work logs above this line)_
