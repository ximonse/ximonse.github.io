async function saveToGoogleDriveWithStructure() {
    try {
        await ensureValidToken();
        
        // Create structured filename: projektnamn_YYYY-MM-DD_HH-MM.json
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
        const timeStr = String(now.getHours()).padStart(2, '0') + '-' + 
                       String(now.getMinutes()).padStart(2, '0');
        
        // Clean project name for filename (remove invalid chars)
        const cleanProjectName = currentProject
            .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dashes
            .replace(/\s+/g, '_')           // Replace spaces with underscores
            .substring(0, 50);              // Limit length
        
        const filename = `${cleanProjectName}_${dateStr}_${timeStr}.json`;
        
        updateSyncStatus(`Sparar till Google Drive: ${filename}`, 'loading');
        
        // Get board data
        const boardData = {
            project_name: currentProject,
            saved_date: now.toISOString(),
            cards: cy.nodes().map(node => ({
                id: node.id(),
                title: node.data('title') || '',
                text: node.data('text') || '',
                tags: node.data('tags') || [],
                hidden_tags: node.data('hidden_tags') || [],
                position: node.position(),
                pinned: node.hasClass('pinned') || false,
                isManualCard: node.data('isManualCard') || false,
                cardColor: node.data('cardColor') || null,
                // Image data
                isImageCard: node.data('isImageCard') || false,
                imageData: node.data('imageData') || null,
                imageWidth: node.data('imageWidth') || null,
                imageHeight: node.data('imageHeight') || null,
                displayWidth: node.data('displayWidth') || null,
                displayHeight: node.data('displayHeight') || null,
                calculatedHeight: node.data('calculatedHeight') || null,
                originalFileName: node.data('originalFileName') || null,
                imageNotes: node.data('imageNotes') || '',
                // Annotation data - CRITICAL for shapes/text annotations
                isAnnotation: node.data('isAnnotation') || false,
                annotationType: node.data('annotationType') || null,
                shape: node.data('shape') || null,
                textSize: node.data('textSize') || null,
                label: node.data('label') || null,
                customWidth: node.data('customWidth') || null,
                customHeight: node.data('customHeight') || null,
                backgroundColor: node.style('background-color'),
                fontSize: node.style('font-size'),
                width: node.style('width'),
                height: node.style('height'),
                // All other metadata
                export_timestamp: node.data('export_timestamp') || null,
                export_session: node.data('export_session') || null,
                export_source: node.data('export_source') || null,
                source_file: node.data('source_file') || null,
                page_number: node.data('page_number') || null,
                matched_terms: node.data('matched_terms') || null,
                card_index: node.data('card_index') || null
            })),
            edges: cy.edges().map(edge => ({
                source: edge.source().id(),
                target: edge.target().id(),
                // Save edge styling
                lineColor: edge.style('line-color'),
                targetArrowColor: edge.style('target-arrow-color'),
                targetArrowShape: edge.style('target-arrow-shape'),
                width: edge.style('width'),
                arrowScale: edge.style('arrow-scale'),
                curveStyle: edge.style('curve-style'),
                // Save edge metadata
                isAnnotation: edge.data('isAnnotation') || false,
                annotationType: edge.data('annotationType') || null,
                connectionType: edge.data('connectionType') || null
            })),
            metadata: {
                total_cards: cy.nodes().length,
                total_edges: cy.edges().length,
                version: '2.1',
                saved_from: 'spatial-notes-smart-save'
            }
        };
        
        // Find or create 'Spatial Notes' folder
        const folderId = await findOrCreateSpatialNotesFolder();
        
        // Save file to the folder
        const fileBlob = new Blob([JSON.stringify(boardData, null, 2)], { type: 'application/json' });
        
        // Check if file already exists with same name (for versioning)
        const existingFiles = await findFilesInFolder(folderId, filename);
        
        let saveResponse;
        if (existingFiles.length > 0) {
            // Update existing file
            const fileId = existingFiles[0].id;
            saveResponse = await updateFileInGoogleDrive(fileId, fileBlob);
        } else {
            // Create new file
            saveResponse = await createFileInGoogleDrive(filename, fileBlob, folderId);
        }
        
        if (saveResponse.ok) {
            const fileInfo = await saveResponse.json();
            updateSyncStatus(`✅ Sparad i Google Drive: "${filename}"`, 'success');
            console.log(`Successfully saved project "${currentProject}" to Google Drive as ${filename}`);
        } else {
            throw new Error('Failed to save to Google Drive: ' + saveResponse.statusText);
        }
        
    } catch (error) {
        console.error('Error saving to Google Drive with structure:', error);
        updateSyncStatus('Google Drive-sparning misslyckades', 'error');
        // Local save is still done, so user doesn't lose data
    }
}

// Show prompt to sign in to Google Drive
function showGoogleDriveSignInPrompt() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 10001;
        display: flex; justify-content: center; align-items: center;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white; padding: 30px; border-radius: 10px; 
        box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 400px; width: 90%;
        text-align: center; font-family: inherit;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 20px 0; color: #333;">💾 Spara online?</h3>
        <p style="margin: 15px 0; color: #666; line-height: 1.5;">
            Ditt projekt "<strong>${currentProject}</strong>" är sparat lokalt.<br><br>
            Vill du logga in på Google Drive för att spara online och synka mellan dina enheter?
        </p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
            <button id="signInYes" style="
                padding: 12px 20px; background: #007acc; color: white; 
                border: none; border-radius: 6px; cursor: pointer; font-size: 16px;
            ">🔗 Ja, logga in</button>
            <button id="signInNo" style="
                padding: 12px 20px; background: #666; color: white; 
                border: none; border-radius: 6px; cursor: pointer; font-size: 16px;
            ">📱 Nej, bara lokalt</button>
        </div>
        <p style="margin: 15px 0 5px 0; font-size: 12px; color: #999;">
            Du kan alltid logga in senare via menyn.
        </p>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Handle buttons
    document.getElementById('signInYes').onclick = () => {
        document.body.removeChild(overlay);
        // Start Google sign-in process
        toggleGoogleDriveAuth();
    };
    
    document.getElementById('signInNo').onclick = () => {
        document.body.removeChild(overlay);
        updateSyncStatus('Sparad lokalt (endast denna enhet)', 'info');
    };
    
    // Close on Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Find or create 'Spatial Notes' folder in Google Drive
async function findOrCreateSpatialNotesFolder() {
    try {
        // Search for existing 'Spatial Notes' folder
        const searchParams = new URLSearchParams({
            q: "name='Spatial Notes' and mimeType='application/vnd.google-apps.folder'",
            fields: 'files(id, name)'
        });
        
        const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?${searchParams}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const searchResult = await searchResponse.json();
        
        if (searchResult.files && searchResult.files.length > 0) {
            // Folder exists, return its ID
            return searchResult.files[0].id;
        } else {
            // Create new folder
            const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'Spatial Notes',
                    mimeType: 'application/vnd.google-apps.folder'
                })
            });
            
            const createResult = await createResponse.json();
            console.log('Created Spatial Notes folder:', createResult.id);
            return createResult.id;
        }
        
    } catch (error) {
        console.error('Error finding/creating Spatial Notes folder:', error);
        // Return null to save to root folder as fallback
        return null;
    }
}

// Find files in a specific folder
async function findFilesInFolder(folderId, filename) {
    try {
        const query = folderId 
            ? `name='${filename}' and '${folderId}' in parents`
            : `name='${filename}'`;
        
        const searchParams = new URLSearchParams({
            q: query,
            fields: 'files(id, name, modifiedTime)'
        });
        
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?${searchParams}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        return result.files || [];
        
    } catch (error) {
        console.error('Error finding files in folder:', error);
        return [];
    }
}

// Create file in Google Drive
async function createFileInGoogleDrive(filename, fileBlob, parentFolderId = null) {
    const metadata = {
        name: filename
    };
    
    if (parentFolderId) {
        metadata.parents = [parentFolderId];
    }
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', fileBlob);
    
    return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: form
    });
}

// Update existing file in Google Drive
async function updateFileInGoogleDrive(fileId, fileBlob) {
    return fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: fileBlob
    });
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

// Update authentication status
function updateAuthStatus() {
    if (!isGoogleApiLoaded) return;
    
    const driveBtn = document.getElementById('googleDriveBtn');
    const driveButtonText = document.getElementById('driveButtonText');
    
    // Check if elements exist before updating
    if (!driveBtn) {
        console.log('Google Drive button not found in DOM');
        return;
    }
    
    if (isSignedIn && accessToken) {
        if (driveButtonText) driveButtonText.textContent = `${currentProject}`;
        driveBtn.innerHTML = `✅ Google Drive (Inloggad)`;
        updateSyncStatus(`Synced: ${currentProject}`, 'success');
        
        // Start auto-sync
        startAutoSync();
    } else {
        if (driveButtonText) driveButtonText.textContent = 'Google Drive';
        driveBtn.innerHTML = `🔗 Google Drive (Ej inloggad)`;
        updateSyncStatus('', '');
        
        // Stop auto-sync when signed out
        stopAutoSync();
    }
}

// Toggle Google Drive authentication with Remember Me option
async function toggleGoogleDriveAuth() {
    if (!isGoogleApiLoaded || !tokenClient) {
        updateSyncStatus('Google API not loaded yet...', 'loading');
        return;
    }
    
    try {
        if (isSignedIn && accessToken) {
            // Sign out
            if (confirm('Logga ut från Google Drive?\n\nDetta kommer att:\n• Stoppa automatisk synkronisering\n• Du behöver logga in igen för Drive-funktioner\n• Lokalt sparade kort påverkas inte')) {
                google.accounts.oauth2.revoke(accessToken, () => {
                    console.log('Access token revoked');
                });
                
                // Clear all tokens and saved data
                clearSavedTokens();
                
                updateSyncStatus('Signed out from Google Drive', 'info');
                updateAuthStatus();
            }
        } else {
            // Show remember me dialog first
            updateSyncStatus('Förbereder inloggning...', 'loading');
            
            // Show remember me dialog and wait for user choice
            const rememberChoice = await showRememberMeDialog();
            console.log('User chose remember me:', rememberChoice);
            
            // Sign in - request access token  
            updateSyncStatus('Signing in to Google Drive...', 'loading');
            tokenClient.requestAccessToken({prompt: 'consent'});
        }
    } catch (error) {
        console.error('Authentication error:', error);
        updateSyncStatus('Authentication failed', 'error');
    }
}

// Project Management Functions

// Load list of available projects from Google Drive
async function loadAvailableProjects() {
    try {
        await ensureValidToken();
        const params = new URLSearchParams({
            q: "name contains 'spatial-notes-' and name contains '.json' and trashed=false",
            spaces: 'drive',
            fields: 'files(id, name, modifiedTime)',
            orderBy: 'modifiedTime desc'
        });
        
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            console.error('Failed to load projects:', response.statusText);
            return [];
        }
        
        const result = await response.json();
        const projects = [];
        
        result.files.forEach(file => {
            // Extract project name from filename: spatial-notes-PROJECT.json -> PROJECT
            const match = file.name.match(/^spatial-notes-(.+)\.json$/);
            if (match) {
                projects.push({
                    name: match[1],
                    fileId: file.id,
                    lastModified: file.modifiedTime
                });
            }
        });
        
        availableProjects = projects;
        projectsLoaded = true;
        console.log('Loaded projects:', projects);
        return projects;
        
    } catch (error) {
        console.error('Error loading projects:', error);
        return [];
    }
}

// Switch to a different project
async function switchProject(projectName) {
    if (projectName === currentProject) return;
    
    try {
        // Save current project first
        if (isSignedIn && accessToken) {
            updateSyncStatus('Saving current project...', 'loading');
            await saveToGoogleDrive();
        }
        
        // Switch to new project
        currentProject = projectName;
        
        // Save current project to localStorage immediately
        localStorage.setItem('google_current_project', currentProject);
        
        updateSyncStatus(`Switching to ${projectName}...`, 'loading');
        
        // Load the new project
        const success = await loadFromGoogleDrive();
        
        if (success) {
            updateSyncStatus(`✅ Loaded ${projectName}`, 'success');
        } else {
            // New project - start with empty board
            cy.nodes().remove();
            updateSyncStatus(`✅ New project: ${projectName}`, 'success');
        }
        
        // Update UI
        updateAuthStatus();
        
    } catch (error) {
        console.error('Error switching project:', error);
        updateSyncStatus('Failed to switch project', 'error');
    }
}

// Create a new project
async function createNewProject(projectName) {
    if (!projectName || projectName.trim() === '') return;
    
    // Sanitize project name
    projectName = projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Check if project already exists
    const existingProject = availableProjects.find(p => p.name === projectName);
    if (existingProject) {
        alert(`Project "${projectName}" already exists!`);
        return;
    }
    
    // Switch to new project
    await switchProject(projectName);
}

// Get current project filename
function getCurrentProjectFileName() {
    return `spatial-notes-${currentProject}.json`;
}

// Update node appearance after loading
function updateNodeAppearance(node) {
    try {
        // Apply color if node has cardColor data
        const cardColor = node.data('cardColor');
        if (cardColor) {
            const colorValue = getCardColorValue(cardColor, getCurrentTheme());
            node.style('background-color', colorValue);
        }
        
        // Apply pinned styling if needed
        const isPinned = node.data('isPinned');
        if (isPinned) {
            node.addClass('pinned');
            node.data('pinned', true);
            node.ungrabify(); // Prevent dragging pinned cards
        } else {
            node.grabify(); // Make sure non-pinned cards are draggable
        }
        
        // Update text content and height with delay to ensure DOM is ready
        setTimeout(() => {
            try {
                const heightInfo = getMeasuredTextHeight(node);
                console.log(`Setting height for node ${node.id()}: ${heightInfo}px`);
                node.style('height', heightInfo + 'px');
            } catch (heightError) {
                console.error('Error calculating height for node:', node.id(), heightError);
                // Fallback to default height calculation with proper padding
                const textLength = (node.data('text') || '').length;
                const defaultHeight = Math.max(140, textLength * 0.8 + 60); // 140px minimum fallback
                console.log(`Fallback height for ${node.id()}: ${defaultHeight}px`);
                node.style('height', defaultHeight + 'px');
            }
        }, 100);
        
    } catch (error) {
        console.error('Error updating node appearance:', error);
        // Continue without styling rather than failing
    }
}

// Update sync status display using the existing search results info area
function updateSyncStatus(message, type = '') {
    const statusEl = document.querySelector('.search-results-info');
    
    if (!statusEl) {
        console.log('Status element not found');
        return;
    }
    
    // Show the status box and set message
    statusEl.textContent = message;
    statusEl.classList.add('visible');
    
    // Clear existing type classes
    statusEl.classList.remove('sync-success', 'sync-error', 'sync-loading', 'sync-info');
    
    // Add type-specific styling
    if (type) {
        statusEl.classList.add(`sync-${type}`);
    }
    
    // Auto-clear status after 5 seconds for non-permanent messages
    if (type === 'loading' || type === 'info') {
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.classList.remove('visible', 'sync-loading', 'sync-info');
        }, 5000);
    } else if (type === 'error') {
        // Keep error messages longer
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.classList.remove('visible', 'sync-error');
        }, 8000);
    } else if (type === 'success') {
        // Keep success messages for a medium time
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.classList.remove('visible', 'sync-success');
        }, 6000);
    }
}

// Save board to Google Drive
async function saveToGoogleDrive() {
    try {
        // Ensure we have a valid token
        await ensureValidToken();
        
        console.log(`Saving project "${currentProject}" to Google Drive...`);
        updateSyncStatus('Saving to Google Drive...', 'loading');
        
        const cardCount = cy.nodes().length;
        console.log(`Preparing to save ${cardCount} cards`);
        
        const boardData = {
            cards: cy.nodes().map(node => ({
                id: node.id(),
                title: node.data('title') || '',
                text: node.data('text') || '',
                tags: node.data('tags') || [],
                hidden_tags: node.data('hidden_tags') || [],
                x: node.position('x'),
                y: node.position('y'),
                cardColor: node.data('cardColor') || '',
                export_source: node.data('export_source') || '',
                source_file: node.data('source_file') || '',
                matched_terms: node.data('matched_terms') || '',
                isManualCard: node.data('isManualCard') || false,
                isPinned: node.data('isPinned') || false,
                pinned: node.hasClass('pinned') || false,
                // Image data - CRITICAL for image persistence
                type: node.data('type') || 'text',
                isImageCard: node.data('isImageCard') || false,
                imageData: node.data('imageData') || null,
                imageWidth: node.data('imageWidth') || null,
                imageHeight: node.data('imageHeight') || null,
                displayWidth: node.data('displayWidth') || null,
                displayHeight: node.data('displayHeight') || null,
                calculatedHeight: node.data('calculatedHeight') || null,
                originalFileName: node.data('originalFileName') || null,
                imageNotes: node.data('imageNotes') || '',
                annotation: node.data('annotation') || null,
                searchableText: node.data('searchableText') || null,
                // Annotation data - CRITICAL for shapes/text annotations
                isAnnotation: node.data('isAnnotation') || false,
                annotationType: node.data('annotationType') || null,
                shape: node.data('shape') || null,
                textSize: node.data('textSize') || null,
                label: node.data('label') || null,
                customWidth: node.data('customWidth') || null,
                customHeight: node.data('customHeight') || null,
                backgroundColor: node.style('background-color'),
                fontSize: node.style('font-size'),
                width: node.style('width'),
                height: node.style('height'),
                // Other metadata
                export_timestamp: node.data('export_timestamp') || null,
                export_session: node.data('export_session') || null,
                page_number: node.data('page_number') || null,
                card_index: node.data('card_index') || null
            })),
            edges: cy.edges().map(edge => ({
                source: edge.source().id(),
                target: edge.target().id(),
                // Save edge styling
                lineColor: edge.style('line-color'),
                targetArrowColor: edge.style('target-arrow-color'),
                targetArrowShape: edge.style('target-arrow-shape'),
                width: edge.style('width'),
                arrowScale: edge.style('arrow-scale'),
                curveStyle: edge.style('curve-style'),
                // Save edge metadata
                isAnnotation: edge.data('isAnnotation') || false,
                annotationType: edge.data('annotationType') || null,
                connectionType: edge.data('connectionType') || null
            })),
            timestamp: new Date().toISOString(),
            version: '2.0'
        };
        
        const fileContent = JSON.stringify(boardData, null, 2);
        const fileName = getCurrentProjectFileName();
        
        console.log(`File to save: ${fileName}`);
        console.log(`Content length: ${fileContent.length} characters`);
        console.log(`Board data:`, boardData);
        
        // Check if file already exists
        console.log('Checking if file exists...');
        const existingFileId = await findSpatialNotesFile();
        console.log('Existing file ID:', existingFileId);
        
        if (existingFileId) {
            // Update existing file
            const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: fileContent
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update file: ${response.statusText}`);
            }
        } else {
            // Create new file (simple approach)
            const metadata = {
                name: fileName
            };
            
            // First create the file metadata
            const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            });
            
            if (!createResponse.ok) {
                throw new Error(`Failed to create file: ${createResponse.statusText}`);
            }
            
            const fileInfo = await createResponse.json();
            
            // Then upload the content
            const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileInfo.id}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: fileContent
            });
            
            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload content: ${uploadResponse.statusText}`);
            }
        }
        
        updateSyncStatus('✅ Saved to Drive', 'success');
        return true;
    } catch (error) {
        console.error('Error saving to Google Drive:', error);
        
        // If error is auth-related, clear tokens and update UI
        if (error.message.includes('Not signed in') || error.message.includes('Token refresh failed')) {
            clearSavedTokens();
            updateAuthStatus();
            updateSyncStatus('Please sign in to Google Drive', 'error');
        } else {
            updateSyncStatus('Failed to save to Drive', 'error');
        }
        return false;
    }
}

// Load board from Google Drive
async function loadFromGoogleDrive() {
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
                            'background-fit': 'cover',
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

// Find existing spatial notes file in Google Drive
async function findSpatialNotesFile() {
    try {
        const fileName = getCurrentProjectFileName();
        const params = new URLSearchParams({
            q: `name='${fileName}' and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name)'
        });
        
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to search files: ${response.statusText}`);
        }
        
        const result = await response.json();
        const files = result.files;
        return files && files.length > 0 ? files[0].id : null;
    } catch (error) {
        console.error('Error searching for spatial notes file:', error);
        return null;
    }
}

// Show project manager modal
async function showProjectManager() {
    if (!isSignedIn || !accessToken) {
        alert('Please sign in to Google Drive first!');
        return;
    }
    
    // Load latest projects
    await loadAvailableProjects();
    
    let html = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="closeProjectManager(event)">
            <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;" onclick="event.stopPropagation();">
                <h2 style="margin-top: 0; text-align: center;">📁 Project Manager</h2>
                
                <div style="margin-bottom: 20px;">
                    <strong>Current Project:</strong> <span style="color: #007acc;">${currentProject}</span>
                </div>
                
                <h3>Available Projects:</h3>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
    `;
    
    if (availableProjects.length === 0) {
        html += '<p style="text-align: center; color: #666;">No projects found. Create your first project below!</p>';
    } else {
        availableProjects.forEach(project => {
            const isCurrentProject = project.name === currentProject;
            const lastModified = new Date(project.lastModified);
            const date = lastModified.toLocaleDateString('sv-SE'); // YYYY-MM-DD format
            const time = lastModified.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }); // HH:MM format
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee; ${isCurrentProject ? 'background: #f0f8ff;' : ''}">
                    <div>
                        <strong>${project.name}</strong> ${isCurrentProject ? '(current)' : ''}
                        <br><small style="color: #666;">Sparad: ${date} kl. ${time}</small>
                    </div>
                    <div>
                        ${!isCurrentProject ? `<button onclick="switchToProject('${project.name}')" style="margin-right: 5px; padding: 4px 8px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">Switch</button>` : ''}
                        <button onclick="deleteProject('${project.name}')" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
    }
    
    html += `
                </div>
                
                <h3 style="margin-top: 25px;">Create New Project:</h3>
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <input type="text" id="newProjectName" placeholder="Project name..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="createProject()" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Create</button>
                </div>
                
                <div style="text-align: center; margin-top: 25px;">
                    <button onclick="closeProjectManager()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    const modal = document.createElement('div');
    modal.id = 'projectManagerModal';
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// Close project manager modal
function closeProjectManager(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('projectManagerModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Switch to project from modal
async function switchToProject(projectName) {
    closeProjectManager();
    await switchProject(projectName);
}

// Create project from modal
async function createProject() {
    const input = document.getElementById('newProjectName');
    const projectName = input.value.trim();
    
    if (!projectName) {
        alert('Please enter a project name!');
        return;
    }
    
    closeProjectManager();
    await createNewProject(projectName);
}

// Delete project
async function deleteProject(projectName) {
    if (projectName === currentProject) {
        alert('Cannot delete the current project! Switch to another project first.');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete project "${projectName}"? This cannot be undone!`)) {
        return;
    }
    
    try {
        // Find and delete the project file
        const project = availableProjects.find(p => p.name === projectName);
        if (project) {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${project.fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (response.ok) {
                // Refresh project list and modal
                await loadAvailableProjects();
                closeProjectManager();
                setTimeout(() => showProjectManager(), 100);
                updateSyncStatus(`Deleted project: ${projectName}`, 'info');
            } else {
                alert('Failed to delete project: ' + response.statusText);
            }
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project: ' + error.message);
    }
}

// Auto-sync functionality
let autoSyncInterval;
function startAutoSync() {
    if (!isSignedIn || !accessToken) return;
    
    // Auto-save to Drive every 20 minutes when signed in
    autoSyncInterval = setInterval(async () => {
        if (isSignedIn && accessToken) {
            await saveToGoogleDrive();
        }
    }, 20 * 60 * 1000);
}

function stopAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initCytoscape();
    loadSavedTheme(); // Load theme before anything else
    
    // Check for potential conflicts on startup
    checkStartupConflicts();
    
    // Start autosave system
    startAutosave();
    
    // Add change tracking to Cytoscape events
    cy.on('add remove position', function(evt) {
        markChanged();
    });
    
    // Also track manual edits through existing edit functions
    // (editCard, editCodeCard, etc. already call saveBoard which resets hasChanges)
    
    // Load current project from localStorage even without Google login
    const savedProject = localStorage.getItem('google_current_project');
    if (savedProject) {
        currentProject = savedProject;
        console.log(`Restored current project: ${currentProject}`);
    }
    
    // Initialize Google Drive API (wait for gapi to load)
    setTimeout(() => initializeGoogleAPI(), 3000);
    
    // Initialize project name UI
    initializeProjectName();
    
    // Initialize simplified toolbar state
    updateToolbarDisplay();

    // ➕ button long-press functionality for iPad clipboard paste
    const newCardBtn = document.querySelector('.new-card-btn');
    if (newCardBtn) {
        let longPressTimer = null;
        let isLongPress = false;

        newCardBtn.addEventListener('touchstart', function(e) {
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                // Long press detected - show image source menu
                // This works better on iPad than clipboard API (which has strict permission requirements)
                const touch = e.touches[0];
                if (touch) {
                    showImageSourceMenu(touch.clientX, touch.clientY);
                }
            }, 800); // 800ms for long press
        });

        newCardBtn.addEventListener('touchend', function(e) {
            clearTimeout(longPressTimer);
            if (isLongPress) {
                e.preventDefault(); // Prevent normal click if it was a long press
            }
        });

        newCardBtn.addEventListener('touchcancel', function(e) {
            clearTimeout(longPressTimer);
        });
    }

    // Enhanced save function that includes Drive sync (after original function is defined)
    setTimeout(() => {
        const originalSaveBoard = window.saveBoard;
        window.saveBoard = function() {
            // Always save to localStorage first
            if (originalSaveBoard) {
                originalSaveBoard();
            }
            
            // Update column view if active (for markdown and other changes)
            if (isColumnView) {
                renderColumnViewDebounced();
            }
            
            // Also save to Drive if signed in
            if (isSignedIn && accessToken) {
                saveToGoogleDrive();
            }
        }
    }, 100);
    
    // Auto-load from localStorage if data exists (silent load)
    setTimeout(() => {
        const savedData = localStorage.getItem('spatial-notes-board');
        if (savedData) {
            try {
                const boardData = JSON.parse(savedData);
                if (boardData.cards && boardData.cards.length > 0) {
                    console.log(`Auto-loading ${boardData.cards.length} cards from localStorage...`);
                    
                    // Clear any existing content first
                    cy.nodes().remove();
                    cy.edges().remove();
                    
                    // Use the full loadBoard functionality but suppress alerts
                    const originalAlert = window.alert;
                    window.alert = () => {}; // Temporarily disable alerts
                    
                    // Manually trigger the full load process
                    loadBoardFromData(boardData);
                    
                    // Restore alert function
                    window.alert = originalAlert;
                    
                    console.log(`✅ Auto-loaded ${boardData.cards.length} cards and ${(boardData.edges || []).length} edges from localStorage`);
                    
                    // Apply temporal markings after loading
                    setTimeout(() => {
                        applyTemporalMarkings();
                    }, 500);
                }
            } catch (e) {
                console.log('Error auto-loading:', e);
            }
        }
    }, 100);
    
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(this.value);
        }, 300);
    });
    
    // Make status info clickable to close (especially useful on mobile)
    const searchInfo = document.getElementById('searchInfo');
    searchInfo.addEventListener('click', function() {
        this.classList.remove('visible');
    });
    
    // Clear search when input is empty
    searchInput.addEventListener('keyup', function() {
        if (!this.value.trim()) {
            clearSearch();
        }
    });
    
    // Handle Enter key to convert search matches to selected cards
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const searchMatches = cy.$('.search-match');
            console.log('Enter in search box, found matches by class:', searchMatches.length);
            if (searchMatches.length > 0) {
                // Convert search matches to selected cards
                searchMatches.select();
                console.log('Selected search matches, now clearing search visual');
                
                // Clear search visuals but keep cards selected
                searchActive = false;
                cy.nodes().removeClass('search-match');
                cy.nodes().removeClass('search-non-match'); // Remove blur
                cy.nodes().data('searchMatch', false);
                // Don't unselect cards like clearSearch() does
                
                const searchInfo = document.getElementById('searchInfo');
                searchInfo.classList.remove('visible');
                
                // Blur the search input so keyboard shortcuts work
                this.blur();
                e.preventDefault();
            }
        }
    });
    
    // Tag filter functionality
    const tagFilterInput = document.getElementById('tagFilterInput');
    let tagFilterTimeout;
    
    tagFilterInput.addEventListener('input', function() {
        clearTimeout(tagFilterTimeout);
        tagFilterTimeout = setTimeout(() => {
            performTagFilter(this.value);
        }, 300);
    });
    
    tagFilterInput.addEventListener('keyup', function() {
        if (!this.value.trim()) {
            clearTagFilter();
        }
    });
    
    // Handle Enter key to convert tag filter matches to selected cards
    tagFilterInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            // For tag filtering, matches are nodes WITHOUT .tag-filtered class
            const tagMatches = cy.nodes().not('.tag-filtered');
            console.log('Enter in tag filter box, found tag matches:', tagMatches.length);
            if (tagMatches.length > 0) {
                // Convert tag filter matches to selected cards
                tagMatches.select();
                console.log('Selected tag filter matches, now clearing tag filter visual');
                
                // Clear tag filter visuals but keep cards selected
                clearTagFilter();
                
                // Remove focus from input so keyboard shortcuts work
                this.blur();
                
                e.preventDefault();
            }
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // ESC: Show all cards (reset AI filter)
        if (e.key === 'Escape' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
            e.preventDefault();
            showAllCards();
            return;
        }

        // Skip keyboard shortcuts if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        // Enkla kortkommandon (bara om inte i input-fält)

        // N för ny anteckning (vår nya textarea-version)
        if (e.key === 'n' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            addNewCard();
        }
        
        // C för kopiera markerade kort
        if (e.key === 'c' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            copySelectedCards();
        }
        
        // (Delete-tangenten hanteras längre ner)
        
        // S för spara - Smart save with Google Drive integration
        if (e.key === 's' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            smartSave();
        }
        
        // L för ladda sparad bräda
        if (e.key === 'l' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            loadBoard();
        }

        // Z för Zotero HTML import
        if (e.key === 'z' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            document.getElementById('zoteroHtmlInput').click();
        }

        // F för fokusera sökrutan
        if (e.key === 'f' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
        
        // D för Draw (toggle annotation toolbar)
        if (e.key === 'd' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            toggleAnnotationToolbar();
        }
        
        // A för Arrow (aktivera pil-verktyg direkt från vilken läge som helst)
        if (e.key === 'a' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            // Öppna toolbar om den inte är öppen
            if (!annotationToolbarVisible) {
                toggleAnnotationToolbar();
            }
            // Vänta en kort stund för att toolbar ska öppnas, sedan aktivera arrow
            setTimeout(() => {
                const arrowTool = document.querySelector('[data-tool="arrow"]');
                if (arrowTool) {
                    // Ta bort active från alla verktyg
                    document.querySelectorAll('.annotation-tool').forEach(tool => {
                        tool.classList.remove('active');
                    });
                    // Aktivera arrow tool
                    arrowTool.classList.add('active');
                    arrowTool.click();
                    console.log('✨ Arrow tool aktiverat med A-tangent');
                }
            }, 100);
        }
        
        // Ctrl+S för spara (behåll som backup)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveBoard();
        }
        
        // Ctrl+Z för undo - MINIMAL IMPLEMENTATION
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (undoStack.length > 0) {
                const currentState = {
                    cards: cy.nodes().map(node => ({
                        id: node.id(),
                        position: { x: node.position().x, y: node.position().y },
                        selected: node.selected()
                    }))
                };
                redoStack.push(currentState);
                
                const previousState = undoStack.pop();
                restoreState(previousState);
                console.log('Undo performed');
            }
        }
        
        // Ctrl+Y för redo - MINIMAL IMPLEMENTATION  
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            if (redoStack.length > 0) {
                const currentState = {
                    cards: cy.nodes().map(node => ({
                        id: node.id(),
                        position: { x: node.position().x, y: node.position().y },
                        selected: node.selected()
                    }))
                };
                undoStack.push(currentState);
                
                const nextState = redoStack.pop();
                restoreState(nextState);
                console.log('Redo performed');
            }
        }
        
        // Ctrl+O för ladda (behåll som backup)
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            loadBoard();
        }
        
        // Multi-selection shortcuts
        // P för pin selected cards
        if (e.key === 'p' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            pinSelectedCards();
        }
        
        // U för unpin selected cards
        if (e.key === 'u' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            unpinSelectedCards();
        }
        
        // Delete för ta bort markerade kort
        if (e.key === 'Delete') {
            e.preventDefault();
            deleteSelectedCards();
        }
        
        // Ctrl+A för markera alla opinnde kort (pinnade kort påverkas inte)
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            cy.nodes().not('.pinned').select();
        }
        
        // DEBUG: Ctrl+Shift+D för att dumpa alla kort-positioner
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            console.log('\n=== KORT POSITIONER DEBUG ===');
            cy.nodes().forEach(node => {
                const pos = node.position();
                const title = node.data('title') || 'Untitled';
                console.log(`${node.id()}: x: ${Math.round(pos.x)}, y: ${Math.round(pos.y)} - "${title}"`);
            });
            console.log('=== SLUT DEBUG ===\n');
            
            // Visa också på skärmen
            const searchInfo = document.getElementById('searchInfo');
            if (searchInfo) {
                searchInfo.textContent = 'Kort-positioner dumpade till console (F12)';
                searchInfo.classList.add('visible');
                setTimeout(() => {
                    searchInfo.classList.remove('visible');
                }, 3000);
            }
        }
        
        // Enter för att konvertera sökträffar till markerade kort
        if (e.key === 'Enter') {
            const searchMatches = cy.$('node[searchMatch="true"]');
            console.log('Enter pressed, found search matches:', searchMatches.length);
            if (searchMatches.length > 0) {
                // Konvertera sökträffar till riktigt markerade kort
                searchMatches.select();
                console.log('Selected search matches, now clearing search');
                // Rensa sökmarkering men behåll som markerade
                clearSearch();
                e.preventDefault();
            }
        }
        
        // Escape för rensa sökning och avmarkera alla kort
        if (e.key === 'Escape') {
            if (cy.$('node[searchMatch="true"]').length > 0) {
                clearSearch(); // Rensa sökning
            } else {
                cy.nodes().unselect(); // Avmarkera alla kort
            }
        }
        
        
        // Track keys for combination detection
        window.keysPressed = window.keysPressed || new Set();
        window.keysPressed.add(e.key.toLowerCase());
        
        // Handle G+V, G+H, G+T combinations (grid variants for selected cards)
        if (window.keysPressed.has('g') && window.keysPressed.has('v')) {
            e.preventDefault();
            arrangeSelectedGridVerticalColumns();
            return;
        }
        if (window.keysPressed.has('g') && window.keysPressed.has('h')) {
            e.preventDefault();
            arrangeSelectedGridHorizontalPacked();
            return;
        }
        if (window.keysPressed.has('g') && window.keysPressed.has('t')) {
            e.preventDefault();
            console.log('G+T pressed, mouse position:', lastMousePosition);
            arrangeSelectedGridTopAligned();
            return;
        }
        
        // V för vertikal kolumn (markerade kort) - only if G is not pressed
        if (e.key === 'v' && !e.ctrlKey && !e.altKey && !window.keysPressed.has('g')) {
            e.preventDefault();
            arrangeSelectedInColumn();
            return;
        }
        
        // H för horisontell rad top-aligned (markerade kort)  
        if (e.key === 'h' && !e.ctrlKey && !e.altKey && !window.keysPressed.has('g')) {
            e.preventDefault();
            arrangeSelectedInRow();
        }
        
        // T för färgval (markerade kort) - only if G is not pressed
        if (e.key === 't' && !e.ctrlKey && !e.altKey && !e.shiftKey && !window.keysPressed.has('g')) {
            e.preventDefault();
            const selectedNodes = cy.$('node:selected');
            if (selectedNodes.length > 0) {
                // Create fake event with screen center position
                const fakeEvent = {
                    clientX: window.innerWidth / 2,
                    clientY: window.innerHeight / 2
                };
                showColorPicker(fakeEvent, selectedNodes);
            }
        }
        
        // Shift+T för att växla förenklad/full toolbar
        if (e.shiftKey && e.key === 'T' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            toggleSimplifiedToolbar();
        }
        
        // Siffertangenter 1-8 för direktfärgning
        if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key) && !e.ctrlKey && !e.altKey && !window.keysPressed.has('g')) {
            const selectedNodes = cy.$('node:selected');
            if (selectedNodes.length > 0) {
                e.preventDefault();
                const colorNumber = parseInt(e.key);
                const colorId = `card-color-${colorNumber}`;
                console.log(`Direct color shortcut ${colorNumber}, applying to ${selectedNodes.length} cards`);

                // Apply color to all selected nodes
                selectedNodes.forEach(node => {
                    node.data('cardColor', colorId);
                    const colorValue = getCardColorValue(colorId, getCurrentTheme());
                    node.style('background-color', colorValue);
                });

                // Save immediately to prevent data loss from autosave/Drive sync
                saveBoard();

                console.log(`Applied color ${colorNumber} to ${selectedNodes.length} cards via shortcut`);
            }
        }
        
        // 0 för att ta bort färg (återställa)
        if (e.key === '0' && !e.ctrlKey && !e.altKey && !window.keysPressed.has('g')) {
            const selectedNodes = cy.$('node:selected');
            if (selectedNodes.length > 0) {
                e.preventDefault();
                console.log(`Remove color shortcut, removing from ${selectedNodes.length} cards`);

                // Remove color from all selected nodes
                selectedNodes.forEach(node => {
                    removeCardColor(node);
                });

                // Save immediately to prevent data loss from autosave/Drive sync
                saveBoard();

                console.log(`Removed color from ${selectedNodes.length} cards via shortcut`);
            }
        }
        
        
        // Q toggles between cluster (ruffig) and stack (prydlig) - infinite loop
        if (e.key === 'q' && !e.ctrlKey && !e.altKey) {
            const now = Date.now();
            const lastQTime = window.lastQPress || 0;
            
            e.preventDefault();
            
            if (now - lastQTime < 500) {
                // Recent Q press - toggle to the other arrangement
                const wasCluster = window.lastQWasCluster || true;
                if (wasCluster) {
                    console.log('Q toggle: cluster → stack');
                    stackSelectedCards();
                    window.lastQWasCluster = false;
                } else {
                    console.log('Q toggle: stack → cluster');
                    clusterSelectedCards();
                    window.lastQWasCluster = true;
                }
                window.lastQPress = now; // Continue the chain
            } else {
                // First Q or timeout - always start with cluster
                console.log('Q start: cluster');
                clusterSelectedCards();
                window.lastQWasCluster = true;
                window.lastQPress = now;
            }
        }
        
        // Alt+S för neat stack (samma som N)
        if (e.key === 's' && e.altKey && !e.ctrlKey) {
            e.preventDefault();
            stackSelectedCards();
        }
        
        // Gamla arrangement shortcuts 1,2,3 borttagna för färgfunktionen
        // Använd istället V (kolumn), H (rad), Q (rutnät)
        
        // Column view specific shortcuts
        // I för importance sorting (äldsta datum + #todo först) - endast i kolumnvy
        if (e.key === 'i' && !e.ctrlKey && !e.altKey && isColumnView) {
            e.preventDefault();
            setColumnViewSort('importance');
        }
        
        // W för background-color sorting (röd→blå) - endast i kolumnvy
        if (e.key === 'w' && !e.ctrlKey && !e.altKey && isColumnView) {
            e.preventDefault();
            setColumnViewSort('background-color');
        }
        
        // M för multi-card paste (öppna dialog)
        if (e.key === 'm' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            showMultiCardPasteDialog();
        }
        
        // K för toggla mellan bräd och kolumnvy
        if (e.key === 'k' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            toggleView();
        }
        
    });
    
    // Clear pressed keys on keyup for combination detection
    document.addEventListener('keyup', function(e) {
        if (window.keysPressed) {
            window.keysPressed.delete(e.key.toLowerCase());
        }
    });
    
    // Handle mobile dropdown menus (touch/click to activate)
    document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('.menu-button');
        
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Close all other dropdowns
            document.querySelectorAll('.menu-dropdown').forEach(otherDropdown => {
                if (otherDropdown !== dropdown) {
                    otherDropdown.classList.remove('active');
                }
            });
            
            // Toggle this dropdown
            dropdown.classList.toggle('active');
        });
        
    });
    
    // Close dropdowns when clicking inside dropdown buttons (Android fix)
    document.querySelectorAll('.dropdown-content button').forEach(button => {
        button.addEventListener('click', function(e) {
            // Close all dropdowns when any dropdown button is clicked
            document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        });
    });
    
    // Close dropdowns when clicking outside or on cytoscape canvas
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.menu-dropdown')) {
            document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
    
});

// Column View Implementation
let isColumnView = false;
let columnCardStates = new Map(); // Track which cards show text vs image

function toggleView() {
