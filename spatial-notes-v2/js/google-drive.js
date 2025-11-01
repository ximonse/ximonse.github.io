


// Google Drive API Configuration

let GOOGLE_API_KEY = localStorage.getItem('googleApiKey') || '';

const GOOGLE_CLIENT_ID = '971005822021-8ebrpd92n1upsedg7s5fn80mnmvhou5d.apps.googleusercontent.com';

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';



let isGoogleApiLoaded = false;

let isSignedIn = false;

let pickerApiLoaded = false;

let accessToken = null;

let tokenClient = null;



// Project management  

let currentProject = localStorage.getItem('spatial-notes-project-name') || 'Nytt projekt';

let availableProjects = [];

let projectsLoaded = false;



// Token management with enhanced persistence

let tokenExpiry = null;

let rememberMeEnabled = false;



function showGoogleApiKeyDialog() {

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

        <h2 style="margin: 0 0 20px 0; color: #333;">Google Drive API-nyckel</h2>

        <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">

            För att använda Google Drive-integrationen behöver du en API-nyckel.

        </p>

        <p style="margin: 0 0 15px 0; color: #666; line-height: 1.6;">

            <strong>Så här skaffar du en nyckel:</strong><br>

            1. Gå till <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #007bff;">Google Cloud Console</a><br>

            2. Skapa ett nytt projekt eller välj ett befintligt<br>

            3. Gå till "API:er och tjänster" > "Autentiseringsuppgifter"<br>

            4. Klicka på "Skapa autentiseringsuppgifter" > "API-nyckel"<br>

            5. Klistra in nyckeln här nedan

        </p>

        <p style="margin: 0 0 15px 0; color: #e67e22; font-size: 13px;">

            ⚠️ Din API-nyckel sparas endast lokalt i din webbläsare.

        </p>

                <form onsubmit="return false;" style="margin-bottom: 20px;">

                    <input type="password" id="googleApiKeyInput" placeholder="AIza..." style="

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

                        <button type="button" id="cancelApiKey" style="

                            padding: 10px 20px;

                            border: 1px solid #ddd;

                            background: white;

                            border-radius: 6px;

                            cursor: pointer;

                            font-size: 14px;

                        ">Avbryt</button>

                        <button type="submit" id="saveApiKey" style="

                            padding: 10px 20px;

                            border: none;

                            background: #007bff;

                            color: white;

                            border-radius: 6px;

                            cursor: pointer;

                            font-size: 14px;

                        ">Spara och fortsätt</button>

                    </div>

                </form>

    `;



    overlay.appendChild(dialog);

    document.body.appendChild(overlay);



    const input = document.getElementById('googleApiKeyInput');

    input.focus();



    document.getElementById('cancelApiKey').onclick = () => {

        overlay.remove();

    };



    document.getElementById('saveApiKey').onclick = () => {

        const apiKey = input.value.trim();

        if (apiKey) {

            localStorage.setItem('googleApiKey', apiKey);

            GOOGLE_API_KEY = apiKey;

            overlay.remove();

            importFromGoogleDrive();

        } else {

            alert('Ogiltig API-nyckel.');

        }

    };



    input.addEventListener('keydown', (e) => {

        if (e.key === 'Enter') {

            document.getElementById('saveApiKey').click();

        }

    });



    overlay.addEventListener('keydown', (e) => {

        if (e.key === 'Escape') {

            overlay.remove();

        }

    });

}



function getGoogleApiKey() {

    return localStorage.getItem('googleApiKey');

}



// Open Google Drive Picker to select multiple images

async function importFromGoogleDrive() {

    const apiKey = getGoogleApiKey();

    if (!apiKey) {

        showGoogleApiKeyDialog();

        return;

    }



    // Ensure user is signed in

    if (!isSignedIn || !accessToken) {

        updateSyncStatus('Sign in to use Drive Picker', 'info');

        // Trigger sign-in

        tokenClient.requestAccessToken();

        return;

    }



    // Ensure Picker API is loaded

    if (!pickerApiLoaded) {

        alert('Google Picker is loading... Try again in a moment.');

        return;

    }



    console.log('🖼️ Opening Google Drive Picker for images...');



    // Create and configure the Picker

    const picker = new google.picker.PickerBuilder()

        .setOAuthToken(accessToken)

        .setDeveloperKey(apiKey)

        .setAppId(GOOGLE_CLIENT_ID.split('-')[0]) // Extract app ID from client ID

        .addView(

            new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)

                .setIncludeFolders(true)

                .setSelectFolderEnabled(false)

        )

        .addView(new google.picker.DocsView(google.picker.ViewId.FOLDERS).setSelectFolderEnabled(false))

        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)

        .setCallback(pickerCallback)

        .setTitle('Välj bilder från Drive')

        .build();



    picker.setVisible(true);

}



// Handle Picker selection callback

async function pickerCallback(data) {

    if (data.action === google.picker.Action.PICKED) {

        console.log('✅ User selected files:', data.docs);



        const selectedFiles = data.docs;

        updateSyncStatus(`Importerar ${selectedFiles.length} bilder...`, 'loading');



        let imported = 0;

        let failed = 0;



        for (const file of selectedFiles) {

            try {

                // Download image from Drive

                const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {

                    headers: {

                        'Authorization': `Bearer ${accessToken}`

                    }

                });



                if (!response.ok) {

                    console.error(`Failed to download ${file.name}:`, response.statusText);

                    failed++;

                    continue;

                }



                const blob = await response.blob();



                // Convert to image data and create card

                const imageData = await processImage(blob);

                createImageNode(imageData, file.name);



                imported++;

                console.log(`✅ Imported ${file.name}`);



            } catch (error) {

                console.error(`Error importing ${file.name}:`, error);

                failed++;

            }

        }



        // Show result

        const message = failed > 0

            ? `✅ Importerade ${imported} bilder (${failed} misslyckades)`

            : `✅ Importerade ${imported} bilder från Drive`;



        updateSyncStatus(message, 'success');

        setTimeout(() => updateSyncStatus('', ''), 3000);



        // Save board after import

        saveBoard();

    } else if (data.action === google.picker.Action.CANCEL) {

        console.log('User cancelled picker');

    }

}



// Load board from Google Drive

async function loadFromGoogleDrive() {

    const apiKey = getGoogleApiKey();

    if (!apiKey) {

        showGoogleApiKeyDialog();

        return;

    }

    try {

        // Ensure we have a valid token

        await ensureValidToken();

        

        console.log(`Loading project "${currentProject}" from Google Drive...`);

        updateSyncStatus('Loading from Google Drive...', 'loading');

        

        const fileId = await findSpatialNotesFile();

        console.log('File search result:', fileId);

        

        if (!fileId) {

            console.log(`No file found for project "${currentProject}"`);

            updateSyncStatus(`No saved data for "${currentProject}"`, 'info');

            return false;

        }

        

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {

            method: 'GET',

            headers: {

                'Authorization': `Bearer ${accessToken}`

            }

        });

        

        console.log('Drive API response status:', response.status);

        

        if (!response.ok) {

            const errorText = await response.text();

            console.error('Drive API error:', errorText);

            throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);

        }

        

        const fileContent = await response.text();

        console.log('File content length:', fileContent.length);

        console.log('File content preview:', fileContent.substring(0, 200));

        

        const boardData = JSON.parse(fileContent);

        console.log('Parsed board data:', boardData);

        

        // Check if we already have cards loaded (from localStorage)

        const existingCards = cy.nodes().length;

        console.log(`Found ${existingCards} existing cards before Drive sync`);

        

        // Clear existing cards silently without visual updates during sync

        cy.batch(() => {

            cy.nodes().remove();

        });

        

        // Add cards from Drive in a batch to minimize visual updates

        if (boardData.cards && boardData.cards.length > 0) {

            console.log(`Loading ${boardData.cards.length} cards...`);

            

            // Batch all card additions to prevent visual jumping

            cy.batch(() => {

                boardData.cards.forEach((card, index) => {

                    console.log(`Adding card ${index + 1}:`, card.id, card.title?.substring(0, 30));

                    

                    const nodeData = {

                        id: card.id,

                        title: card.title || '',

                        text: card.text || '',

                        tags: card.tags || [],

                        hidden_tags: card.hidden_tags || [],

                        cardColor: card.cardColor || '',

                        export_source: card.export_source || '',

                        source_file: card.source_file || '',

                        matched_terms: card.matched_terms || '',

                        isManualCard: card.isManualCard || false,

                        isPinned: card.isPinned || false,

                        // IMAGE SUPPORT - Essential for preserving pasted images!

                        type: card.type || 'text',

                        isImageCard: card.isImageCard || false,

                        imageData: card.imageData || null,

                        imageWidth: card.imageWidth || null,

                        imageHeight: card.imageHeight || null,

                        calculatedHeight: card.calculatedHeight || null,

                        annotation: card.annotation || null,

                        searchableText: card.searchableText || null,

                        originalFileName: card.originalFileName || null,

                        imageNotes: card.imageNotes || '',

                        // ANNOTATION SUPPORT - Essential for preserving shapes/text annotations

                        isAnnotation: card.isAnnotation || false,

                        annotationType: card.annotationType || null,

                        shape: card.shape || null,

                        textSize: card.textSize || null,

                        label: card.label || null,

                        customWidth: card.customWidth || null,

                        customHeight: card.customHeight || null,

                        // Other metadata

                        export_timestamp: card.export_timestamp || null,

                        export_session: card.export_session || null,

                        page_number: card.page_number || null,

                        card_index: card.card_index || null

                    };

                    

                    const node = cy.add({

                        data: nodeData,

                        position: { x: card.x || 0, y: card.y || 0 }

                    });

                    

                    // Apply auto-gray coloring for #done tags

                    applyAutoDoneColoring(node);



                    // Apply image styling if this is an image node

                    if ((card.type === 'image' || card.isImageCard) && card.imageData) {

                        console.log('🖼️ Restoring image from Drive:', card.originalFileName || 'unknown');



                        // Use saved display width, or default to 300px

                        const displayWidth = card.displayWidth || 300;

                        const ratio = card.imageHeight / card.imageWidth;

                        const displayHeight = Math.round(displayWidth * ratio);



                        node.style({

                            'background-image': card.imageData,

                            'background-fit': 'contain',

                            'background-position': 'center',

                            'width': displayWidth + 'px',

                            'height': displayHeight + 'px'

                        });



                        // Store display dimensions in data for future saves

                        node.data('displayWidth', displayWidth);

                        node.data('displayHeight', displayHeight);

                    }



                    // Restore annotation styling if this is an annotation

                    if (card.isAnnotation && card.annotationType === 'shape') {

                        console.log('🔷 Restoring shape annotation:', card.id, card.shape);

                        node.addClass('annotation-shape');



                        // Restore shape data

                        if (card.shape) node.data('shape', card.shape);

                        if (card.label) node.data('label', card.label);

                        if (card.customWidth) node.data('customWidth', card.customWidth);

                        if (card.customHeight) node.data('customHeight', card.customHeight);



                        // Restore ALL styling in one call (like edges)

                        node.style({

                            'background-color': card.backgroundColor || '#ff0000',

                            'width': card.width || '200px',

                            'height': card.height || '200px'

                        });

                        console.log(`  Restored shape: color=${card.backgroundColor}, size=${card.width}x${card.height}`);

                    } else if (card.isAnnotation && card.annotationType === 'text') {

                        console.log('📝 Restoring text annotation:', card.id);

                        node.addClass('annotation-text');



                        // Restore text annotation data

                        if (card.textSize) node.data('textSize', card.textSize);

                        if (card.label) node.data('label', card.label);

                        if (card.customWidth) node.data('customWidth', card.customWidth);

                        if (card.customHeight) node.data('customHeight', card.customHeight);



                        // Restore ALL styling in one call (like edges)

                        node.style({

                            'background-color': card.backgroundColor || '#ff0000',

                            'font-size': card.fontSize || '32px',

                            'width': card.width || '200px',

                            'height': card.height || '100px'

                        });

                        console.log(`  Restored text: color=${card.backgroundColor}, size=${card.width}x${card.height}`);

                    } else {

                        // Only apply cardColor styling for NON-annotations

                        const cardColor = node.data('cardColor');

                        if (cardColor) {

                            const colorValue = getCardColorValue(cardColor, getCurrentTheme());

                            node.style('background-color', colorValue);

                        }

                    }



                    // Handle both isPinned and pinned (for backwards compatibility)

                    if (node.data('isPinned') || card.pinned) {

                        node.addClass('pinned');

                        node.data('pinned', true);

                        node.ungrabify(); // Prevent dragging pinned cards

                    } else {

                        node.grabify(); // Make sure non-pinned cards are draggable

                    }

                });



                // Load edges (connections between nodes)

                if (boardData.edges && boardData.edges.length > 0) {

                    console.log(`Loading ${boardData.edges.length} edges...`);

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

                            console.log(`🎨 Restored edge styling: ${edgeData.lineColor}`);

                        }

                    });

                    console.log('✅ All edges loaded with styling');

                }

            });



            console.log('All cards and edges loaded successfully');

            updateSyncStatus(`✅ Loaded ${boardData.cards.length} cards from "${currentProject}"`, 'success');

            

            // Skip height updates if cards were already loaded from localStorage 

            // to prevent visual jumping during Drive sync

            if (existingCards === 0) {

                // Only update heights for first load (no localStorage data)

                console.log('First load - applying height calculations');

                setTimeout(() => {

                    cy.batch(() => {

                        cy.nodes().forEach(node => {

                            try {

                                const heightInfo = getMeasuredTextHeight(node);

                                node.style('height', heightInfo + 'px');

                            } catch (error) {

                                const textLength = (node.data('text') || '').length;

                                const fallbackHeight = Math.max(140, textLength * 0.8 + 60);

                                node.style('height', fallbackHeight + 'px');

                            }

                        });

                    });

                    console.log(`Height calculations applied to ${cy.nodes().length} cards`);

                }, 150);

            } else {

                console.log('Skipped height updates - cards already properly sized from localStorage');

            }

            

            // Auto-save to localStorage as backup

            setTimeout(() => saveBoard(), 500);

            

            return true;

        } else {

            console.log('No cards found in board data');

            updateSyncStatus(`Empty project: "${currentProject}"`, 'info');

            return false;

        }

    } catch (error) {

        console.error('Error loading from Google Drive:', error);

        

        // If error is auth-related, clear tokens and update UI

        if (error.message.includes('Not signed in') || error.message.includes('Token refresh failed')) {

            clearSavedTokens();

            updateAuthStatus();

            updateSyncStatus('Please sign in to Google Drive', 'error');

        } else {

            updateSyncStatus('Failed to load from Drive', 'error');

        }

        return false;

    }

}



// Initialize Google API

async function initializeGoogleAPI() {

    try {

        // Wait for Google Identity Services to be available

        if (typeof google === 'undefined' || !google.accounts) {

            console.log('Google Identity Services not yet loaded, retrying in 2 seconds...');

            setTimeout(() => initializeGoogleAPI(), 2000);

            return;

        }

        

        console.log('Initializing Google Identity Services...');

        

        // Try to load saved tokens first

        const hasValidTokens = loadSavedTokens();

        if (hasValidTokens) {

            console.log('✅ Auto-signed in with saved tokens');

            updateAuthStatus();

            

            // Load available projects and current project

            setTimeout(async () => {

                await loadAvailableProjects();

                if (currentProject) {

                    await loadFromGoogleDrive();

                }

            }, 1000);

        }

        

        // Initialize Google Identity Services token client

        tokenClient = google.accounts.oauth2.initTokenClient({

            client_id: GOOGLE_CLIENT_ID,

            scope: GOOGLE_SCOPE,

            callback: (response) => {

                if (response.access_token) {

                    accessToken = response.access_token;

                    isSignedIn = true;

                    

                    // Calculate token expiry (Google tokens typically last 1 hour)

                    tokenExpiry = Date.now() + (response.expires_in ? response.expires_in * 1000 : 3600000);

                    

                    // Save tokens for persistence

                    saveTokens();

                    

                    console.log('Successfully signed in to Google Drive');

                    console.log('Token expires at:', new Date(tokenExpiry).toLocaleString());

                    updateAuthStatus();

                    

                    // Load available projects and then current project

                    setTimeout(async () => {

                        await loadAvailableProjects();

                        await loadFromGoogleDrive();

                    }, 500);

                } else if (response.error) {

                    console.error('Authentication error:', response.error);

                    updateSyncStatus('Authentication failed', 'error');

                }

            },

        });

        

        isGoogleApiLoaded = true;

        console.log('Google Identity Services initialized successfully');



        // Load Google Picker API

        if (typeof gapi !== 'undefined') {

            gapi.load('picker', {

                'callback': function() {

                    pickerApiLoaded = true;

                    console.log('✅ Google Picker API loaded');

                },

                'onerror': function() {

                    console.error('❌ Failed to load Google Picker API');

                }

            });

        } else {

            console.log('⏳ Waiting for gapi to load Picker...');

            setTimeout(() => {

                if (typeof gapi !== 'undefined') {

                    gapi.load('picker', () => {

                        pickerApiLoaded = true;

                        console.log('✅ Google Picker API loaded (delayed)');

                    });

                }

            }, 2000);

        }



        // Try to restore saved tokens

        if (loadSavedTokens()) {

            console.log(`Restored session from saved tokens, project: ${currentProject}`);

            updateAuthStatus();

            

            // Load projects and current project

            setTimeout(async () => {

                await loadAvailableProjects();

                console.log(`Loading saved project: ${currentProject}`);

                await loadFromGoogleDrive();

            }, 500);

        } else {

            updateAuthStatus();

        }

        

    } catch (error) {

        console.error('Error initializing Google Identity Services:', error);

        

        // Check if we're running locally

        if (window.location.protocol === 'file:') {

            console.log('Google Drive sync requires HTTPS. Deploy to GitHub Pages to test.');

            updateSyncStatus('Google Drive needs HTTPS', 'info');

            

            // Disable the Google Drive button for local development

            const driveBtn = document.getElementById('googleDriveBtn');

            if (driveBtn) {

                driveBtn.disabled = true;

                driveBtn.innerHTML = '<span>⚠️</span><span>Needs HTTPS</span>';

            }

        } else {

            console.log('Google Identity Services will retry in 5 seconds...');

            updateSyncStatus('Google API loading...', 'info');

            

            // Retry initialization after 5 seconds

            setTimeout(() => initializeGoogleAPI(), 5000);

        }

    }

}



window.importFromGoogleDrive = importFromGoogleDrive;

window.loadFromGoogleDrive = loadFromGoogleDrive;


