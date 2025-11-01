// ========================================================================
// Google Drive Integration - Image Import via Picker
// ========================================================================

let accessToken = null;
let tokenClient = null;
let pickerApiLoaded = false;

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

// ---- Initialize Google APIs --------------------------------------------
window.onGapiLoad = function() {
  gapi.load('picker', () => {
    pickerApiLoaded = true;
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

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    callback: (response) => {
      if (response.access_token) {
        accessToken = response.access_token;
        console.log('✅ OAuth token received');
        // After getting token, open picker automatically
        openPickerAfterAuth();
      } else if (response.error) {
        console.error('❌ OAuth error:', response.error);
        alert('Inloggning misslyckades: ' + response.error);
      }
    }
  });

  console.log('✅ Google Identity Services initialized');
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
  if (!accessToken) {
    console.log('No access token - requesting sign-in...');
    pendingPickerOpen = true;
    tokenClient.requestAccessToken();
    return;
  }

  // Token exists - open picker directly
  openDrivePicker();
}

// ---- Open Google Drive Picker ------------------------------------------
async function openDrivePicker() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  if (!pickerApiLoaded || !google.picker) {
    alert('Google Picker laddar fortfarande... försök igen om ett ögonblick.');
    return;
  }

  console.log('🖼️ Opening Google Drive Picker...');

  const view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false);

  const picker = new google.picker.PickerBuilder()
    .setDeveloperKey(apiKey)
    .setOAuthToken(accessToken)
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
            headers: { 'Authorization': `Bearer ${accessToken}` }
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
    alert(message);

    // Save board after import (if function exists)
    if (typeof saveBoard === 'function') {
      saveBoard();
    }

  } else if (data.action === google.picker.Action.CANCEL) {
    console.log('User cancelled picker');
  }
}

// ---- Expose Functions Globally -----------------------------------------
window.importFromGoogleDrive = importFromGoogleDrive;
window.openDrivePicker = openDrivePicker;
window.initializeGoogleAPI = initializeGoogleAPI;
