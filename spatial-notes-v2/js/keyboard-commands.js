function executeCommand(command) {
    const selectedNodes = cy.$('node:selected');
    
    switch(command) {
        case 'H':
            arrangeSelectedInRow();
            break;
        case 'G+V':
            arrangeSelectedGridVerticalColumns();
            break;
        case 'G+H':
            arrangeSelectedGridHorizontalPacked();
            break;
        case 'G+T':
            arrangeSelectedGridTopAligned();
            break;
        case 'Q':
            clusterSelectedCards();
            break;
        case 'C':
            copySelectedCards();
            break;
        case 'T':
            const selectedNodes = cy.$('node:selected');
            if (selectedNodes.length > 0) {
                const fakeEvent = {
                    clientX: window.innerWidth / 2,
                    clientY: window.innerHeight / 2
                };
                showColorPicker(fakeEvent, selectedNodes);
            }
            break;
        case 'V':
            arrangeSelectedInColumn();
            break;
        case 'Stack':
        case 'QQ':
        case 'Alt+S':
            stackSelectedCards();
            break;
        case 'Pin':
            selectedNodes.forEach(node => {
                pinCard(node);
            });
            break;
        case 'Unpin':
            selectedNodes.forEach(node => {
                unpinCard(node);
            });
            break;
        case 'Delete':
            deleteSelectedCards();
            break;
        case 'Ctrl+Z':
            // Trigger undo
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
            }
            break;
        case 'Ctrl+Y':
            // Trigger redo
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
            }
            break;
        case 'Ctrl+A':
            cy.nodes().not('.pinned').select();
            break;
        case 'Ctrl+S':
            saveBoard();
            break;
    }
}

function debugDumpPositions() {
    console.log('\n=== KORT POSITIONER DEBUG ===');
    cy.nodes().forEach(node => {
        const pos = node.position();
        const title = node.data('title') || 'Untitled';
        console.log(`${node.id()}: x: ${Math.round(pos.x)}, y: ${Math.round(pos.y)} - "${title}"`);
    });
    console.log('=== SLUT DEBUG ===\n');
    
    const searchInfo = document.getElementById('searchInfo');
    if (searchInfo) {
        searchInfo.textContent = 'Kort-positioner dumpade till console (F12)';
        searchInfo.classList.add('visible');
        setTimeout(() => {
            searchInfo.classList.remove('visible');
        }, 3000);
    }
}

function toggleDarkTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('themeBtn');

    let currentTheme = 'light';
    if (body.classList.contains('dark-theme')) {
        currentTheme = 'dark';
    } else if (body.classList.contains('sepia-theme')) {
        currentTheme = 'sepia';
    } else if (body.classList.contains('eink-theme')) {
        currentTheme = 'eink';
    }

    // Cycle through themes: light -> dark -> sepia -> eink -> light
    if (currentTheme === 'light') {
        body.classList.remove('eink-theme', 'sepia-theme');
        body.classList.add('dark-theme');
        themeBtn.innerHTML = '📜 Sepia';
        localStorage.setItem('theme', 'dark');
        applyCardTheme('dark');
    } else if (currentTheme === 'dark') {
        body.classList.remove('dark-theme', 'eink-theme');
        body.classList.add('sepia-theme');
        themeBtn.innerHTML = '📄 E-ink';
        localStorage.setItem('theme', 'sepia');
        applyCardTheme('sepia');
    } else if (currentTheme === 'sepia') {
        body.classList.remove('dark-theme', 'sepia-theme');
        body.classList.add('eink-theme');
        themeBtn.innerHTML = '☀️ Ljust';
        localStorage.setItem('theme', 'eink');
        applyCardTheme('eink');
    } else {
        body.classList.remove('dark-theme', 'sepia-theme', 'eink-theme');
        themeBtn.innerHTML = '🌙 Mörkt';
        localStorage.setItem('theme', 'light');
        applyCardTheme('light');
    }
}

// Get card color value based on theme
function getCardColorValue(colorId, theme) {
    const colors = {
        light: {
            1: '#d4f2d4', // Grön
            2: '#ffe4b3', // Orange
            3: '#ffc1cc', // Röd
            4: '#fff7b3', // Gul
            5: '#f3e5f5', // Lila
            6: '#c7e7ff', // Blå
            7: '#e0e0e0', // Grå
            8: '#ffffff'  // Vit
        },
        dark: {
            1: '#3d5a3d', // Mörk Grön
            2: '#5a4d3a', // Mörk Orange
            3: '#5a3c3a', // Mörk Röd
            4: '#5a5a3a', // Mörk Gul
            5: '#4a3d5a', // Mörk Lila
            6: '#2e4a6f', // Mörk Blå
            7: '#555555', // Mörk Grå
            8: '#8a8a8a'  // Ljusgrå (vit blir för ljus i dark theme)
        },
        sepia: {
            1: '#ded6c7', // Sepia Grön
            2: '#e6d6c2', // Sepia Orange
            3: '#ead6c7', // Sepia Röd
            4: '#ebe2d6', // Sepia Gul
            5: '#e2d6c7', // Sepia Lila
            6: '#d6c7b3', // Sepia Blå
            7: '#c0b8a8', // Sepia Grå
            8: '#f5f2e8'  // Sepia Vit
        }
    };
    
    // Extract number from colorId (card-color-1 -> 1)
    const colorNumber = colorId.toString().replace('card-color-', '');
    
    return colors[theme] && colors[theme][colorNumber] ? colors[theme][colorNumber] : null;
}

function applyCardTheme(theme) {
    if (cy) {
        if (theme === 'dark') {
            // Dark theme styling
            cy.style()
                .selector('node').style({
                    'background-color': function(node) {
                        const cardColor = node.data('cardColor');
                        if (cardColor) {
                            // Color priority: if card has color, use it regardless of theme
                            return getCardColorValue(cardColor, 'dark');
                        }
                        return '#2a2a2a';
                    },
                    'color': '#f0f0f0',
                    'border-color': '#555'
                })
                .selector('node:selected').style({
                    'border-color': '#66b3ff',  // Bright blue for visibility
                    'border-width': 5,
                    'box-shadow': '0 0 25px rgba(102, 179, 255, 0.8)'
                })
                .selector('node.search-match').style({
                    'background-color': '#4a3c00',  // Dark yellow background
                    'border-color': '#ffcc00',     // Bright yellow border
                    'border-width': 3,
                    'box-shadow': '0 0 15px rgba(255, 204, 0, 0.6)'
                })
                .selector('node.pinned').style({
                    'border-color': '#4caf50',  // Bright green
                    'border-width': 4,
                    'box-shadow': '0 0 15px rgba(76, 175, 80, 0.6)'
                })
                .selector('node.temporal-marked').style({
                    'border-width': function(node) {
                        return node.data('temporalBorderWidth') || 6;
                    },
                    'border-color': function(node) {
                        return node.data('temporalBorderColor') || '#ff4500';
                    }
                })
                .update();
        } else if (theme === 'sepia') {
            // Sepia theme styling
            cy.style()
                .selector('node').style({
                    'background-color': function(node) {
                        const cardColor = node.data('cardColor');
                        if (cardColor) {
                            return getCardColorValue(cardColor, 'sepia');
                        }
                        return '#f0e6d2';
                    },
                    'color': '#5d4e37',
                    'border-color': '#c8a882'
                })
                .selector('node:selected').style({
                    'border-color': '#8b7556',  // Dark brown for sepia
                    'border-width': 4,
                    'box-shadow': '0 0 20px rgba(139, 117, 86, 0.7)'
                })
                .selector('node.search-match').style({
                    'background-color': '#f4e8d0',  // Light sepia highlight
                    'border-color': '#d2691e',     // Chocolate border
                    'border-width': 2,
                    'box-shadow': '0 0 10px rgba(210, 105, 30, 0.5)'
                })
                .selector('node.pinned').style({
                    'border-color': '#8fbc8f',  // Dark sea green for sepia
                    'border-width': 4,
                    'box-shadow': '0 0 15px rgba(143, 188, 143, 0.6)'
                })
                .selector('node.temporal-marked').style({
                    'border-width': function(node) {
                        return node.data('temporalBorderWidth') || 6;
                    },
                    'border-color': function(node) {
                        return node.data('temporalBorderColor') || '#ff4500';
                    }
                })
                .update();
        } else if (theme === 'eink') {
            // E-ink theme styling - no shadows, sharp contrast
            cy.style()
                .selector('node').style({
                    'background-color': function(node) {
                        const cardColor = node.data('cardColor');
                        if (cardColor) {
                            // Keep card colors - user said it's OK
                            return getCardColorValue(cardColor, 'light');
                        }
                        return '#ffffff';
                    },
                    'color': '#000000',
                    'border-color': '#000000',
                    'border-width': 2
                })
                .selector('node:selected').style({
                    'border-color': '#000000',
                    'border-width': 4,
                    'box-shadow': 'none'  // No shadows for e-ink
                })
                .selector('node.search-match').style({
                    'background-color': '#f0f0f0',
                    'border-color': '#000000',
                    'border-width': 3,
                    'box-shadow': 'none'  // No shadows for e-ink
                })
                .selector('node.pinned').style({
                    'border-color': '#000000',
                    'border-width': 4,
                    'box-shadow': 'none'  // No shadows for e-ink
                })
                .selector('node.temporal-marked').style({
                    'border-width': function(node) {
                        return node.data('temporalBorderWidth') || 4;
                    },
                    'border-color': '#000000'  // All black for e-ink
                })
                .update();
        } else {
            // Light theme styling (default)
            cy.style()
                .selector('node').style({
                    'background-color': function(node) {
                        const cardColor = node.data('cardColor');
                        if (cardColor) {
                            return getCardColorValue(cardColor, 'light');
                        }
                        return '#ffffff';
                    },
                    'color': '#333333',
                    'border-color': '#ddd'
                })
                .selector('node:selected').style({
                    'border-color': '#1565c0',
                    'border-width': 4,
                    'box-shadow': '0 0 20px rgba(21, 101, 192, 0.7)'
                })
                .selector('node.search-match').style({
                    'background-color': '#fff9c4',
                    'border-color': '#f57f17',
                    'border-width': 2,
                    'box-shadow': '0 0 10px rgba(245, 127, 23, 0.4)'
                })
                .selector('node.pinned').style({
                    'border-color': '#2e7d32',
                    'border-width': 4,
                    'box-shadow': '0 0 15px rgba(46, 125, 50, 0.6)'
                })
                .selector('node.temporal-marked').style({
                    'border-width': function(node) {
                        return node.data('temporalBorderWidth') || 6;
                    },
                    'border-color': function(node) {
                        return node.data('temporalBorderColor') || '#ff4500';
                    }
                })
                .update();
        }
    }
}

// Load saved theme on page load
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || localStorage.getItem('darkTheme'); // Backward compatibility
    const themeBtn = document.getElementById('themeBtn');

    // Handle backward compatibility
    let theme = 'light';
    if (savedTheme === 'dark' || savedTheme === 'true') {
        theme = 'dark';
    } else if (savedTheme === 'sepia') {
        theme = 'sepia';
    } else if (savedTheme === 'eink') {
        theme = 'eink';
    }

    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeBtn) {
            themeBtn.innerHTML = '📜 Sepia';
        }
        setTimeout(() => applyCardTheme('dark'), 100);
    } else if (theme === 'sepia') {
        document.body.classList.add('sepia-theme');
        if (themeBtn) {
            themeBtn.innerHTML = '📄 E-ink';
        }
        setTimeout(() => applyCardTheme('sepia'), 100);
    } else if (theme === 'eink') {
        document.body.classList.add('eink-theme');
        if (themeBtn) {
            themeBtn.innerHTML = '☀️ Ljust';
        }
        setTimeout(() => applyCardTheme('eink'), 100);
    } else {
        if (themeBtn) {
            themeBtn.innerHTML = '🌙 Mörkt';
        }
        setTimeout(() => applyCardTheme('light'), 100);
    }
}

function clearBoard() {
    if (confirm('Är du säker på att du vill rensa hela brädan och localStorage?\n\nDetta kommer att:\n• Ta bort alla kort från brädan\n• Rensa sparad data i localStorage\n• Återställa till tom bräda\n\nDenna åtgärd kan inte ångras!')) {
        // Clear memoization cache
        heightCache.clear();
        // Clear all nodes from the board
        cy.nodes().remove();
        
        // Clear localStorage
        localStorage.removeItem('spatial-notes-board');
        
        // Card IDs are now timestamp-based, no counter to reset
        
        // Show confirmation
        const searchInfo = document.getElementById('searchInfo');
        searchInfo.textContent = 'Bräda och localStorage rensade! ✅';
        searchInfo.classList.add('visible');
        setTimeout(() => {
            searchInfo.classList.remove('visible');
        }, 3000);
        
        console.log('Board and localStorage cleared completely');
    }
}

// Toggle metadata view for development and analysis
let showMetadata = false;
function toggleMetadataView() {
    showMetadata = !showMetadata;
    const btn = document.getElementById('metadataBtn');
    
    if (showMetadata) {
        btn.textContent = '🔍 Dölj Metadata';
        btn.style.backgroundColor = '#ff9800';
        
        // Show metadata in console and as overlays
        console.log('=== SPATIAL NOTES METADATA ===');
        cy.nodes().forEach(node => {
            const metadata = {
                id: node.id(),
                export_timestamp: node.data('export_timestamp'),
                export_session: node.data('export_session'),
                export_source: node.data('export_source'),
                source_file: node.data('source_file'),
                page_number: node.data('page_number'),
                matched_terms: node.data('matched_terms'),
                card_index: node.data('card_index')
            };
            console.log(`${node.id()}:`, metadata);
        });
        
        // Add metadata styling
        cy.style().selector('node').style({
            'border-color': function(node) {
                const session = node.data('export_session');
                if (!session) return '#ddd';
                // Color-code by export session
                const hash = session.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                }, 0);
                const color = `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
                return color;
            },
            'border-width': 3
        }).update();
        
        // Show stats
        const stats = analyzeMetadata();
        alert(`Metadata aktiverad!\n\n${stats}\n\nKolla konsolen för detaljer.`);
        
    } else {
        btn.textContent = '🔍 Metadata';
        btn.style.backgroundColor = '#007acc';
        
        // Reset styling
        cy.style().selector('node').style({
            'border-color': '#ddd',
            'border-width': 2
        }).update();
        
        console.log('Metadata view disabled');
    }
}

function analyzeMetadata() {
    const nodes = cy.nodes();
    const sessions = new Set();
    const sources = new Set();
    let pdfCards = 0;
    let manualCards = 0;
    
    nodes.forEach(node => {
        const session = node.data('export_session');
        const source = node.data('export_source');
        
        if (session) sessions.add(session);
        if (source) sources.add(source);
        
        if (source === 'pdf_extractor') pdfCards++;
        else manualCards++;
    });
    
    return `Totalt: ${nodes.length} kort\n` +
           `PDF-kort: ${pdfCards}\n` +
           `Manuella kort: ${manualCards}\n` +
           `Export-sessioner: ${sessions.size}\n` +
           `Källor: ${sources.size}`;
}

// ====================================================================================================
// 📱 SIMPLIFIED TOOLBAR FUNCTIONS
// ====================================================================================================

let isSimplifiedToolbar = localStorage.getItem('spatial-notes-simplified-toolbar') === 'true';

function toggleSimplifiedToolbar() {
    isSimplifiedToolbar = !isSimplifiedToolbar;
    localStorage.setItem('spatial-notes-simplified-toolbar', isSimplifiedToolbar);
    updateToolbarDisplay();

    // Update toggle button appearance
    const toggleBtn = document.getElementById('toolbarToggleBtn');
    if (toggleBtn) {
        if (isSimplifiedToolbar) {
            toggleBtn.innerHTML = '⚙️ Full Toolbar';
            toggleBtn.title = 'Visa full toolbar (Shift+T)';
        } else {
            toggleBtn.innerHTML = '☰ Toolbar';
            toggleBtn.title = 'Växla mellan förenklad och full toolbar (Shift+T)';
        }
    }

    const statusMessage = isSimplifiedToolbar ?
        'Förenklad toolbar aktiverad' :
        'Full toolbar aktiverad';

    // Show status message using existing searchInfo element
    const searchInfo = document.getElementById('searchInfo');
    if (searchInfo) {
        searchInfo.textContent = statusMessage;
        searchInfo.classList.add('visible');
        setTimeout(() => {
            searchInfo.classList.remove('visible');
        }, 3000);
    }
}

function updateToolbarDisplay() {
    const toolbar = document.querySelector('.toolbar');
    const allElements = toolbar.children;

    // Update toggle button appearance
    const toggleBtn = document.getElementById('toolbarToggleBtn');
    if (toggleBtn) {
        if (isSimplifiedToolbar) {
            toggleBtn.innerHTML = '⚙️ Full Toolbar';
            toggleBtn.title = 'Visa full toolbar (Shift+T)';
        } else {
            toggleBtn.innerHTML = '☰ Toolbar';
            toggleBtn.title = 'Växla mellan förenklad och full toolbar (Shift+T)';
        }
    }

    if (isSimplifiedToolbar) {
        // Hide all elements
        Array.from(allElements).forEach(el => {
            if (!el.classList.contains('simplified-keep')) {
                el.style.display = 'none';
            }
        });

        // Show simplified elements
        showSimplifiedToolbar();
    } else {
        // Show all elements
        Array.from(allElements).forEach(el => {
            el.style.display = '';
        });

        // Hide simplified elements
        hideSimplifiedToolbar();
    }
}

function showSimplifiedToolbar() {
    let simplifiedToolbar = document.getElementById('simplifiedToolbar');
    if (!simplifiedToolbar) {
        createSimplifiedToolbar();
    } else {
        simplifiedToolbar.style.display = 'flex';
    }
}

function hideSimplifiedToolbar() {
    const simplifiedToolbar = document.getElementById('simplifiedToolbar');
    if (simplifiedToolbar) {
        simplifiedToolbar.style.display = 'none';
    }
}

function createSimplifiedToolbar() {
    const toolbar = document.querySelector('.toolbar');
    
    const simplifiedDiv = document.createElement('div');
    simplifiedDiv.id = 'simplifiedToolbar';
    simplifiedDiv.className = 'simplified-keep';
    simplifiedDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
    `;
    
    // Multi-import button
    const importBtn = document.createElement('button');
    importBtn.innerHTML = '📋';
    importBtn.className = 'toolbar-btn';
    importBtn.title = 'Multi-import (M)';
    importBtn.style.cssText = 'padding: 8px 12px;';
    importBtn.onclick = showMultiCardPasteDialog;

    // Drive images picker button
    const driveImagesBtn = document.createElement('button');
    driveImagesBtn.innerHTML = '📁';
    driveImagesBtn.className = 'toolbar-btn';
    driveImagesBtn.title = 'Välj flera bilder från Drive';
    driveImagesBtn.style.cssText = 'padding: 8px 12px;';
    driveImagesBtn.onclick = openDriveImagePicker;

    // Smart search button
    const searchBtn = document.createElement('button');
    searchBtn.innerHTML = '🔍';
    searchBtn.className = 'toolbar-btn';
    searchBtn.title = 'Smart sökning med automatisk sortering';
    searchBtn.style.cssText = 'padding: 8px 12px;';
    searchBtn.onclick = showSmartSearchDialog;
    
    // Sort button
    const sortBtn = document.createElement('button');
    sortBtn.innerHTML = '📊';
    sortBtn.className = 'toolbar-btn';
    sortBtn.title = 'Sortera kort';
    sortBtn.style.cssText = 'padding: 8px 12px;';
    sortBtn.onclick = (event) => showSortMenu(event);

    // Toggle to full toolbar button
    const expandBtn = document.createElement('button');
    expandBtn.innerHTML = '⚙️ Meny';
    expandBtn.className = 'toolbar-btn';
    expandBtn.title = 'Visa hela menyn (Shift+T)';
    expandBtn.style.cssText = 'padding: 8px 12px; margin-left: auto;';  // Push to right
    expandBtn.onclick = toggleSimplifiedToolbar;

    simplifiedDiv.appendChild(importBtn);
    simplifiedDiv.appendChild(driveImagesBtn);
    simplifiedDiv.appendChild(searchBtn);
    simplifiedDiv.appendChild(sortBtn);
    simplifiedDiv.appendChild(expandBtn);

    toolbar.appendChild(simplifiedDiv);
}

// Open Google Drive Picker to select multiple images
async function openDriveImagePicker() {
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

function showSmartSearchDialog() {
    // Create overlay for search input
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 10000;
        display: flex; justify-content: center; align-items: center;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white; padding: 20px; border-radius: 10px;
        max-width: 400px; width: 90%; max-height: 80vh;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        box-sizing: border-box;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin-top: 0; color: #333; font-size: 18px;">🔍 Smart sökning</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Sök efter:</label>
            <input type="text" id="smartSearchInput" placeholder='Exempel: "todo" OR "viktigt"'
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;
                       box-sizing: border-box; font-size: 14px;">
        </div>
        <div style="margin-bottom: 20px; font-size: 12px; color: #666;">
            <strong>Automatisk sortering:</strong><br>
            1. Vecko-todos (äldsta först)<br>
            2. Färgordning: Röd → Orange → Vit → Gul → Lila → Blå → Grön → Grå
        </div>
        <div style="text-align: right;">
            <button id="cancelSmartSearch" style="background: #666; color: white; border: none; 
                                         padding: 10px 20px; border-radius: 4px; margin-right: 10px;
                                         cursor: pointer; font-size: 14px;">Avbryt</button>
            <button id="executeSmartSearch" style="background: #007acc; color: white; border: none; 
                                        padding: 10px 20px; border-radius: 4px; cursor: pointer;
                                        font-size: 14px;">🔍 Sök & Sortera</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus on input
    const searchInput = document.getElementById('smartSearchInput');
    searchInput.focus();
    
    // Handle search
    document.getElementById('executeSmartSearch').onclick = function() {
        const query = searchInput.value.trim();
        if (query) {
            // Perform the search with smart sorting
            performSearch(query);
            
            // Show success message
            const searchInfo = document.getElementById('searchInfo');
            if (searchInfo) {
                searchInfo.textContent += ' (smart sorterat)';
            }
        }
        document.body.removeChild(overlay);
    };
    
    // Handle cancel
    document.getElementById('cancelSmartSearch').onclick = function() {
        document.body.removeChild(overlay);
    };
    
    // Handle Enter key
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('executeSmartSearch').click();
        } else if (e.key === 'Escape') {
            document.getElementById('cancelSmartSearch').click();
        }
    });
    
    // Close on overlay click
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}


// ====================================================================================================
// 📅 WEEK NUMBERING FUNCTIONS
// ====================================================================================================

function getISOWeek(date) {
    const tempDate = new Date(date.getTime());
    const dayNum = (date.getDay() + 6) % 7; // Make Monday = 0
    tempDate.setDate(tempDate.getDate() - dayNum + 3); // Thursday of this week
    const firstThursday = tempDate.valueOf();
    tempDate.setMonth(0, 1); // January 1
    if (tempDate.getDay() !== 4) {
        tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - tempDate) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
}

function getCurrentWeekData() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const shortYear = currentYear.toString().slice(-2); // "25" for 2025
    const currentWeek = getISOWeek(now);
    
    // Calculate next weeks, handle year transition
    const nextWeek = currentWeek + 1;
    const weekAfter = currentWeek + 2;
    
    // Handle year transition (approximately - ISO weeks can be tricky at year boundaries)
    let nextWeekYear = shortYear;
    let weekAfterYear = shortYear;
    
    if (nextWeek > 52) {
        nextWeekYear = (parseInt(shortYear) + 1).toString().padStart(2, '0');
        if (weekAfter > 52) {
            weekAfterYear = nextWeekYear;
        }
    }
    
    return {
        thisWeek: `${shortYear}v${currentWeek}`,
        nextWeek: nextWeek > 52 ? `${nextWeekYear}v${nextWeek - 52}` : `${shortYear}v${nextWeek}`,
        weekAfter: weekAfter > 52 ? `${weekAfterYear}v${weekAfter - 52}` : `${shortYear}v${weekAfter}`
    };
}

// ====================================================================================================

// Add new card
function addNewCard() {
    // Clear any existing edit dialogs first
    clearAllEditDialogs();
    
    // Create overlay for multiline text input
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 10000;
        display: flex; justify-content: center; align-items: center;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white; padding: 20px; border-radius: 10px;
        max-width: 500px; width: 90%; max-height: 80vh;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        box-sizing: border-box;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin-top: 0; color: #333; font-size: 18px;">Nytt kort</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Text:</label>
            <textarea id="newCardText" placeholder="Skriv text här... (radbrytningar bevaras)"
                style="width: 100%; height: 200px; font-family: inherit; font-size: 14px; 
                       border: 1px solid #ccc; border-radius: 4px; padding: 8px;
                       box-sizing: border-box; resize: vertical;"></textarea>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555;">Färg (valfritt):</label>
            <div id="newCardColorPicker" style="display: flex; gap: 8px; align-items: center;">
                <div class="color-dot" data-color="" style="width: 24px; height: 24px; border-radius: 50%; 
                     background: #f5f5f5; border: 2px solid #ddd; cursor: pointer; position: relative;"
                     title="Ingen färg">
                    <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                          font-size: 16px; color: #666;">⭘</span>
                </div>
                <div class="color-dot" data-color="1" style="width: 24px; height: 24px; border-radius: 50%; 
                     background: #d4f2d4; border: 2px solid transparent; cursor: pointer;" title="Grön"></div>
                <div class="color-dot" data-color="2" style="width: 24px; height: 24px; border-radius: 50%; 
                     background: #ffe4b3; border: 2px solid transparent; cursor: pointer;" title="Orange"></div>
                <div class="color-dot" data-color="3" style="width: 24px; height: 24px; border-radius: 50%; 
                     background: #ffc1cc; border: 2px solid transparent; cursor: pointer;" title="Röd"></div>
                <div class="color-dot" data-color="4" style="width: 24px; height: 24px; border-radius: 50%; 
                     background: #fff7b3; border: 2px solid transparent; cursor: pointer;" title="Gul"></div>
                <div class="color-dot" data-color="5" style="width: 24px; height: 24px; border-radius: 50%; 
                     background: #f3e5f5; border: 2px solid transparent; cursor: pointer;" title="Lila"></div>
                <div class="color-dot" data-color="6" style="width: 24px; height: 24px; border-radius: 50%; 
                     background: #c7e7ff; border: 2px solid transparent; cursor: pointer;" title="Blå"></div>
                <div class="color-dot" data-color="7" style="width: 24px; height: 24px; border-radius: 50%; 
                     background: #e0e0e0; border: 2px solid transparent; cursor: pointer;" title="Grå"></div>
                <div class="color-dot" data-color="8" style="width: 24px; height: 24px; border-radius: 50%; 
                     background: #ffffff; border: 2px solid transparent; cursor: pointer;" title="Vit"></div>
            </div>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Tags (valfritt):</label>
            <input type="text" id="newCardTags" placeholder="tech, psychology, design..."
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;
                       box-sizing: border-box; font-size: 14px;">
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555;">📅 Snabbveckor:</label>
            <div id="weekButtons" style="display: flex; gap: 8px; flex-wrap: wrap;">
                <!-- Week buttons will be populated by JavaScript -->
            </div>
        </div>
        <div style="text-align: right;">
            <button id="cancelCard" style="background: #666; color: white; border: none; 
                                         padding: 10px 20px; border-radius: 4px; margin-right: 10px;
                                         cursor: pointer; font-size: 14px;">Avbryt</button>
            <button id="saveCard" style="background: #007acc; color: white; border: none; 
                                        padding: 10px 20px; border-radius: 4px; cursor: pointer;
                                        font-size: 14px;">Spara kort</button>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
            <strong>Tips:</strong> Enter = ny rad, Ctrl+Enter = spara, Esc = avbryt
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus on textarea
    const textarea = document.getElementById('newCardText');
    textarea.focus();
    
    // Handle color picker selection
    let selectedColor = '';
    const colorDots = document.querySelectorAll('#newCardColorPicker .color-dot');
    colorDots.forEach(dot => {
        dot.addEventListener('click', function() {
            // Remove selection from all dots
            colorDots.forEach(d => d.style.border = d.dataset.color ? '2px solid transparent' : '2px solid #ddd');
            
            // Select this dot
            this.style.border = '2px solid #007acc';
            selectedColor = this.dataset.color;
        });
    });
    
    // Populate week buttons
    const weekData = getCurrentWeekData();
    const weekButtonsContainer = document.getElementById('weekButtons');
    const weekButtons = [
        { text: weekData.thisWeek, label: 'denna vecka', title: 'Denna vecka' },
        { text: weekData.nextWeek, label: 'nästa vecka', title: 'Nästa vecka' },
        { text: weekData.weekAfter, label: 'nästnästa vecka', title: 'Veckan efter nästa' }
    ];
    
    weekButtons.forEach(btn => {
        const weekBtn = document.createElement('button');
        weekBtn.type = 'button';
        weekBtn.innerHTML = `<strong>${btn.text}</strong><br><small>${btn.label}</small>`;
        weekBtn.title = btn.title;
        weekBtn.style.cssText = `
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 12px;
            line-height: 1.2;
            transition: all 0.2s ease;
            text-align: center;
            min-width: 70px;
        `;
        
        weekBtn.addEventListener('mouseenter', function() {
            this.style.background = '#e9ecef';
            this.style.borderColor = '#007acc';
        });
        
        weekBtn.addEventListener('mouseleave', function() {
            this.style.background = '#f8f9fa';
            this.style.borderColor = '#dee2e6';
        });
        
        weekBtn.addEventListener('click', function() {
            const tagsInput = document.getElementById('newCardTags');
            const currentTags = tagsInput.value.trim();
            const weekTag = btn.text;
            
            if (currentTags) {
                // Add to existing tags
                if (!currentTags.includes(weekTag)) {
                    tagsInput.value = currentTags + ', ' + weekTag;
                }
            } else {
                // First tag
                tagsInput.value = weekTag;
            }
            
            // Visual feedback
            this.style.background = '#d4edda';
            this.style.borderColor = '#28a745';
            setTimeout(() => {
                this.style.background = '#f8f9fa';
                this.style.borderColor = '#dee2e6';
            }, 500);
        });
        
        weekButtonsContainer.appendChild(weekBtn);
    });
    
    // Handle save
    document.getElementById('saveCard').onclick = function() {
        const text = textarea.value.trim();
        if (!text) {
            alert('Text krävs för att skapa kort');
            return;
        }
        
        const tagsInput = document.getElementById('newCardTags').value || '';
        const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        const newId = generateCardId();
        
        // Position card based on device type
        let x, y;
        const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
        
        if (isMobile) {
            // Mobile: center of screen
            const extent = cy.extent();
            x = (extent.x1 + extent.x2) / 2;
            y = (extent.y1 + extent.y2) / 2;
        } else {
            // Desktop: at mouse position (or fallback to center)
            const arrangePos = getArrangementPosition();
            x = arrangePos.x;
            y = arrangePos.y;
        }
        
        const newNode = cy.add({
            data: {
                id: newId,
                title: null, // Explicitly null to avoid any title processing
                text: text, // Keep line breaks as-is
                tags: tags,
                searchMatch: false,
                isManualCard: true // Flag to identify manually created cards
            },
            position: { x: x, y: y }
        });
        
        // Apply selected color if any
        if (selectedColor) {
            newNode.data('cardColor', `card-color-${selectedColor}`);
        }
        
        newNode.grabify();
        
        // Force refresh of node styling
        cy.style().update();
        
        document.body.removeChild(overlay);
    };
    
    // Handle cancel
    document.getElementById('cancelCard').onclick = function() {
        document.body.removeChild(overlay);
    };
    
    // Handle Enter to save (Ctrl+Enter or Shift+Enter for new lines)
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            document.getElementById('saveCard').click();
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            document.body.removeChild(overlay);
        }
        // Regular Enter and Shift+Enter allow normal newline behavior
    });
}

// Zoom out to center (mobile function)
function zoomOutToCenter() {
    cy.fit(null, 50); // Fit all nodes with 50px padding
    cy.center(); // Center the view
}

// Helper function to create node from card data (handles both regular and image nodes)
function createNodeFromCardData(cardData, newId, position) {
    const nodeData = {
        id: newId,
        title: cardData.title,
        text: cardData.text,
        tags: cardData.tags,
        hidden_tags: cardData.hidden_tags || [],
        searchMatch: false,
        // Copy metadata
        export_timestamp: cardData.export_timestamp,
        export_session: cardData.export_session,
        export_source: cardData.export_source,
        source_file: cardData.source_file,
        page_number: cardData.page_number,
        matched_terms: cardData.matched_terms,
        card_index: cardData.card_index,
        // Copy metadata
        copyOf: cardData.copyOf,
        isCopy: cardData.isCopy,
        copyTimestamp: cardData.copyTimestamp,
        // IMAGE DATA - Essential for image nodes
        type: cardData.type,
        imageData: cardData.imageData,
        imageWidth: cardData.imageWidth,        // Store original dimensions
        imageHeight: cardData.imageHeight,      // Store original dimensions
        calculatedHeight: cardData.calculatedHeight, // Store pre-calculated height
        annotation: cardData.annotation,
        searchableText: cardData.searchableText,
        originalFileName: cardData.originalFileName
    };

    const newNode = cy.add({
        data: nodeData,
        position: position
    });

    // Apply image-specific styling if it's an image node
    if (cardData.type === 'image' && cardData.imageData) {
        newNode.style({
            'background-image': cardData.imageData,
            'background-fit': 'cover',
            'width': '300px'
        });
        console.log(`📷 Created image copy: ${cardData.originalFileName}`);
    }

    // Apply auto-gray coloring for #done tags
    applyAutoDoneColoring(newNode);

    return newNode;
}

// Copy selected cards
function copySelectedCards() {
    const selectedNodes = cy.nodes(':selected');
    if (selectedNodes.length === 0) {
        alert('Inga kort markerade för kopiering');
        return;
    }
    
    // Save state for undo before copying (copies will be created when arranged)
    saveState();
    
    // Generate timestamp for copy tagging
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[-T:]/g, '').slice(0, 13); // YYYYMMDD_HHmm format
    
    copiedCards = [];
    
    selectedNodes.forEach((node, index) => {
        const originalData = {
            title: node.data('title') || '',
            text: node.data('text') || '',
            tags: [...(node.data('tags') || [])], // Clone array
            hidden_tags: [...(node.data('hidden_tags') || [])], // Clone hidden tags array
            // Copy all metadata too
            export_timestamp: node.data('export_timestamp'),
            export_session: node.data('export_session'),
            export_source: node.data('export_source'),
            source_file: node.data('source_file'),
            page_number: node.data('page_number'),
            matched_terms: node.data('matched_terms'),
            card_index: node.data('card_index'),
            // IMAGE NODE DATA - Essential for copying images
            type: node.data('type'), // 'image' for image nodes
            imageData: node.data('imageData'), // Base64 image data
            annotation: node.data('annotation'), // Image annotation text
            searchableText: node.data('searchableText'), // Searchable text
            originalFileName: node.data('originalFileName') // Original filename
        };
        
        // Add copy metadata to hidden tags (searchable but not visible)
        const copyTag = `copy_${timestamp}_${index + 1}`;
        originalData.hidden_tags.push(copyTag);
        originalData.copyOf = node.id();
        originalData.isCopy = true;
        originalData.copyTimestamp = now.toISOString();
        
        copiedCards.push(originalData);
    });
    
    console.log(`Copied ${copiedCards.length} cards with timestamp ${timestamp}`);
}

// Arrange copied cards in row at mouse position
function arrangeCopiedCardsInRow() {
    if (copiedCards.length === 0) return;
    
    const arrangePos = getArrangementPosition();
    const centerX = arrangePos.x;
    const centerY = arrangePos.y;
    
    // Create the copied cards with unique IDs
    const now = new Date();
    const baseId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newNodes = [];
    copiedCards.forEach((cardData, index) => {
        const newId = `${baseId}-copy-${index + 1}`;
        
        const newNode = createNodeFromCardData(cardData, newId, { x: centerX, y: centerY });
        
        newNode.grabify();
        newNodes.push(newNode);
    });
    
    // Now arrange them in a row (H-logic: 20% spacing = 60px)
    const spacing = 60; // 20% spacing as per spec
    let totalRequiredWidth = 0;
    newNodes.forEach((node, index) => {
        const cardWidth = getCardWidth(node);
        totalRequiredWidth += cardWidth;
        if (index < newNodes.length - 1) {
            totalRequiredWidth += spacing;
        }
    });
    
    let currentX = centerX - (totalRequiredWidth / 2);
    newNodes.forEach(node => {
        const cardWidth = getCardWidth(node);
        const cardHeight = getMeasuredTextHeight(node);
        
        // Position with top-aligned positioning (same as original)
        const cardCenterX = currentX + (cardWidth / 2);
        const cardCenterY = centerY + (cardHeight / 2); // Top-align: center Y based on card's height
        
        node.position({ x: cardCenterX, y: cardCenterY });
        currentX += cardWidth + spacing;
    });
    
    // Clear copied cards and select the new ones
    copiedCards = [];
    cy.nodes().unselect();
    newNodes.forEach(node => node.select());
    
    console.log(`Created and arranged ${newNodes.length} copied cards in row`);
}

// Arrange copied cards in column at mouse position
function arrangeCopiedCardsInColumn() {
    if (copiedCards.length === 0) return;
    
    const arrangePos = getArrangementPosition();
    const centerX = arrangePos.x;
    const centerY = arrangePos.y;
    
    // Create the copied cards with unique IDs
    const now = new Date();
    const baseId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newNodes = [];
    copiedCards.forEach((cardData, index) => {
        const newId = `${baseId}-copy-${index + 1}`;
        
        const newNode = createNodeFromCardData(cardData, newId, { x: centerX, y: centerY });
        
        newNode.grabify();
        newNodes.push(newNode);
    });
    
    // Now arrange them in a column (V-logic: 20% spacing = 60px)
    const spacing = 60; // 20% spacing as per spec
    let totalRequiredHeight = 0;
    newNodes.forEach((node, index) => {
        const cardHeight = getMeasuredTextHeight(node);
        totalRequiredHeight += cardHeight;
        if (index < newNodes.length - 1) {
            totalRequiredHeight += spacing;
        }
    });
    
    let currentY = centerY - (totalRequiredHeight / 2);
    newNodes.forEach(node => {
        const cardHeight = getMeasuredTextHeight(node);
        const cardCenterY = currentY + (cardHeight / 2);
        node.position({ x: centerX, y: cardCenterY });
        currentY += cardHeight + spacing;
    });
    
    // Clear copied cards and select the new ones
    copiedCards = [];
    cy.nodes().unselect();
    newNodes.forEach(node => node.select());
    
    console.log(`Created and arranged ${newNodes.length} copied cards in column`);
}

// Arrange copied cards in grid at mouse position
function arrangeCopiedCardsInGrid() {
    if (copiedCards.length === 0) return;
    
    const arrangePos = getArrangementPosition();
    const screenCenterX = arrangePos.x;
    const screenCenterY = arrangePos.y;
    
    // Calculate grid dimensions
    const nodeCount = copiedCards.length;
    const cols = Math.ceil(Math.sqrt(nodeCount));
    const rows = Math.ceil(nodeCount / cols);
    
    // Create the copied cards with unique IDs
    const now = new Date();
    const baseId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newNodes = [];
    copiedCards.forEach((cardData, index) => {
        const newId = `${baseId}-copy-${index + 1}`;
        
        // Use createNodeFromCardData to preserve ALL data including images
        const newNode = createNodeFromCardData(cardData, newId, { x: screenCenterX, y: screenCenterY });
        
        newNode.grabify();
        newNodes.push(newNode);
    });
    
    // Arrange in grid
    const cardWidth = 300;
    const cardHeight = 200;
    const horizontalSpacing = 350;
    const verticalSpacing = 250;
    
    const gridWidth = (cols - 1) * horizontalSpacing;
    const gridHeight = (rows - 1) * verticalSpacing;
    
    const startX = screenCenterX - (gridWidth / 2);
    const startY = screenCenterY - (gridHeight / 2);
    
    newNodes.forEach((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        const x = startX + (col * horizontalSpacing);
        const y = startY + (row * verticalSpacing);
        
        node.position({ x: x, y: y });
    });
    
    // Clear copied cards and select the new ones
    copiedCards = [];
    cy.nodes().unselect();
    newNodes.forEach(node => node.select());
    
    console.log(`Created and arranged ${newNodes.length} copied cards in ${rows}×${cols} grid`);
}

// G+V: Copy cards in vertical columns layout
function arrangeCopiedCardsGridVerticalColumns() {
    if (copiedCards.length === 0) return;
    
    const arrangePos = getArrangementPosition();
    const screenCenterX = arrangePos.x;
    const screenCenterY = arrangePos.y;
    
    // Create the copied cards with unique IDs
    const now = new Date();
    const baseId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newNodes = [];
    copiedCards.forEach((cardData, index) => {
        const newId = `${baseId}-copy-${index + 1}`;
        
        // Use createNodeFromCardData to preserve ALL data including images
        const newNode = createNodeFromCardData(cardData, newId, { x: screenCenterX, y: screenCenterY });
        
        newNode.grabify();
        newNodes.push(newNode);
    });
    
    // G+V: Column-focused arrangement with max gap between bottom-edge to top-edge (same logic as original)
    const nodeCount = newNodes.length;
    const maxCols = 6; // Max 6 columns
    const cols = Math.min(maxCols, Math.ceil(Math.sqrt(nodeCount)));
    const cardsPerCol = Math.ceil(nodeCount / cols);
    
    const horizontalSpacing = 350; // Gap between columns
    const maxVerticalGap = 80; // Max gap from bottom-edge of upper card to top-edge of lower card
    
    const gridWidth = (cols - 1) * horizontalSpacing;
    const startX = screenCenterX - gridWidth / 2;
    
    // Top-aligned columns - all start from same Y position (like G+H but vertical)
    const topLineY = screenCenterY; // All columns start from same top line
    
    // Arrange column by column (instead of row by row)
    for (let col = 0; col < cols; col++) {
        const colStartIndex = col * cardsPerCol;
        const colEndIndex = Math.min(colStartIndex + cardsPerCol, nodeCount);
        const cardsInThisCol = colEndIndex - colStartIndex;
        
        if (cardsInThisCol === 0) continue;
        
        const colX = startX + col * horizontalSpacing;
        
        // Start each column from the same top line
        let currentTopY = topLineY;
        
        // Place cards in this column with gap between bottom and top edges
        for (let cardIndex = 0; cardIndex < cardsInThisCol; cardIndex++) {
            const nodeIndex = colStartIndex + cardIndex;
            const node = newNodes[nodeIndex];
            const cardHeight = getMeasuredTextHeight(node);
            
            // Card center is at currentTopY + half height
            const cardCenterY = currentTopY + (cardHeight / 2);
            
            node.position({ x: colX, y: cardCenterY });
            
            // Move to next position: current card bottom + gap
            currentTopY += cardHeight + maxVerticalGap;
        }
    }
    
    // Clear copied cards and select the new ones
    copiedCards = [];
    cy.nodes().unselect();
    newNodes.forEach(node => node.select());
    
    console.log(`G+V: Created ${newNodes.length} copied cards in ${cols} top-aligned columns, 80px vertikalt, 350px horisontellt`);
}

// G+H: Copy cards in horizontal packed layout
function arrangeCopiedCardsGridHorizontalPacked() {
    if (copiedCards.length === 0) return;
    
    const arrangePos = getArrangementPosition();
    const screenCenterX = arrangePos.x;
    const screenCenterY = arrangePos.y;
    
    // Create the copied cards with unique IDs
    const now = new Date();
    const baseId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newNodes = [];
    copiedCards.forEach((cardData, index) => {
        const newId = `${baseId}-copy-${index + 1}`;
        
        // Use createNodeFromCardData to preserve ALL data including images
        const newNode = createNodeFromCardData(cardData, newId, { x: screenCenterX, y: screenCenterY });
        
        newNode.grabify();
        newNodes.push(newNode);
    });
    
    // Arrange in horizontal packed rows (exact same logic as original)
    const nodeCount = newNodes.length;
    const maxCols = 6;
    const cols = Math.min(maxCols, Math.ceil(Math.sqrt(nodeCount)));
    const rows = Math.ceil(nodeCount / cols);
    
    const horizontalSpacing = 360; // 60px gap between cards (360 - 300 = 60)
    const rowPadding = 95; // Adjusted to get actual 60px visual spacing
    
    const gridWidth = (cols - 1) * horizontalSpacing;
    const startX = screenCenterX - gridWidth / 2;
    
    // First pass: calculate the height of each row
    const rowHeights = [];
    for (let row = 0; row < rows; row++) {
        let maxRowHeight = 0;
        for (let col = 0; col < cols; col++) {
            const nodeIndex = row * cols + col;
            if (nodeIndex < newNodes.length) {
                const node = newNodes[nodeIndex];
                const cardHeight = getMeasuredTextHeight(node);
                maxRowHeight = Math.max(maxRowHeight, cardHeight);
            }
        }
        rowHeights.push(maxRowHeight);
    }
    
    // Calculate total height and start position
    const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0) + (rows - 1) * rowPadding;
    let currentY = screenCenterY; // Top of grid at mouse cursor (same as move G+H)
    
    // Second pass: position cards row by row with tight packing
    for (let row = 0; row < rows; row++) {
        const rowHeight = rowHeights[row];
        
        for (let col = 0; col < cols; col++) {
            const nodeIndex = row * cols + col;
            if (nodeIndex < newNodes.length) {
                const node = newNodes[nodeIndex];
                const newX = startX + col * horizontalSpacing;
                
                // Position card at top of its row space
                const cardHeight = getMeasuredTextHeight(node);
                const cardCenterY = currentY + (cardHeight / 2); // Top-aligned within row
                
                node.position({ x: newX, y: cardCenterY });
            }
        }
        
        currentY += rowHeight + rowPadding; // Move to next row
    }
    
    // Clear copied cards and select the new ones
    copiedCards = [];
    cy.nodes().unselect();
    newNodes.forEach(node => node.select());
    
    console.log(`G+H: Created ${newNodes.length} copied cards in ${rows} packed rows`);
}

// Form dialog for structured card creation
function showFormDialog(x, y) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 2000;
        display: flex; align-items: center; justify-content: center;
    `;
    
    // Create form dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white; padding: 20px; border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333;">Skapa nytt kort</h3>
        <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Titel (valfritt):</label>
            <input type="text" id="formTitle" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Text:</label>
            <textarea id="formText" rows="4" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tags (kommaseparerade):</label>
            <input type="text" id="formTags" placeholder="tech, ai, design" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Färg (valfritt):</label>
            <div id="formColorPicker" style="display: flex; gap: 8px; align-items: center;">
                <div class="form-color-dot" data-color="" style="width: 24px; height: 24px; border: 2px solid #333; border-radius: 50%; cursor: pointer; background: white; position: relative;">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 14px; color: #999;">×</div>
                </div>
                <div class="form-color-dot card-color-1" data-color="card-color-1" style="width: 24px; height: 24px; border: 2px solid #333; border-radius: 50%; cursor: pointer;"></div>
                <div class="form-color-dot card-color-2" data-color="card-color-2" style="width: 24px; height: 24px; border: 2px solid #333; border-radius: 50%; cursor: pointer;"></div>
                <div class="form-color-dot card-color-3" data-color="card-color-3" style="width: 24px; height: 24px; border: 2px solid #333; border-radius: 50%; cursor: pointer;"></div>
                <div class="form-color-dot card-color-4" data-color="card-color-4" style="width: 24px; height: 24px; border: 2px solid #333; border-radius: 50%; cursor: pointer;"></div>
                <div class="form-color-dot card-color-5" data-color="card-color-5" style="width: 24px; height: 24px; border: 2px solid #333; border-radius: 50%; cursor: pointer;"></div>
            </div>
        </div>
        <div style="text-align: right;">
            <button id="formCancel" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Avbryt</button>
            <button id="formSave" style="padding: 8px 16px; border: none; background: #007AFF; color: white; border-radius: 4px; cursor: pointer;">Skapa kort</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus first field
    document.getElementById('formTitle').focus();
    
    // Event handlers
    document.getElementById('formCancel').onclick = () => {
        document.body.removeChild(overlay);
    };
    
    document.getElementById('formSave').onclick = () => {
        createCardFromForm(x, y, selectedColor);
        document.body.removeChild(overlay);
    };
    
    // Color picker event handlers
    let selectedColor = '';
    document.querySelectorAll('.form-color-dot').forEach(dot => {
        dot.onclick = () => {
            // Remove selection from all dots
            document.querySelectorAll('.form-color-dot').forEach(d => {
                d.style.boxShadow = '';
                d.style.transform = '';
            });
            // Select this dot
            dot.style.boxShadow = '0 0 0 3px #007AFF';
            dot.style.transform = 'scale(1.1)';
            selectedColor = dot.dataset.color;
        };
    });
    
    // Store selected color on overlay for access in createCardFromForm
    overlay.selectedColor = () => selectedColor;
    
    // ESC to cancel - must capture on document for focus issues
    function handleEscape(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        }
    }
    document.addEventListener('keydown', handleEscape);
}

// Create card from form data
function createCardFromForm(x, y, selectedColor = '') {
    const title = document.getElementById('formTitle').value.trim();
    const text = document.getElementById('formText').value.trim();
    const tagsInput = document.getElementById('formTags').value.trim();
    
    if (!text) return; // Need at least some text
    
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const newId = generateCardId();
    const nodeData = {
        id: newId,
        title: title,
        text: text,
        tags: tags,
        searchMatch: false
    };
    
    // Add color if selected
    if (selectedColor) {
        nodeData.cardColor = selectedColor;
    }
    
    const newNode = cy.add({
        data: nodeData,
        position: { x: x, y: y }
    });
    
    // Apply color styling if selected
    if (selectedColor) {
        newNode.style('background-color', getCardColorValue(selectedColor, getCurrentTheme()));
    }
    
    newNode.grabify();
    console.log(`Created card via form: ${title || 'Untitled'} ${selectedColor ? 'with color ' + selectedColor : ''}`);
    
    // Apply temporal markings to newly created card
    setTimeout(() => {
        applyTemporalMarkings();
    }, 100);
}

// Code syntax dialog for quick card creation
function showCodeDialog(x, y) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 2000;
        display: flex; align-items: center; justify-content: center;
    `;
    
    // Create code dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white; padding: 20px; border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 500px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #333;">Snabbformat</h3>
        <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">
            #Titel<br>Innehåll här (Shift+Enter för ny rad)<br>#tag1 #tag2
            <br><strong>Enter</strong>=Spara, <strong>Esc</strong>=Avbryt
        </p>
        <textarea id="codeInput" placeholder="#Titel här
Skriv ditt innehåll här...
#tag1 #tag2" 
            style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; 
                   font-family: 'SF Mono', Consolas, monospace; font-size: 14px; resize: vertical;"></textarea>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const textarea = document.getElementById('codeInput');
    textarea.focus();
    
    // Keyboard shortcuts
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            createCardFromCode(x, y, textarea.value);
            document.body.removeChild(overlay);
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            document.body.removeChild(overlay);
        }
        // Shift+Enter allows normal newline (no preventDefault)
    });
    
    // Click outside to cancel
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

// Parse code syntax and create card
function createCardFromCode(x, y, input) {
    if (!input.trim()) return;
    
    const lines = input.trim().split('\n');
    let title = '';
    let text = '';
    let tags = [];
    
    let inContent = false;
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        if (line.startsWith('#') && !inContent) {
            // First # line is title, rest are tags
            if (!title) {
                title = line.substring(1).trim();
                inContent = true;
            } else {
                // Tags line - extract all #tag words
                const tagMatches = line.match(/#\w+/g);
                if (tagMatches) {
                    tags.push(...tagMatches.map(t => t.substring(1)));
                }
            }
        } else if (line.startsWith('#') && inContent) {
            // Tags in content
            const tagMatches = line.match(/#\w+/g);
            if (tagMatches) {
                tags.push(...tagMatches.map(t => t.substring(1)));
            }
        } else {
            // Content line
            if (text) text += '\n';
            text += line;
            inContent = true;
        }
    }
    
    // If no title found, use first line of text
    if (!title && text) {
        const firstLine = text.split('\n')[0];
        if (firstLine.length < 50) {
            title = firstLine;
            text = text.substring(firstLine.length).trim();
        }
    }
    
    if (!text && !title) return; // Need something
    
    const newId = generateCardId();
    const newNode = cy.add({
        data: {
            id: newId,
            title: title,
            text: text || title, // Use title as text if no content
            tags: [...new Set(tags)], // Remove duplicates
            searchMatch: false
        },
        position: { x: x, y: y }
    });
    
    newNode.grabify();
    console.log(`Created card via code syntax: ${title || 'Untitled'}`);
    
    // Apply temporal markings to newly created card
    setTimeout(() => {
        applyTemporalMarkings();
    }, 100);
}

// G+T: Copy cards in top-aligned grid
function arrangeCopiedCardsGridTopAligned() {
    if (copiedCards.length === 0) return;
    
    const arrangePos = getArrangementPosition();
    const screenCenterX = arrangePos.x;
    const screenCenterY = arrangePos.y;
    
    // Create the copied cards with unique IDs
    const now = new Date();
    const baseId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newNodes = [];
    copiedCards.forEach((cardData, index) => {
        const newId = `${baseId}-copy-${index + 1}`;
        
        // Use createNodeFromCardData to preserve ALL data including images
        const newNode = createNodeFromCardData(cardData, newId, { x: screenCenterX, y: screenCenterY });
        
        newNode.grabify();
        newNodes.push(newNode);
    });
    
    // Arrange in G+T layout (max 6 cols, 120px overlap, column-major ordering)
    const nodeCount = newNodes.length;
    const maxCols = 6; // Max 6 cards wide (same as original)
    const cols = Math.min(maxCols, nodeCount);
    const rows = Math.ceil(nodeCount / cols);
    
    const cardWidth = 300;
    const horizontalSpacing = cardWidth * 0.05; // 5% of card width = 15px
    const overlapSpacing = 120; // 120px between card tops (3x more to show titles)
    
    // Calculate grid size
    const gridWidth = (cols - 1) * (cardWidth + horizontalSpacing);
    const startX = screenCenterX - gridWidth / 2;
    
    // For top row alignment
    const topRowY = screenCenterY - 100; // Start a bit above center
    
    // Position cards column by column for proper overlapping (same as original)
    for (let col = 0; col < cols; col++) {
        const colX = startX + col * (cardWidth + horizontalSpacing);
        let currentY = topRowY;
        
        // Go through each row in this column
        for (let row = 0; row < rows; row++) {
            const nodeIndex = row * cols + col; // Same ordering as original G+T
            if (nodeIndex < newNodes.length) {
                const node = newNodes[nodeIndex];
                const cardHeight = getMeasuredTextHeight(node);
                const cardCenterY = currentY + (cardHeight / 2);
                
                node.position({ x: colX, y: cardCenterY });
                currentY += overlapSpacing; // Move down for next card in this column
            }
        }
    }
    
    // Clear copied cards and select the new ones
    copiedCards = [];
    cy.nodes().unselect();
    newNodes.forEach(node => node.select());
    
    console.log(`G+T: Created ${newNodes.length} copied cards in top-aligned ${rows}×${cols} grid`);
}

// Arrange copied cards in cluster at mouse position
function arrangeCopiedCardsInCluster() {
    if (copiedCards.length === 0) return;
    
    const arrangePos = getArrangementPosition();
    const centerX = arrangePos.x;
    const centerY = arrangePos.y;
    
    // Create the copied cards with unique IDs
    const now = new Date();
    const baseId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newNodes = [];
    copiedCards.forEach((cardData, index) => {
        const newId = `${baseId}-copy-${index + 1}`;
        
        const newNode = createNodeFromCardData(cardData, newId, { x: centerX, y: centerY });
        
        newNode.grabify();
        newNodes.push(newNode);
    });
    
    // Arrange in cluster (tight circle)
    const radius = 50; // Small cluster radius like original clusterSelectedCards
    
    newNodes.forEach((node, index) => {
        const angle = (index / newNodes.length) * 2 * Math.PI;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        node.position({ x: x, y: y });
    });
    
    // Clear copied cards and select the new ones
    copiedCards = [];
    cy.nodes().unselect();
    newNodes.forEach(node => node.select());
    
    // Apply temporal markings to newly created cards
    setTimeout(() => {
        applyTemporalMarkings();
    }, 100);
    
    console.log(`Q: Created and clustered ${newNodes.length} copied cards`);
}

// Quick note dialog for Alt+N
function showQuickNoteDialog() {
