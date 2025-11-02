// ========================================================================
// Google Drive Integration - Image Import via Picker
// ========================================================================

// Use global variables on window for main.js compatibility
// Initialize if not already set
if (typeof window.accessToken === 'undefined') window.accessToken = null;
if (typeof window.tokenClient === 'undefined') window.tokenClient = null;
if (typeof window.pickerApiLoaded === 'undefined') window.pickerApiLoaded = false;
if (typeof window.isSignedIn === 'undefined') window.isSignedIn = false;
if (typeof window.tokenExpiry === 'undefined') window.tokenExpiry = null;
if (typeof window.rememberMeEnabled === 'undefined') window.rememberMeEnabled = false;
if (typeof window.isGoogleApiLoaded === 'undefined') window.isGoogleApiLoaded = false;

// ---- Credential Management (localStorage) ------------------------------
function showApiKeyDialog() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    dialog.innerHTML = `
      <h2 style="margin: 0 0 20px 0; color: #333;">🔑 Google Drive API-nyckel</h2>
      <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">
        För att använda Google Drive-integrationen behöver du en API-nyckel.
      </p>
      <p style="margin: 0 0 15px 0; color: #666; line-height: 1.6;">
        <strong>Så här skaffar du en nyckel:</strong><br>
        1. Gå till <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #007bff;">Google Cloud Console</a><br>
        2. Skapa ett nytt projekt eller välj ett befintligt<br>
        3. Gå till "API:er och tjänster" > "Autentiseringsuppgifter"<br>
        4. Klicka på "Skapa autentiseringsuppgifter" > "API-nyckel"<br>
        5. Aktivera "Google Drive API" och "Google Picker API"<br>
        6. Klistra in nyckeln här nedan
      </p>
      <p style="margin: 0 0 15px 0; color: #e67e22; font-size: 13px;">
        ⚠️ Din API-nyckel sparas endast lokalt i din webbläsare.
      </p>
      <input type="password" id="googleApiKeyInput" autocomplete="new-password" name="google-api-key-${Date.now()}" placeholder="AIza..." style="
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-family: monospace;
        font-size: 14px;
        box-sizing: border-box;
        margin-bottom: 20px;
      ">
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancelApiKey" style="
          padding: 10px 20px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Avbryt</button>
        <button id="saveApiKey" style="
          padding: 10px 20px;
          border: none;
          background: #007bff;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Spara</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const input = document.getElementById('googleApiKeyInput');
    input.focus();

    // Prevent ALL keyboard events from leaking through to underlying page
    ['keydown', 'keyup', 'keypress', 'input'].forEach(eventType => {
      overlay.addEventListener(eventType, (e) => {
        e.stopPropagation();
      }, true);
    });

    const closeDialog = (key = null) => {
      overlay.remove();
      resolve(key);
    };

    document.getElementById('cancelApiKey').onclick = () => closeDialog();
    document.getElementById('saveApiKey').onclick = () => {
      const apiKey = input.value.trim();
      if (apiKey) {
        localStorage.setItem('googleApiKey', apiKey);
        closeDialog(apiKey);
      } else {
        alert('Vänligen ange en giltig API-nyckel.');
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('saveApiKey').click();
      }
    });

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDialog();
      }
    });
  });
}

function showClientIdDialog() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    dialog.innerHTML = `
      <h2 style="margin: 0 0 20px 0; color: #333;">🔐 Google OAuth Client ID</h2>
      <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">
        För att logga in med Google behöver du ett OAuth Client ID.
      </p>
      <p style="margin: 0 0 15px 0; color: #666; line-height: 1.6;">
        <strong>Så här skaffar du ett Client ID:</strong><br>
        1. Gå till <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #007bff;">Google Cloud Console</a><br>
        2. I samma projekt som API-nyckeln<br>
        3. Klicka på "Skapa autentiseringsuppgifter" > "OAuth-klient-ID"<br>
        4. Välj "Webbapplikation"<br>
        5. Lägg till din webbplats URL (t.ex. https://ximonse.github.io)<br>
        6. Klistra in Client ID här nedan
      </p>
      <p style="margin: 0 0 15px 0; color: #e67e22; font-size: 13px;">
        ⚠️ Ditt Client ID sparas endast lokalt i din webbläsare.
      </p>
      <input type="password" id="googleClientIdInput" autocomplete="new-password" name="google-client-id-${Date.now()}" placeholder="123456789-xxx.apps.googleusercontent.com" style="
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-family: monospace;
        font-size: 14px;
        box-sizing: border-box;
        margin-bottom: 20px;
      ">
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancelClientId" style="
          padding: 10px 20px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Avbryt</button>
        <button id="saveClientId" style="
          padding: 10px 20px;
          border: none;
          background: #007bff;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Spara</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const input = document.getElementById('googleClientIdInput');
    input.focus();

    const closeDialog = (id = null) => {
      overlay.remove();
      resolve(id);
    };

    document.getElementById('cancelClientId').onclick = () => closeDialog();
    document.getElementById('saveClientId').onclick = () => {
      const clientId = input.value.trim();
      if (clientId) {
        localStorage.setItem('googleClientId', clientId);
        closeDialog(clientId);
      } else {
        alert('Vänligen ange ett giltigt Client ID.');
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('saveClientId').click();
      }
    });

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDialog();
      }
    });
  });
}

async function getApiKey() {
  let key = localStorage.getItem("googleApiKey");
  if (!key && typeof GOOGLE_API_KEY !== 'undefined') {
    // Use hardcoded key as fallback
    key = GOOGLE_API_KEY;
    console.log('Using hardcoded API key');
  }
  if (!key) {
    key = await showApiKeyDialog();
  }
  return key?.trim();
}

async function getClientId() {
  let id = localStorage.getItem("googleClientId");
  if (!id && typeof GOOGLE_CLIENT_ID !== 'undefined') {
    // Use hardcoded Client ID as fallback
    id = GOOGLE_CLIENT_ID;
    console.log('Using hardcoded Client ID');
  }
  if (!id) {
    id = await showClientIdDialog();
  }
  return id?.trim();
}

function clearGoogleCreds() {
  localStorage.removeItem("googleApiKey");
  localStorage.removeItem("googleClientId");
  alert("Google-credentials rensade från localStorage.");
}

// Expose globally for debugging/management
window.clearGoogleCreds = clearGoogleCreds;
window.getApiKey = getApiKey;
window.getClientId = getClientId;

// ---- Initialize Google APIs --------------------------------------------
window.onGapiLoad = function() {
  gapi.load('picker', () => {
    window.pickerApiLoaded = true;
    console.log('✅ Google Picker API loaded');
  });
};

// Initialize OAuth Token Client (Google Identity Services) - SILENT on page load
// This function NEVER shows dialogs or triggers OAuth - it only prepares the environment
async function initializeGoogleAPI() {
  if (typeof google === 'undefined' || !google.accounts) {
    console.log('Google Identity Services not loaded yet, retrying...');
    setTimeout(initializeGoogleAPI, 2000);
    return;
  }

  // SILENT token restoration: Only if we have BOTH clientId AND valid tokens
  const savedClientId = localStorage.getItem('googleClientId') || (typeof GOOGLE_CLIENT_ID !== 'undefined' ? GOOGLE_CLIENT_ID : null);
  if (savedClientId) {
    // First check if we have valid tokens
    let hasValidTokens = false;
    if (typeof loadSavedTokens === 'function') {
      hasValidTokens = loadSavedTokens(); // Returns true only if tokens are valid
    }

    // Only create tokenClient if we successfully restored valid tokens
    if (hasValidTokens) {
      console.log('✅ Found valid saved session, creating token client...');
      await createTokenClient(savedClientId);
      // Update UI if available
      if (typeof updateAuthStatus === 'function') {
        updateAuthStatus();
      }
    } else {
      console.log('No valid saved tokens - user will need to log in when using Drive features');
      // Still create tokenClient with hardcoded/saved Client ID for future use
      if (savedClientId) {
        await createTokenClient(savedClientId);
      }
    }
  } else {
    console.log('No Client ID available - user will need to set up Drive on first use');
  }

  console.log('✅ Google API ready (silent init complete)');
  window.isGoogleApiLoaded = true;
}

// Create or recreate the token client with given Client ID
async function createTokenClient(clientId) {
  if (!clientId) return false;

  window.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
    callback: (response) => {
      if (response.access_token) {
        window.accessToken = response.access_token;
        window.isSignedIn = true;
        window.tokenExpiry = Date.now() + (response.expires_in ? response.expires_in * 1000 : 3600000);
        window.rememberMeEnabled = true;

        console.log('✅ OAuth token received');
        console.log('Token expires at:', new Date(window.tokenExpiry).toLocaleString());

        // Save tokens to localStorage for persistence
        if (typeof saveTokens === 'function') {
          saveTokens(true);
          console.log('Tokens saved to localStorage');
        }

        // Update UI if updateAuthStatus exists (from main.js)
        if (typeof updateAuthStatus === 'function') {
          updateAuthStatus();
        }

        // After getting token, open picker automatically if pending
        openPickerAfterAuth();
      } else if (response.error) {
        console.error('❌ OAuth error:', response.error);
        alert('Inloggning misslyckades: ' + response.error);
      }
    }
  });

  return true;
}

// Ensure Google API is initialized - called when user clicks G button or project sync
async function ensureGoogleAPIInitialized() {
  if (typeof google === 'undefined' || !google.accounts) {
    alert('Google API inte laddat ännu. Vänta några sekunder och försök igen.');
    return false;
  }

  // Check if we already have a token client
  if (window.tokenClient) {
    return true;
  }

  // No token client - we need a Client ID
  const clientId = await getClientId();
  if (!clientId) {
    console.log('User cancelled Client ID dialog');
    return false;
  }

  // Create token client with the Client ID
  return await createTokenClient(clientId);
}

// Store pending picker request
let pendingPickerOpen = false;

function openPickerAfterAuth() {
  if (pendingPickerOpen) {
    pendingPickerOpen = false;
    openDrivePicker();
  }
}

// ---- Import Images from Google Drive -----------------------------------
async function importFromGoogleDrive() {
  // Ensure Google API is initialized (will ask for Client ID if needed)
  const initialized = await ensureGoogleAPIInitialized();
  if (!initialized) {
    return; // User cancelled
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return; // User cancelled
  }

  // Check if we have a valid access token
  if (!window.accessToken) {
    console.log('No access token - requesting sign-in...');
    pendingPickerOpen = true;
    if (window.tokenClient) {
      window.tokenClient.requestAccessToken();
    } else {
      alert('Google API inte initialiserat. Ladda om sidan (Ctrl+F5).');
    }
    return;
  }

  // Token exists - open picker directly
  openDrivePicker();
}

// ---- Open Google Drive Picker ------------------------------------------
async function openDrivePicker() {
  const apiKey = await getApiKey();
  if (!apiKey) return;

  // Wait for picker to load if not ready yet
  if (!window.pickerApiLoaded || typeof google === 'undefined' || !google.picker) {
    console.log('⏳ Waiting for Google Picker to load...');

    // Try waiting up to 5 seconds
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (window.pickerApiLoaded && typeof google !== 'undefined' && google.picker) {
        break;
      }
    }

    // Check again after waiting
    if (!window.pickerApiLoaded || typeof google === 'undefined' || !google.picker) {
      alert('Google Picker kunde inte laddas. Ladda om sidan (Ctrl+F5) och försök igen.');
      return;
    }
  }

  console.log('🖼️ Opening Google Drive Picker...');

  const view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false);

  const picker = new google.picker.PickerBuilder()
    .setDeveloperKey(apiKey)
    .setOAuthToken(window.accessToken)
    .addView(view)
    .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
    .setCallback(pickerCallback)
    .setTitle('Välj bilder från Google Drive')
    .build();

  picker.setVisible(true);
}

// ---- Handle Picked Files -----------------------------------------------
async function pickerCallback(data) {
  if (data.action === google.picker.Action.PICKED) {
    console.log('✅ User picked files:', data.docs);

    const selectedFiles = data.docs;
    let imported = 0;
    let failed = 0;

    for (const file of selectedFiles) {
      try {
        console.log(`Downloading ${file.name}...`);

        // Download image from Drive
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          {
            headers: { 'Authorization': `Bearer ${window.accessToken}` }
          }
        );

        if (!response.ok) {
          console.error(`Failed to download ${file.name}:`, response.statusText);
          failed++;
          continue;
        }

        const blob = await response.blob();

        // Convert to image data and create card (assuming these functions exist)
        if (typeof processImage === 'function' && typeof createImageNode === 'function') {
          const imageData = await processImage(blob);
          createImageNode(imageData, file.name);
          imported++;
          console.log(`✅ Imported ${file.name}`);
        } else {
          console.error('processImage or createImageNode not found');
          failed++;
        }

      } catch (error) {
        console.error(`Error importing ${file.name}:`, error);
        failed++;
      }
    }

    // Show result
    const message = failed > 0
      ? `✅ Importerade ${imported} bilder (${failed} misslyckades)`
      : `✅ Importerade ${imported} bilder från Drive`;

    console.log(message);

    // Use updateSyncStatus if available (from main.js), otherwise alert
    if (typeof updateSyncStatus === 'function') {
      updateSyncStatus(message, 'success');
      setTimeout(() => updateSyncStatus('', ''), 3000);
    } else {
      alert(message);
    }

    // Save board after import (if function exists)
    if (typeof saveBoard === 'function') {
      saveBoard();
    }

  } else if (data.action === google.picker.Action.CANCEL) {
    console.log('User cancelled picker');
  }
}

// ---- Load Project from Google Drive ------------------------------------
// This function is called by main.js when switching projects
async function loadFromGoogleDrive() {
  // Check if we have auth
  if (!window.isSignedIn || !window.accessToken) {
    console.log('Not signed in to Google Drive');
    return false;
  }

  try {
    const currentProject = localStorage.getItem('spatial-notes-project-name') || 'Nytt projekt';
    console.log(`Loading project "${currentProject}" from Google Drive...`);

    // Find the project file (delegate to main.js if findSpatialNotesFile exists)
    if (typeof findSpatialNotesFile !== 'function') {
      console.error('findSpatialNotesFile not found in main.js');
      return false;
    }

    const fileId = await findSpatialNotesFile();
    if (!fileId) {
      console.log(`No saved file found for project "${currentProject}"`);
      return false;
    }

    // Download file from Drive
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { 'Authorization': `Bearer ${window.accessToken}` }
      }
    );

    if (!response.ok) {
      console.error('Failed to load from Drive:', response.statusText);
      return false;
    }

    const fileContent = await response.text();
    const boardData = JSON.parse(fileContent);

    // Clear existing cards
    if (typeof cy !== 'undefined') {
      cy.batch(() => {
        cy.nodes().remove();
      });

      // Load cards from boardData
      if (boardData.cards && boardData.cards.length > 0) {
        cy.batch(() => {
          boardData.cards.forEach(card => {
            const node = cy.add({
              data: {
                id: card.id,
                title: card.title || '',
                text: card.text || '',
                tags: card.tags || [],
                hidden_tags: card.hidden_tags || [],
                cardColor: card.cardColor || '',
                type: card.type || 'text',
                isImageCard: card.isImageCard || false,
                imageData: card.imageData || null,
                imageWidth: card.imageWidth || null,
                imageHeight: card.imageHeight || null,
                displayWidth: card.displayWidth || null,
                displayHeight: card.displayHeight || null,
                originalFileName: card.originalFileName || null,
                annotation: card.annotation || null,
                searchableText: card.searchableText || null,
                // FILE METADATA - Restore file info
                fileName: card.fileName || null,
                fileSize: card.fileSize || null,
                fileType: card.fileType || null,
                fileLastModified: card.fileLastModified || null,
                // EXIF METADATA - Restore EXIF data
                exifDateTime: card.exifDateTime || null,
                exifDateTimeOriginal: card.exifDateTimeOriginal || null,
                exifMake: card.exifMake || null,
                exifModel: card.exifModel || null,
                exifOrientation: card.exifOrientation || null,
                gpsLatitude: card.gpsLatitude || null,
                gpsLongitude: card.gpsLongitude || null,
                // PDF METADATA - Restore PDF data
                pdfTitle: card.pdfTitle || null,
                pdfAuthor: card.pdfAuthor || null,
                pdfCreationDate: card.pdfCreationDate || null,
                pdfSubject: card.pdfSubject || null,
                pdfKeywords: card.pdfKeywords || null,
                pdfCreator: card.pdfCreator || null,
                pdfProducer: card.pdfProducer || null,
                pdfModificationDate: card.pdfModificationDate || null,
                pdfVersion: card.pdfVersion || null,
                pageNumber: card.pageNumber || null,
                totalPages: card.totalPages || null,
                // OCR EXTRACTED METADATA - Restore AI-extracted data
                imageDescription: card.imageDescription || null,
                extractedDate: card.extractedDate || null,
                extractedTime: card.extractedTime || null,
                extractedDateTime: card.extractedDateTime || null,
                extractedPeople: card.extractedPeople || null,
                extractedPlaces: card.extractedPlaces || null,
                extractedHashtags: card.extractedHashtags || null,
                // ZOTERO LINK - Restore link
                zotero_url: card.zotero_url || null,
                isAnnotation: card.isAnnotation || false,
                annotationType: card.annotationType || null,
                shape: card.shape || null,
                isPinned: card.isPinned || false
              },
              position: { x: card.x || 0, y: card.y || 0 }
            });

            // Apply styling
            if (card.type === 'image' && card.imageData) {
              const displayWidth = card.displayWidth || 300;
              const ratio = card.imageHeight / card.imageWidth;
              const displayHeight = Math.round(displayWidth * ratio);
              node.style({
                'background-image': card.imageData,
                'background-fit': 'contain',
                'width': displayWidth + 'px',
                'height': displayHeight + 'px'
              });
            }

            // Restore annotation styling
            if (card.isAnnotation) {
              if (card.annotationType === 'shape') {
                node.addClass('annotation-shape');
                if (card.shape) node.data('shape', card.shape);
                if (card.label) node.data('label', card.label);
                if (card.customWidth) node.data('customWidth', card.customWidth);
                if (card.customHeight) node.data('customHeight', card.customHeight);

                node.style({
                  'background-color': card.backgroundColor || '#ff0000',
                  'width': card.width || '200px',
                  'height': card.height || '200px'
                });
              } else if (card.annotationType === 'text') {
                node.addClass('annotation-text');
                if (card.textSize) node.data('textSize', card.textSize);
                if (card.label) node.data('label', card.label);
                if (card.customWidth) node.data('customWidth', card.customWidth);
                if (card.customHeight) node.data('customHeight', card.customHeight);

                node.style({
                  'background-color': card.backgroundColor || '#ff0000',
                  'font-size': card.fontSize || '32px',
                  'width': card.width || '200px',
                  'height': card.height || '100px'
                });
              }
            } else if (card.cardColor) {
              // Apply cardColor for non-annotations
              if (typeof getCardColorValue === 'function' && typeof getCurrentTheme === 'function') {
                const colorValue = getCardColorValue(card.cardColor, getCurrentTheme());
                node.style('background-color', colorValue);
              }
            }

            // Handle pinned cards
            if (card.isPinned || card.pinned) {
              node.addClass('pinned');
              node.data('pinned', true);
              node.ungrabify();
            } else {
              node.grabify();
            }
          });

          // Load edges
          if (boardData.edges) {
            boardData.edges.forEach(edgeData => {
              const newEdge = cy.add({
                group: 'edges',
                data: {
                  source: edgeData.source,
                  target: edgeData.target,
                  isAnnotation: edgeData.isAnnotation || false,
                  annotationType: edgeData.annotationType || null,
                  connectionType: edgeData.connectionType || null
                }
              });

              // Restore edge styling if available
              if (edgeData.lineColor || edgeData.targetArrowColor) {
                newEdge.style({
                  'line-color': edgeData.lineColor || '#999',
                  'target-arrow-color': edgeData.targetArrowColor || '#999',
                  'target-arrow-shape': edgeData.targetArrowShape || 'triangle',
                  'width': edgeData.width || 5,
                  'arrow-scale': edgeData.arrowScale || 1.8,
                  'curve-style': edgeData.curveStyle || 'bezier'
                });
              }
            });
          }
        });

        console.log(`✅ Loaded ${boardData.cards.length} cards from Drive`);
        return true;
      }
    }

    return false;

  } catch (error) {
    console.error('Error loading from Google Drive:', error);
    return false;
  }
}

// ---- Expose Functions Globally -----------------------------------------
window.importFromGoogleDrive = importFromGoogleDrive;
window.openDrivePicker = openDrivePicker;
window.initializeGoogleAPI = initializeGoogleAPI;
window.ensureGoogleAPIInitialized = ensureGoogleAPIInitialized;
window.loadFromGoogleDrive = loadFromGoogleDrive;
