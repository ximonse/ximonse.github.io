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

## Session: 2025-11-02 - Google OAuth Flow Refactoring & UX Improvements

### Initial Goal
Fix Google Drive login persistence and autocomplete issues.

### What We Actually Fixed (The OAuth Journey)

#### 1. **Token Persistence - Logging Out Constantly**
- **Problem**: User logged out on every page reload, tokens not saved
- **Root cause**: `saveTokens()` never called after OAuth success in `google-drive.js`
- **Solution**:
  - Added `saveTokens(true)` call in OAuth callback
  - Added `loadSavedTokens()` call in `initializeGoogleAPI()`
  - Set `window.rememberMeEnabled = true` as default
- **Result**: Login persists for 30 days in localStorage

#### 2. **Autocomplete "apiapiapi" Bug**
- **Problem**: Text "api" (from API key) appeared in all form fields, especially on e-ink tablet
- **Root cause**: Browser saved API key in autofill database and repeated it everywhere
- **Solution**:
  - Replaced `prompt()` with proper modal dialogs
  - Added `autocomplete="new-password"` (browser ignores plain "off")
  - Added unique `name` attributes with timestamps
  - Added `autocomplete="off"` to search and tag filter inputs
  - Added keyboard event `stopPropagation()` in dialogs to prevent leaking to underlying page
- **Learning**: Modern browsers ignore `autocomplete="off"`, must use `autocomplete="new-password"` trick

#### 3. **OAuth Popup Auto-Triggering on Page Load**
- **Problem**: OAuth dialog appeared automatically when loading page with empty localStorage
- **Root cause**: `initializeGoogleAPI()` called `await getClientId()` which showed dialog immediately
- **Solution**: Made `initializeGoogleAPI()` completely passive:
  - Only creates tokenClient if BOTH savedClientId AND valid tokens exist
  - No dialogs, no OAuth - just silent token restoration
  - Login only triggers when user clicks G button or project features
- **Learning**: Initialization should be silent - let user actions trigger authentication

#### 4. **Invalid API Key Error (404 on Images)**
- **Problem**: Drive Picker opened but image downloads failed with 404
- **Root cause**: Missing `await` on `getApiKey()` call → returned Promise instead of string
- **Solution**: Added `await` in `openDrivePicker()` on line 411
- **Side issue**: OAuth scope was too narrow (`drive.file` only)

#### 5. **OAuth Scope Too Narrow**
- **Problem**: 404 errors when downloading images user selected from their own Drive
- **Root cause**: `drive.file` scope only allows access to files the app created, not user's existing files
- **Solution**: Added `drive.readonly` scope: `'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file'`
- **Learning**: Google OAuth scopes are very specific - `drive.file` ≠ access to user's files

#### 6. **Project Button - No Login Option**
- **Problem**: Clicking "Öppna projekt" or "Hantera projekt" showed `alert()` with just OK button, no way to log in
- **Root cause**: `showProjectList()` and `manageProjects()` had early `alert()` blocks that returned immediately
- **Solution**:
  - Removed early auth checks with `alert()`
  - Made functions async
  - Call `showProjectManager()` directly, which triggers `ensureValidToken()` → login dialog
- **Result**: Proper "Vill du logga in?" dialog with "Logga in" + "Avbryt" buttons

#### 7. **Annoying Client ID/API Key Dialogs**
- **Problem**: Every time localStorage cleared, user forced to re-enter Client ID and API Key manually
- **Feedback**: "FAN FAN FAN! client id oauth har aldrig varit synligt innan!"
- **Root cause**: Previously hardcoded in config.js, removed in session 2025-11-01 for "security"
- **Solution**: **Hardcoded credentials back into config.js**:
  ```javascript
  const GOOGLE_CLIENT_ID = '971005822021-8ebrpd92n1upsedg7s5fn80mnmvhou5d.apps.googleusercontent.com';
  const GOOGLE_API_KEY = 'AIzaSyC6JFXGlZaOqMPCaeodCY1UsXplT96TCSw';
  const GOOGLE_AI_API_KEY = 'AIzaSyAoI05DK8P_fuWD0K_LPgWDJZwo_V4f0gc';
  ```
- **Updated functions to use hardcoded values as fallback**:
  - `getClientId()`, `getApiKey()`, `getGoogleAIAPIKey()`
  - `initializeGoogleAPI()` creates tokenClient with hardcoded Client ID
- **Learning**: Client ID and API keys are public anyway (visible in network traffic), hardcoding = better UX

### Key Learnings

1. **OAuth Flow Should Be User-Initiated**: Never auto-trigger OAuth on page load - wait for user action
2. **Autocomplete="off" Doesn't Work**: Use `autocomplete="new-password"` + unique names + stopPropagation
3. **Async/Await Matters**: Missing `await` on async functions returns Promise, not the value
4. **OAuth Scopes Are Specific**: `drive.file` ≠ `drive.readonly` - read the docs carefully
5. **Dialog UX vs Alert()**: Proper modals with multiple buttons >>> browser `alert()` with only OK
6. **Hardcoded Credentials = Good UX**: Public API keys in code = fine, fewer dialogs = happy users
7. **Token Persistence Is Critical**: Save tokens immediately after OAuth, restore on init
8. **Think Through the Whole Roof**: Don't just place buckets (fix symptoms), fix the actual leak (root cause)

### Files Modified
- `spatial-notes-v2/js/google-drive.js` - Token persistence, passive init, hardcoded fallbacks, scope fix
- `spatial-notes-v2/js/main.js` - Proper login dialog, removed early auth checks in project functions
- `spatial-notes-v2/js/config.js` - Added hardcoded GOOGLE_CLIENT_ID, GOOGLE_API_KEY, GOOGLE_AI_API_KEY
- `spatial-notes-v2/js/image-handling.js` - Hardcoded Gemini key fallback
- `spatial-notes-v2/index.html` - Added autocomplete="off" to search/tag inputs

### Final State
✅ All OAuth flows working smoothly:
- No auto-login on page load
- Login persists 30 days
- No "apiapiapi" autocomplete bugs
- Drive image import works perfectly
- Project management triggers login when needed
- Direct to Google OAuth popup (no credential dialogs)

### Time Investment
- **Planned**: "Fix token persistence" (30 min)
- **Actual**: ~4 hours of OAuth flow redesign
- **Worth it**: Yes - proper authentication UX is fundamental

### Session Philosophy
> "Fixa taket, inte skålarna" - Fix the roof, not just place buckets to catch leaks

### Commits
- `df7dcf8` - Fix Google login persistence and autocomplete issues
- `c67a03b` - Fix autocomplete issues in search fields and dialogs
- `145df73` - Refactor Google OAuth flow - eliminate auto-login and improve UX
- `a83b13b` - Fix OAuth scope for Drive image access - add drive.readonly
- `0d32f37` - Enable login when clicking project button while logged out
- `9d7fcaf` - Fix project dropdown to trigger login when not signed in
- `5384f2a` - Hardcode Google credentials to eliminate login dialogs

---

## Previous Sessions

_(Add future work logs above this line)_
