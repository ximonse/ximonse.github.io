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
function getApiKey() {
  let key = localStorage.getItem("googleApiKey");
  if (!key) {
    key = prompt("Ange din Google API KEY (behöver Drive + Picker aktiverat):");
    if (key) localStorage.setItem("googleApiKey", key.trim());
  }
  return key?.trim();
}

function getClientId() {
  let id = localStorage.getItem("googleClientId");
  if (!id) {
    id = prompt("Ange din Google OAuth CLIENT ID (Web application):");
    if (id) localStorage.setItem("googleClientId", id.trim());
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

// Initialize OAuth Token Client (Google Identity Services)
function initializeGoogleAPI() {
  if (typeof google === 'undefined' || !google.accounts) {
    console.log('Google Identity Services not loaded yet, retrying...');
    setTimeout(initializeGoogleAPI, 2000);
    return;
  }

  const clientId = getClientId();
  if (!clientId) {
    console.log('No Client ID set - Google Drive disabled');
    return;
  }

  window.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.file', // Need write access for project sync
    callback: (response) => {
      if (response.access_token) {
        window.accessToken = response.access_token;
        window.isSignedIn = true;
        window.tokenExpiry = Date.now() + (response.expires_in ? response.expires_in * 1000 : 3600000);

        console.log('✅ OAuth token received');
        console.log('Token expires at:', new Date(window.tokenExpiry).toLocaleString());

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

  console.log('✅ Google Identity Services initialized');
  window.isGoogleApiLoaded = true;
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
  const apiKey = getApiKey();
  if (!apiKey) {
    alert('Ingen API-nyckel angiven.');
    return;
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
  const apiKey = getApiKey();
  if (!apiKey) return;

  if (!window.pickerApiLoaded || !google.picker) {
    alert('Google Picker laddar fortfarande... försök igen om ett ögonblick.');
    return;
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
          });

          // Load edges
          if (boardData.edges) {
            boardData.edges.forEach(edgeData => {
              cy.add({
                group: 'edges',
                data: {
                  source: edgeData.source,
                  target: edgeData.target
                }
              });
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
window.loadFromGoogleDrive = loadFromGoogleDrive;
