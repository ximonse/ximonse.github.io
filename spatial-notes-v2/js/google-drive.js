
// Google Drive API Configuration
const GOOGLE_CLIENT_ID = '971005822021-8ebrpd92n1upsedg7s5fn80mnmvhou5d.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU01T1-DQ-dY4'; // Public API key for Picker
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

// Open Google Drive Picker to select multiple images
async function importFromGoogleDrive() {
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
        .setDeveloperKey(GOOGLE_API_KEY)
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
window.importFromGoogleDrive = importFromGoogleDrive;
window.loadFromGoogleDrive = loadFromGoogleDrive;