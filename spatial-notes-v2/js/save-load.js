function saveBoard(filename = null, isAutosave = false) {
    const now = new Date();
    const boardData = {
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
            // Preserve all metadata for advanced analysis
            export_timestamp: node.data('export_timestamp') || null,
            export_session: node.data('export_session') || null,
            export_source: node.data('export_source') || null,
            source_file: node.data('source_file') || null,
            page_number: node.data('page_number') || null,
            matched_terms: node.data('matched_terms') || null,
            card_index: node.data('card_index') || null,
            // Annotation-specific data
            isAnnotation: node.data('isAnnotation') || false,
            annotationType: node.data('annotationType') || null,
            textSize: node.data('textSize') || null, // CRITICAL: Save textSize for text annotations
            customWidth: node.data('customWidth') || null,
            customHeight: node.data('customHeight') || null,
            customZIndex: node.data('customZIndex') || null,
            // Save annotation color from visual style
            annotationColor: node.data('isAnnotation') ? node.style('background-color') : null,
            // Save shape data for geometric figures
            shape: node.data('shape') || null,
            // Save custom font size for geometric shapes
            customFontSize: node.data('customFontSize') || null,
            // Save copy metadata for copy tracking
            copyOf: node.data('copyOf') || null,
            isCopy: node.data('isCopy') || false,
            copyTimestamp: node.data('copyTimestamp') || null,
            // IMAGE DATA - New addition for v2.0 backwards compatibility
            type: node.data('type') || null, // 'image' for image nodes
            imageData: node.data('imageData') || null, // Base64 image data
            annotation: node.data('annotation') || null, // Image annotation text
            searchableText: node.data('searchableText') || null, // Lowercased searchable text
            originalFileName: node.data('originalFileName') || null, // Original filename
            imageWidth: node.data('imageWidth') || null,
            imageHeight: node.data('imageHeight') || null,
            displayWidth: node.data('displayWidth') || null,
            displayHeight: node.data('displayHeight') || null,
            // FILE METADATA - From file import
            fileName: node.data('fileName') || null,
            fileSize: node.data('fileSize') || null,
            fileType: node.data('fileType') || null,
            fileLastModified: node.data('fileLastModified') || null,
            // EXIF METADATA - From image files
            exifDateTime: node.data('exifDateTime') || null,
            exifDateTimeOriginal: node.data('exifDateTimeOriginal') || null,
            exifMake: node.data('exifMake') || null,
            exifModel: node.data('exifModel') || null,
            exifOrientation: node.data('exifOrientation') || null,
            gpsLatitude: node.data('gpsLatitude') || null,
            gpsLongitude: node.data('gpsLongitude') || null,
            // PDF METADATA - From PDF files
            pdfTitle: node.data('pdfTitle') || null,
            pdfAuthor: node.data('pdfAuthor') || null,
            pdfCreationDate: node.data('pdfCreationDate') || null,
            pdfSubject: node.data('pdfSubject') || null,
            pdfKeywords: node.data('pdfKeywords') || null,
            pdfCreator: node.data('pdfCreator') || null,
            pdfProducer: node.data('pdfProducer') || null,
            pdfModificationDate: node.data('pdfModificationDate') || null,
            pdfVersion: node.data('pdfVersion') || null,
            pageNumber: node.data('pageNumber') || null,
            totalPages: node.data('totalPages') || null,
            // OCR EXTRACTED METADATA - From Gemini AI
            imageDescription: node.data('imageDescription') || null,
            extractedDate: node.data('extractedDate') || null,
            extractedTime: node.data('extractedTime') || null,
            extractedDateTime: node.data('extractedDateTime') || null,
            extractedPeople: node.data('extractedPeople') || null,
            extractedPlaces: node.data('extractedPlaces') || null,
            extractedHashtags: node.data('extractedHashtags') || null,
            // ZOTERO LINK - Save link from Zotero imports
            zotero_url: node.data('zotero_url') || null
        })),
        edges: cy.edges().map(edge => ({
            id: edge.id(),
            source: edge.source().id(),
            target: edge.target().id(),
            // Preserve all edge data
            isAnnotation: edge.data('isAnnotation') || false,
            annotationType: edge.data('annotationType') || null,
            customColor: edge.data('customColor') || null,
            // Save all visual styling
            style: {
                'line-color': edge.style('line-color'),
                'target-arrow-color': edge.style('target-arrow-color'),
                'target-arrow-shape': edge.style('target-arrow-shape'),
                'source-arrow-color': edge.style('source-arrow-color'),
                'source-arrow-shape': edge.style('source-arrow-shape'),
                'width': edge.style('width'),
                'curve-style': edge.style('curve-style'),
                'control-point-step-size': edge.style('control-point-step-size'),
                'opacity': edge.style('opacity')
            }
        })),
        viewport: {
            zoom: cy.zoom(),
            pan: cy.pan()
        },
        // Save global arrow visibility state
        arrowsHidden: window.arrowsHidden || false,
        lastModified: now.getTime(), // Unix timestamp for comparison
        timestamp: now.toISOString(), // Human readable
        version: '2.0' // Updated for image support
    };
    
    if (filename) {
        // Save to file
        const blob = new Blob([JSON.stringify(boardData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        // Save to localStorage
        localStorage.setItem('spatial-notes-board', JSON.stringify(boardData));
    }
    
    // Reset change tracking
    hasChanges = false;
    
    // Show saved message
    const searchInfo = document.getElementById('searchInfo');
    if (isAutosave) {
        searchInfo.textContent = 'Auto-sparad ✓';
    } else {
        searchInfo.textContent = 'Sparad ✓';
    }
    searchInfo.classList.add('visible');
    setTimeout(() => {
        searchInfo.classList.remove('visible');
    }, 2000);
}

// Save with timestamp filename
function saveWithTimestamp() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const filename = `board-name_${timestamp}.json`;
    saveBoard(filename);
}

// Save as dialog
function saveAs() {
    const filename = prompt('Filnamn (utan .json):', 'my-board');
    if (filename) {
        saveBoard(filename.endsWith('.json') ? filename : filename + '.json');
    }
}

// Autosave function
function performAutosave() {
    if (hasChanges) {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
        const filename = `board-name_autosave_${timestamp}.json`;
        saveBoard(filename, true);
    }
}

// Start autosave timer
function startAutosave() {
    if (autosaveInterval) {
        clearInterval(autosaveInterval);
    }
    // Every 20 minutes (1200000 ms)
    autosaveInterval = setInterval(performAutosave, 20 * 60 * 1000);
}


// Load board data (internal function without UI alerts)
function loadBoardFromData(boardData) {
    try {
        // Safety check: Ensure Cytoscape is fully initialized
        if (!cy || !cy.nodes || !cy.add || typeof cy.add !== 'function') {
            throw new Error('Cytoscape är inte redo än. Vänta ett ögonblick och försök igen.');
        }
        
        // Clear existing nodes
        cy.nodes().remove();
        
        // Add saved cards
        boardData.cards.forEach(cardData => {
            const newNode = cy.add({
                data: {
                    id: cardData.id,
                    title: cardData.title,
                    text: cardData.text,
                    tags: cardData.tags || [],
                    hidden_tags: cardData.hidden_tags || [],
                    searchMatch: false,
                    isManualCard: cardData.isManualCard || false,
                    cardColor: cardData.cardColor || null,
                    // Preserve metadata if present
                    export_timestamp: cardData.export_timestamp || null,
                    export_session: cardData.export_session || null,
                    export_source: cardData.export_source || null,
                    source_file: cardData.source_file || null,
                    page_number: cardData.page_number || null,
                    matched_terms: cardData.matched_terms || null,
                    card_index: cardData.card_index || null,
                    // Annotation-specific data
                    isAnnotation: cardData.isAnnotation || false,
                    annotationType: cardData.annotationType || null,
                    textSize: cardData.textSize || null, // CRITICAL: Restore textSize for text annotations
                    customWidth: cardData.customWidth || null,
                    customHeight: cardData.customHeight || null,
                    customZIndex: cardData.customZIndex || null,
                    // Store annotation color for restoration
                    annotationColor: cardData.annotationColor || null,
                    // Store shape data for geometric figures
                    shape: cardData.shape || null,
                    // Store custom font size for geometric shapes
                    customFontSize: cardData.customFontSize || null,
                    // Restore copy metadata for copy tracking
                    copyOf: cardData.copyOf || null,
                    isCopy: cardData.isCopy || false,
                    copyTimestamp: cardData.copyTimestamp || null,
                    // IMAGE DATA - Backwards compatible restoration
                    type: cardData.type || null, // 'image' for image nodes
                    imageData: cardData.imageData || null, // Base64 image data
                    annotation: cardData.annotation || null, // Image annotation text
                    searchableText: cardData.searchableText || null, // Lowercased searchable text
                    originalFileName: cardData.originalFileName || null, // Original filename
                    imageWidth: cardData.imageWidth || null,
                    imageHeight: cardData.imageHeight || null,
                    displayWidth: cardData.displayWidth || null,
                    displayHeight: cardData.displayHeight || null,
                    // FILE METADATA - Restore file info
                    fileName: cardData.fileName || null,
                    fileSize: cardData.fileSize || null,
                    fileType: cardData.fileType || null,
                    fileLastModified: cardData.fileLastModified || null,
                    // EXIF METADATA - Restore EXIF data
                    exifDateTime: cardData.exifDateTime || null,
                    exifDateTimeOriginal: cardData.exifDateTimeOriginal || null,
                    exifMake: cardData.exifMake || null,
                    exifModel: cardData.exifModel || null,
                    exifOrientation: cardData.exifOrientation || null,
                    gpsLatitude: cardData.gpsLatitude || null,
                    gpsLongitude: cardData.gpsLongitude || null,
                    // PDF METADATA - Restore PDF data
                    pdfTitle: cardData.pdfTitle || null,
                    pdfAuthor: cardData.pdfAuthor || null,
                    pdfCreationDate: cardData.pdfCreationDate || null,
                    pdfSubject: cardData.pdfSubject || null,
                    pdfKeywords: cardData.pdfKeywords || null,
                    pdfCreator: cardData.pdfCreator || null,
                    pdfProducer: cardData.pdfProducer || null,
                    pdfModificationDate: cardData.pdfModificationDate || null,
                    pdfVersion: cardData.pdfVersion || null,
                    pageNumber: cardData.pageNumber || null,
                    totalPages: cardData.totalPages || null,
                    // OCR EXTRACTED METADATA - Restore AI-extracted data
                    imageDescription: cardData.imageDescription || null,
                    extractedDate: cardData.extractedDate || null,
                    extractedTime: cardData.extractedTime || null,
                    extractedDateTime: cardData.extractedDateTime || null,
                    extractedPeople: cardData.extractedPeople || null,
                    extractedPlaces: cardData.extractedPlaces || null,
                    extractedHashtags: cardData.extractedHashtags || null,
                    // ZOTERO LINK - Restore link from saved data
                    zotero_url: cardData.zotero_url || null
                },
                position: cardData.position
            });
            
            // Restore pinned state
            if (cardData.pinned) {
                newNode.addClass('pinned');
                newNode.data('pinned', true);
                newNode.ungrabify(); // Prevent dragging pinned cards
            } else {
                newNode.grabify(); // Make sure non-pinned cards are draggable
            }

            // Restore annotation shape class and text label
            if (cardData.isAnnotation && cardData.annotationType === 'shape') {
                newNode.addClass('annotation-shape');

                // Make sure text shows as label for annotations
                if (cardData.text) {
                    newNode.style('label', cardData.text);
                    console.log('✅ Restored annotation shape text:', cardData.text, 'for node:', cardData.id);
                }
            }

            // Restore annotation TEXT class and styling
            if (cardData.isAnnotation && cardData.annotationType === 'text') {
                newNode.addClass('annotation-text');

                // Make sure text shows as label for text annotations
                if (cardData.text) {
                    newNode.data('label', cardData.text); // CRITICAL: Set in data for Cytoscape
                    newNode.style('label', cardData.text); // Also set in style
                    console.log('✅ Restored annotation text:', cardData.text, 'for node:', cardData.id);
                }

                // Restore textSize for proper identification
                if (cardData.textSize) {
                    newNode.data('textSize', cardData.textSize);
                }
            }

            // Restore custom size, layer and color for annotation nodes
            if (cardData.isAnnotation && (cardData.customWidth || cardData.customHeight || cardData.customZIndex !== null || cardData.annotationColor)) {
                const width = cardData.customWidth || 120;
                const height = cardData.customHeight || 120;
                const zIndex = cardData.customZIndex !== null ? cardData.customZIndex : -1;
                
                // Convert internal z-index to Cytoscape z-index
                let cyZIndex = 1; // default
                if (zIndex === -1) cyZIndex = 0; // Background
                if (zIndex === 0) cyZIndex = 1;  // Normal
                if (zIndex === 1) cyZIndex = 2;  // Foreground
                
                const styleUpdate = {
                    'width': width + 'px',
                    'height': height + 'px',
                    'z-index': cyZIndex
                };
                
                // Restore annotation color if saved
                if (cardData.annotationColor && cardData.annotationColor !== 'rgb(255,255,255)') {
                    styleUpdate['background-color'] = cardData.annotationColor;
                }
                
                // Restore custom font size if saved
                if (cardData.customFontSize) {
                    styleUpdate['font-size'] = cardData.customFontSize + 'px';
                }
                
                newNode.style(styleUpdate);
                console.log('✅ Restored annotation styling for', newNode.id(), 'color:', cardData.annotationColor, 'shape:', cardData.shape);
            }
            
            // Restore card color
            if (cardData.cardColor) {
                newNode.style('background-color', getCardColorValue(cardData.cardColor, getCurrentTheme()));
            }
            
            // IMAGE NODE RESTORATION - Special handling for image nodes
            if (cardData.type === 'image' && cardData.imageData) {
                console.log('🖼️ Restoring image node:', cardData.originalFileName);
                
                // Apply image-specific styling (height will be calculated by Cytoscape style function)
                newNode.style({
                    'background-image': cardData.imageData,
                    'background-fit': 'cover',
                    'width': '300px' // Same as regular cards
                });
                
                // Update label to show annotation indicator if present
                // Don't show filename in title, keep title empty for clean image display
                newNode.data('title', '');
                
                const filename = cardData.originalFileName || 'Image';
                const hasAnnotation = (cardData.annotation || '').length > 0;
                console.log(`✅ Restored image: ${filename} (${hasAnnotation ? 'with annotation' : 'no annotation'})`);
            }
            
            newNode.grabify();
        });
        
        // Restore edges/arrows if they exist
        if (boardData.edges && Array.isArray(boardData.edges)) {
            boardData.edges.forEach(edgeData => {
                const newEdge = cy.add({
                    data: {
                        id: edgeData.id,
                        source: edgeData.source,
                        target: edgeData.target,
                        isAnnotation: edgeData.isAnnotation || false,
                        annotationType: edgeData.annotationType || null,
                        customColor: edgeData.customColor || null
                    }
                });
                
                // Apply annotation classes for styling
                if (edgeData.isAnnotation) {
                    newEdge.addClass('annotation-connection');
                }
                
                // Restore all visual styling
                if (edgeData.style) {
                    newEdge.style(edgeData.style);
                    // Ensure arrow-scale is applied (for older saved edges)
                    if (!edgeData.style['arrow-scale']) {
                        newEdge.style('arrow-scale', 1.8);
                    }
                    // Ensure curve-style is applied (for older saved edges)
                    if (!edgeData.style['curve-style']) {
                        newEdge.style('curve-style', 'bezier');
                    }
                    console.log('✅ Restored edge styling for', edgeData.id, 'arrow shape:', edgeData.style['target-arrow-shape']);
                }
            });
            console.log('✅ Restored', boardData.edges.length, 'edges/arrows');
        }
        
        // Card IDs are now timestamp-based, no counter needed
        
        // Restore viewport (zoom and pan) if saved
        if (boardData.viewport) {
            cy.zoom(boardData.viewport.zoom);
            cy.pan(boardData.viewport.pan);
        }
        
        // Restore global arrow visibility state
        if (boardData.arrowsHidden !== undefined) {
            window.arrowsHidden = boardData.arrowsHidden;
            if (window.arrowsHidden) {
                // Apply hidden state to all edges
                cy.edges().style('opacity', 0);
            }
        }
        
        // Removed annoying "Laddade X kort!" alert - user can see the cards loaded
        
        // Apply temporal markings after data is loaded
        setTimeout(() => {
            applyTemporalMarkings();
        }, 200);
        
    } catch (error) {
        console.error('Error loading board data:', error);
        throw error;
    }
}

// Load board from file
function loadBoard() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const boardData = JSON.parse(e.target.result);
                    loadBoardFromData(boardData);
                    console.log(`File loaded: ${boardData.cards.length} cards and ${(boardData.edges || []).length} edges`);
                } catch (error) {
                    alert('Fel vid laddning av fil: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Check for newer files on startup
function checkForNewerFiles() {
    // This is a placeholder - browser can't scan local files for security reasons
    // User will need to manually check their folder or we could implement a file timestamp cache
    console.log('Note: Manual file checking needed - browser cannot scan local folder');
}

// Startup conflict detection (simplified for browser limitations)
function checkStartupConflicts() {
    const savedData = localStorage.getItem('spatial-notes-board');
    if (savedData) {
        try {
            const boardData = JSON.parse(savedData);
            if (boardData.lastModified) {
                const lastModified = new Date(boardData.lastModified);
                const hoursSinceModified = (Date.now() - boardData.lastModified) / (1000 * 60 * 60);
                
                if (hoursSinceModified < 24) { // Show warning if modified within 24 hours
                    const timeAgo = hoursSinceModified < 1 ? 
                        `${Math.round(hoursSinceModified * 60)} minuter sedan` : 
                        `${Math.round(hoursSinceModified)} timmar sedan`;
                    
                    console.log(`Varning: LocalStorage har data sparad ${timeAgo}. Kom ihåg att ladda senaste version från fil om du arbetat på annan dator.`);
                    
                    // Show subtle reminder in status
                    const searchInfo = document.getElementById('searchInfo');
                    searchInfo.textContent = `💡 LocalStorage från ${timeAgo}`;
                    searchInfo.classList.add('visible');
                    setTimeout(() => {
                        searchInfo.classList.remove('visible');
                    }, 5000);
                }
            }
        } catch (error) {
            console.error('Error checking startup conflicts:', error);
        }
    }
}

// Save board as standalone HTML file
function saveAsHTMLFile() {
    const currentCards = cy.nodes().map(node => ({
        id: node.id(),
        title: node.data('title') || '',
        text: node.data('text') || '',
        tags: node.data('tags') || [],
        position: node.position(),
        pinned: node.hasClass('pinned') || false
    }));
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = prompt('Namn på HTML-fil:', `spatial-notes-${timestamp}`) || `spatial-notes-${timestamp}`;
    
    // Check if running locally (file://) - fetch won't work due to CORS
    if (window.location.protocol === 'file:') {
        alert('HTML-export fungerar inte när filen körs lokalt (file://) pga CORS-säkerhet.\n\nFör att använda HTML-export:\n1. Kör filen på en webbserver\n2. Eller använd "💾 Spara" istället (sparar till localStorage)');
        return;
    }
    
    // Read current HTML as template
    fetch(window.location.href)
        .then(response => response.text())
        .then(currentHTML => {
            // Replace the initialCards array with current cards
            const cardArrayRegex = /const initialCards = \[[\s\S]*?\];/;
            const newCardsArray = `const initialCards = ${JSON.stringify(currentCards, null, 12)};`;
            
            let newHTML = currentHTML.replace(cardArrayRegex, newCardsArray);
            
            // Update title
            newHTML = newHTML.replace(/<title>.*?<\/title>/, `<title>Spatial Notes - ${filename}</title>`);
            
            // Add metadata comment
            const metadataComment = `<!-- Saved from Spatial Notes on ${new Date().toLocaleString('sv-SE')} with ${currentCards.length} cards -->`;
            newHTML = newHTML.replace('</head>', `    ${metadataComment}\n</head>`);
            
            // Create and download file
            const blob = new Blob([newHTML], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename.endsWith('.html') ? filename : filename + '.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Show confirmation
            const searchInfo = document.getElementById('searchInfo');
            searchInfo.textContent = `HTML-fil sparad: ${a.download} (${currentCards.length} kort)`;
            searchInfo.classList.add('visible');
            setTimeout(() => {
                searchInfo.classList.remove('visible');
            }, 3000);
        })
        .catch(error => {
            console.error('Error creating HTML file:', error);
            alert('Fel vid skapande av HTML-fil: ' + error.message);
        });
}

// Export board to JSON file (WORKS LOCALLY - No CORS issues!)
function exportToJSON() {
    try {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                exportApp: 'Spatial Notes',
                version: '2.0', // Updated for image support
                totalCards: cy.nodes().length,
                totalEdges: cy.edges().length,
                totalImages: cy.nodes('[type="image"]').length
            },
            viewport: {
                zoom: cy.zoom(),
                pan: cy.pan()
            },
            cards: cy.nodes().map(node => ({
                id: node.id(),
                title: node.data('title') || '',
                text: node.data('text') || '',
                tags: node.data('tags') || [],
                hidden_tags: node.data('hidden_tags') || [],
                position: {
                    x: Math.round(node.position().x),
                    y: Math.round(node.position().y)
                },
                pinned: node.hasClass('pinned') || false,
                isManualCard: node.data('isManualCard') || false,
                cardColor: node.data('cardColor') || null,
                // Preserve all metadata for advanced analysis
                export_timestamp: node.data('export_timestamp') || null,
                export_session: node.data('export_session') || null,
                export_source: node.data('export_source') || null,
                source_file: node.data('source_file') || null,
                page_number: node.data('page_number') || null,
                matched_terms: node.data('matched_terms') || null,
                card_index: node.data('card_index') || null,
                // Annotation-specific data (geometric shapes)
                isAnnotation: node.data('isAnnotation') || false,
                annotationType: node.data('annotationType') || null,
                textSize: node.data('textSize') || null, // CRITICAL: Export textSize for text annotations
                customWidth: node.data('customWidth') || null,
                customHeight: node.data('customHeight') || null,
                customZIndex: node.data('customZIndex') || null,
                customFontSize: node.data('customFontSize') || null,
                // Save annotation color from visual style
                annotationColor: node.data('isAnnotation') ? node.style('background-color') : null,
                // Save shape data for geometric figures
                shape: node.data('shape') || null,
                // IMAGE DATA - Essential for exporting images
                type: node.data('type') || null, // 'image' for image nodes
                imageData: node.data('imageData') || null, // Base64 image data
                annotation: node.data('annotation') || null, // Image annotation text
                searchableText: node.data('searchableText') || null, // Searchable text
                originalFileName: node.data('originalFileName') || null, // Original filename
                imageWidth: node.data('imageWidth') || null,
                imageHeight: node.data('imageHeight') || null,
                displayWidth: node.data('displayWidth') || null,
                displayHeight: node.data('displayHeight') || null,
                // FILE METADATA - From file import
                fileName: node.data('fileName') || null,
                fileSize: node.data('fileSize') || null,
                fileType: node.data('fileType') || null,
                fileLastModified: node.data('fileLastModified') || null,
                // EXIF METADATA - From image files
                exifDateTime: node.data('exifDateTime') || null,
                exifDateTimeOriginal: node.data('exifDateTimeOriginal') || null,
                exifMake: node.data('exifMake') || null,
                exifModel: node.data('exifModel') || null,
                exifOrientation: node.data('exifOrientation') || null,
                gpsLatitude: node.data('gpsLatitude') || null,
                gpsLongitude: node.data('gpsLongitude') || null,
                // PDF METADATA - From PDF files
                pdfTitle: node.data('pdfTitle') || null,
                pdfAuthor: node.data('pdfAuthor') || null,
                pdfCreationDate: node.data('pdfCreationDate') || null,
                pdfSubject: node.data('pdfSubject') || null,
                pdfKeywords: node.data('pdfKeywords') || null,
                pdfCreator: node.data('pdfCreator') || null,
                pdfProducer: node.data('pdfProducer') || null,
                pdfModificationDate: node.data('pdfModificationDate') || null,
                pdfVersion: node.data('pdfVersion') || null,
                pageNumber: node.data('pageNumber') || null,
                totalPages: node.data('totalPages') || null,
                // OCR EXTRACTED METADATA - From Gemini AI
                imageDescription: node.data('imageDescription') || null,
                extractedDate: node.data('extractedDate') || null,
                extractedTime: node.data('extractedTime') || null,
                extractedDateTime: node.data('extractedDateTime') || null,
                extractedPeople: node.data('extractedPeople') || null,
                extractedPlaces: node.data('extractedPlaces') || null,
                extractedHashtags: node.data('extractedHashtags') || null,
                // ZOTERO LINK - Save link
                zotero_url: node.data('zotero_url') || null
            })),
            edges: cy.edges().map(edge => ({
                id: edge.id(),
                source: edge.source().id(),
                target: edge.target().id(),
                // Preserve all edge data
                isAnnotation: edge.data('isAnnotation') || false,
                annotationType: edge.data('annotationType') || null,
                customColor: edge.data('customColor') || null,
                // Save all visual styling
                style: {
                    'line-color': edge.style('line-color'),
                    'target-arrow-color': edge.style('target-arrow-color'),
                    'target-arrow-shape': edge.style('target-arrow-shape'),
                    'source-arrow-color': edge.style('source-arrow-color'),
                    'source-arrow-shape': edge.style('source-arrow-shape'),
                    'width': edge.style('width'),
                    'curve-style': edge.style('curve-style'),
                    'control-point-step-size': edge.style('control-point-step-size'),
                    'opacity': edge.style('opacity')
                }
            })),
            // Save global arrow visibility state
            arrowsHidden: window.arrowsHidden || false
        };
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = prompt('Namn på JSON-fil:', `spatial-notes-${timestamp}.json`) || `spatial-notes-${timestamp}.json`;
        
        if (!filename) return; // User cancelled
        
        // Ensure .json extension
        const finalFilename = filename.endsWith('.json') ? filename : filename + '.json';
        
        // Create and download JSON file
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show confirmation
        const searchInfo = document.getElementById('searchInfo');
        searchInfo.textContent = `📋 JSON-fil exporterad: ${finalFilename} (${exportData.cards.length} kort, ${exportData.edges.length} pilar)`;
        searchInfo.classList.add('visible');
        setTimeout(() => {
            searchInfo.classList.remove('visible');
        }, 3000);
        
        console.log(`JSON export completed: ${finalFilename} with ${exportData.cards.length} cards and ${exportData.edges.length} edges`);
        
    } catch (error) {
        console.error('Error exporting JSON:', error);
        alert('Fel vid JSON-export: ' + error.message);
    }
}

// Import board from JSON file (WORKS LOCALLY!)
function importFromJSON() {
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // Add a small delay to ensure Cytoscape is fully ready
            setTimeout(() => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    // Validate JSON structure
                    if (!importData.cards || !Array.isArray(importData.cards)) {
                        throw new Error('Ogiltig JSON-fil: Saknar kort-data');
                    }
                    
                    // Safety check: Ensure Cytoscape is fully initialized
                    if (!cy || !cy.add || typeof cy.add !== 'function') {
                        alert('⚠️ Systemet laddas fortfarande. Vänta 2-3 sekunder och försök igen.');
                        return;
                    }
                
                // Always add to existing cards (no replace option)
                
                // Add imported cards
                let importedCount = 0;
                
                // Generate import date in YYMMDD format
                const now = new Date();
                const importDate = now.getFullYear().toString().substr(-2) + 
                                  String(now.getMonth() + 1).padStart(2, '0') + 
                                  String(now.getDate()).padStart(2, '0');
                
                // Create ID mapping for edges
                const idMapping = new Map();
                
                console.log(`🚀 Starting optimized import of ${importData.cards.length} cards...`);
                
                // Use batch mode for optimal performance
                cy.batch(() => {
                    importData.cards.forEach(cardData => {
                    // Save original ID for origin tag
                    const originalId = cardData.id;
                    
                    // Always generate new unique ID for all imported cards
                    const timestamp = Date.now();
                    const random = Math.random().toString(36).substr(2, 9);
                    const newId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}-${random}`;
                    
                    cardData.id = newId;
                    
                    // Store ID mapping for edge updates
                    idMapping.set(originalId, newId);
                    
                    // Create hidden tags for import tracking
                    const hiddenTags = cardData.hidden_tags || [];
                    hiddenTags.push(`origin_${originalId}`);
                    hiddenTags.push(`import_${importDate}`);
                    
                    const newNode = cy.add({
                        data: {
                            id: cardData.id,
                            title: cardData.title || '',
                            text: cardData.text || '',
                            tags: cardData.tags || [],
                            hidden_tags: hiddenTags,
                            searchMatch: false,
                            isManualCard: cardData.isManualCard || false,
                            cardColor: cardData.cardColor || null,
                            // Restore metadata
                            export_timestamp: cardData.export_timestamp || null,
                            export_session: cardData.export_session || null,
                            export_source: cardData.export_source || null,
                            source_file: cardData.source_file || null,
                            page_number: cardData.page_number || null,
                            matched_terms: cardData.matched_terms || null,
                            card_index: cardData.card_index || null,
                            // Annotation-specific data
                            isAnnotation: cardData.isAnnotation || false,
                            annotationType: cardData.annotationType || null,
                            textSize: cardData.textSize || null, // CRITICAL: Restore textSize for text annotations
                            customWidth: cardData.customWidth || null,
                            customHeight: cardData.customHeight || null,
                            customZIndex: cardData.customZIndex || null,
                            customFontSize: cardData.customFontSize || null,
                            // Store annotation color for restoration
                            annotationColor: cardData.annotationColor || null,
                            // Store shape data for geometric figures
                            shape: cardData.shape || null,
                            // IMAGE DATA - Import compatibility for v2.0
                            type: cardData.type || null,
                            imageData: cardData.imageData || null,
                            annotation: cardData.annotation || null,
                            searchableText: cardData.searchableText || null,
                            originalFileName: cardData.originalFileName || null,
                            imageWidth: cardData.imageWidth || null,
                            imageHeight: cardData.imageHeight || null,
                            displayWidth: cardData.displayWidth || null,
                            displayHeight: cardData.displayHeight || null,
                            // FILE METADATA - Import file info
                            fileName: cardData.fileName || null,
                            fileSize: cardData.fileSize || null,
                            fileType: cardData.fileType || null,
                            fileLastModified: cardData.fileLastModified || null,
                            // EXIF METADATA - Import EXIF data
                            exifDateTime: cardData.exifDateTime || null,
                            exifDateTimeOriginal: cardData.exifDateTimeOriginal || null,
                            exifMake: cardData.exifMake || null,
                            exifModel: cardData.exifModel || null,
                            exifOrientation: cardData.exifOrientation || null,
                            gpsLatitude: cardData.gpsLatitude || null,
                            gpsLongitude: cardData.gpsLongitude || null,
                            // PDF METADATA - Import PDF data
                            pdfTitle: cardData.pdfTitle || null,
                            pdfAuthor: cardData.pdfAuthor || null,
                            pdfCreationDate: cardData.pdfCreationDate || null,
                            pdfSubject: cardData.pdfSubject || null,
                            pdfKeywords: cardData.pdfKeywords || null,
                            pdfCreator: cardData.pdfCreator || null,
                            pdfProducer: cardData.pdfProducer || null,
                            pdfModificationDate: cardData.pdfModificationDate || null,
                            pdfVersion: cardData.pdfVersion || null,
                            pageNumber: cardData.pageNumber || null,
                            totalPages: cardData.totalPages || null,
                            // OCR EXTRACTED METADATA - Import AI-extracted data
                            imageDescription: cardData.imageDescription || null,
                            extractedDate: cardData.extractedDate || null,
                            extractedTime: cardData.extractedTime || null,
                            extractedDateTime: cardData.extractedDateTime || null,
                            extractedPeople: cardData.extractedPeople || null,
                            extractedPlaces: cardData.extractedPlaces || null,
                            extractedHashtags: cardData.extractedHashtags || null,
                            // ZOTERO LINK - Import link
                            zotero_url: cardData.zotero_url || null
                        },
                        position: cardData.position || { x: Math.random() * 800 + 100, y: Math.random() * 600 + 100 }
                    });
                    
                    // Restore pinned state
                    if (cardData.pinned) {
                        newNode.addClass('pinned');
                        newNode.data('pinned', true);
                        newNode.ungrabify(); // Prevent dragging pinned cards
                    } else {
                        newNode.grabify(); // Make sure non-pinned cards are draggable
                    }

                    // Restore annotation shape class and text label
                    if (cardData.isAnnotation && cardData.annotationType === 'shape') {
                        newNode.addClass('annotation-shape');

                        // Make sure text shows as label for annotations
                        if (cardData.text) {
                            newNode.style('label', cardData.text);
                        }
                    }

                    // Restore annotation TEXT class and styling
                    if (cardData.isAnnotation && cardData.annotationType === 'text') {
                        newNode.addClass('annotation-text');

                        // Make sure text shows as label for text annotations
                        if (cardData.text) {
                            newNode.data('label', cardData.text); // CRITICAL: Set in data for Cytoscape
                            newNode.style('label', cardData.text); // Also set in style
                        }

                        // Restore textSize for proper identification
                        if (cardData.textSize) {
                            newNode.data('textSize', cardData.textSize);
                        }
                    }

                    // Restore custom size, layer, color and font size for annotation nodes
                    if (cardData.isAnnotation && (cardData.customWidth || cardData.customHeight || cardData.customZIndex !== null || cardData.annotationColor || cardData.customFontSize)) {
                        const width = cardData.customWidth || 120;
                        const height = cardData.customHeight || 120;
                        const zIndex = cardData.customZIndex !== null ? cardData.customZIndex : -1;
                        
                        // Convert internal z-index to Cytoscape z-index
                        let cyZIndex = 1; // default
                        if (zIndex === -1) cyZIndex = 0; // Background
                        if (zIndex === 0) cyZIndex = 1;  // Normal
                        if (zIndex === 1) cyZIndex = 2;  // Foreground
                        
                        const styleUpdate = {
                            'width': width + 'px',
                            'height': height + 'px',
                            'z-index': cyZIndex
                        };
                        
                        // Restore annotation color if saved
                        if (cardData.annotationColor && cardData.annotationColor !== 'rgb(255,255,255)') {
                            styleUpdate['background-color'] = cardData.annotationColor;
                        }
                        
                        // Restore custom font size if saved
                        if (cardData.customFontSize) {
                            styleUpdate['font-size'] = cardData.customFontSize + 'px';
                        }
                        
                        newNode.style(styleUpdate);
                    }
                    
                    // Restore card color
                    if (cardData.cardColor) {
                        newNode.style('background-color', getCardColorValue(cardData.cardColor, getCurrentTheme()));
                    }
                    
                    // IMAGE NODE RESTORATION - Import compatibility
                    if (cardData.type === 'image' && cardData.imageData) {
                        console.log('🖼️ Importing image node:', cardData.originalFileName);
                        
                        // Apply image-specific styling
                        newNode.style({
                            'background-image': cardData.imageData,
                            'background-fit': 'cover',
                            'width': '300px'
                        });
                        
                        // Update title to show annotation indicator if present
                        // Don't show filename in title, keep title empty for clean image display
                        newNode.data('title', '');
                        
                        const filename = cardData.originalFileName || 'Imported Image';
                        const hasAnnotation = (cardData.annotation || '').length > 0;
                        console.log(`✅ Imported image: ${filename} (${hasAnnotation ? 'with annotation' : 'no annotation'})`);
                    }
                    
                    newNode.grabify();
                    importedCount++;
                });
                }); // End batch operation for cards
                
                console.log(`✅ Batch card import completed: ${importedCount} cards processed`);
                
                // Import edges/arrows if they exist  
                let importedEdges = 0;
                if (importData.edges && Array.isArray(importData.edges)) {
                    console.log(`🔗 Starting batch import of ${importData.edges.length} edges...`);
                    cy.batch(() => {
                        importData.edges.forEach(edgeData => {
                        // Map old IDs to new IDs
                        const newSourceId = idMapping.get(edgeData.source);
                        const newTargetId = idMapping.get(edgeData.target);
                        
                        // Only create edge if both source and target exist
                        if (newSourceId && newTargetId) {
                            // Generate new edge ID
                            const timestamp = Date.now();
                            const random = Math.random().toString(36).substr(2, 9);
                            const newEdgeId = `edge-${timestamp}-${random}`;
                            
                            const newEdge = cy.add({
                                data: {
                                    id: newEdgeId,
                                    source: newSourceId,
                                    target: newTargetId,
                                    isAnnotation: edgeData.isAnnotation || false,
                                    annotationType: edgeData.annotationType || null,
                                    customColor: edgeData.customColor || null
                                }
                            });
                        
                            // Apply annotation classes for styling
                            if (edgeData.isAnnotation) {
                                newEdge.addClass('annotation-connection');
                            }
                            
                            // Restore all visual styling
                            if (edgeData.style) {
                                newEdge.style(edgeData.style);
                            }
                            
                            importedEdges++;
                        } else {
                            console.warn('Skipping edge - source or target not found:', edgeData.source, '->', edgeData.target);
                        }
                    });
                    }); // End batch operation for edges
                    console.log(`✅ Batch edge import completed: ${importedEdges} edges processed`);
                }
                
                // Restore global arrow visibility state
                if (importData.arrowsHidden !== undefined) {
                    window.arrowsHidden = importData.arrowsHidden;
                    if (window.arrowsHidden) {
                        // Apply hidden state to all edges
                        cy.edges().style('opacity', 0);
                    }
                }
                
                // Card IDs are now timestamp-based, no counter needed
                
                // Restore viewport if available
                if (importData.viewport) {
                    setTimeout(() => {
                        cy.zoom(importData.viewport.zoom);
                        cy.pan(importData.viewport.pan);
                    }, 100);
                }
                
                // Show success message
                let message = `📁 JSON-import lyckades: ${importedCount} kort`;
                if (importedEdges > 0) {
                    message += `, ${importedEdges} pilar`;
                }
                message += ` importerade (alla fick nya ID:n + gömda taggar)`;
                if (importData.metadata) {
                    message += `\nExportdatum: ${new Date(importData.metadata.exportDate).toLocaleString('sv-SE')}`;
                }
                
                const searchInfo = document.getElementById('searchInfo');
                searchInfo.textContent = message;
                searchInfo.classList.add('visible');
                setTimeout(() => {
                    searchInfo.classList.remove('visible');
                }, 4000);
                
                console.log(`JSON import completed: ${importedCount} cards and ${importedEdges} edges imported`, importData.metadata);
                
                } catch (error) {
                    console.error('Error importing JSON:', error);
                    alert('Fel vid JSON-import: ' + error.message + '\n\nKontrollera att filen är en giltig Spatial Notes JSON-export.');
                }
            }, 100); // End of setTimeout
        };
        
        reader.readAsText(file);
    });
    
    // Trigger file picker
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// Import cards from PDF-Extractor localStorage
function importFromExtractor() {
    try {
        // Debug: Show all localStorage keys
        console.log('All localStorage keys:', Object.keys(localStorage));
        
        // Try different possible keys that PDF-extractor might use
        // PDF-Extractor uses the same localStorage key as spatial notes
        const extractorData = localStorage.getItem('spatial-notes-board');
        console.log('Checking for PDF-Extractor data in spatial-notes-board key');
        
        if (!extractorData) {
            // Show debug info
            const allKeys = Object.keys(localStorage);
            alert(`Ingen data från PDF-Extractor hittades!\n\nDebug info:\nLocalStorage nycklar: ${allKeys.join(', ')}\n\nKör PDF-extractor först och exportera kort till Spatial Notes.`);
            return;
        }
        
        const importedCards = JSON.parse(extractorData);
        
        if (!Array.isArray(importedCards) || importedCards.length === 0) {
            alert('PDF-Extractor data är tom eller ogiltig.');
            return;
        }
        
        // Check if we have existing cards in spatial notes
        const hasExistingCards = cy.nodes().length > 0;
        const existingIds = new Set(cy.nodes().map(n => n.id()));
        
        // Filter out cards that already exist in spatial notes
        const newCards = importedCards.filter(card => !existingIds.has(card.id));
        
        if (newCards.length === 0) {
            alert('Inga nya kort att importera från PDF-Extractor. Alla kort finns redan.');
            return;
        }
        
        let replaceExisting = false;
        
        if (hasExistingCards) {
            replaceExisting = confirm(
                `PDF-Extractor har ${newCards.length} NYA kort att importera.\n` +
                `Du har ${cy.nodes().length} befintliga kort.\n\n` +
                `Klicka OK för att ERSÄTTA alla kort\n` +
                `Klicka Avbryt för att LÄGGA TILL endast de nya korten`
            );
        }
        
        // Use only new cards if not replacing
        if (!replaceExisting) {
            importedCards = newCards;
        }
        
        // Clear existing cards if replacing
        if (replaceExisting) {
            cy.nodes().remove();
        }
        
        // Add imported cards with smart positioning
        let importedCount = 0;
        let duplicateCount = 0;
        
        importedCards.forEach((cardData, index) => {
            // Check for duplicate IDs if not replacing
            if (!replaceExisting && cy.getElementById(cardData.id).length > 0) {
                // Generate new unique ID for duplicate
                cardData.id = cardData.id + '_imported_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                duplicateCount++;
            }
            
            // Smart positioning: arrange in grid if no position provided
            let position = cardData.position;
            if (!position || (position.x === 0 && position.y === 0)) {
                const cols = Math.ceil(Math.sqrt(importedCards.length));
                const col = index % cols;
                const row = Math.floor(index / cols);
                position = {
                    x: 200 + col * 320,
                    y: 200 + row * 200
                };
            }
            
            const newNode = cy.add({
                data: {
                    id: cardData.id,
                    title: cardData.title || '',
                    text: cardData.text || '',
                    tags: cardData.tags || [],
                    hidden_tags: cardData.hidden_tags || [],
                    searchMatch: false,
                    // Preserve PDF-extractor metadata
                    export_timestamp: cardData.export_timestamp || null,
                    export_session: cardData.export_session || null,
                    export_source: cardData.export_source || 'pdf_extractor',
                    source_file: cardData.source_file || null,
                    page_number: cardData.page_number || null,
                    matched_terms: cardData.matched_terms || null,
                    card_index: cardData.card_index || null
                },
                position: position
            });
            
            newNode.grabify();
            importedCount++;
        });
        
        // Card IDs are now timestamp-based, no counter needed
        
        // Clear the PDF-extractor data so it doesn't import again
        // localStorage.removeItem('pdf-extractor-export'); // Don't clear, let user decide
        
        // Show success message
        let message = `📥 PDF-Extractor import lyckades: ${importedCount} kort importerade`;
        if (duplicateCount > 0) {
            message += ` (${duplicateCount} dubbletter fick nya ID:n)`;
        }
        
        const searchInfo = document.getElementById('searchInfo');
        searchInfo.textContent = message;
        searchInfo.classList.add('visible');
        setTimeout(() => {
            searchInfo.classList.remove('visible');
        }, 4000);
        
        console.log(`PDF-Extractor import completed: ${importedCount} cards imported`);
        
    } catch (error) {
        console.error('Error importing from PDF-Extractor:', error);
        alert('Fel vid import från PDF-Extractor: ' + error.message);
    }
}

// Map Zotero highlight colors to spatial-notes card colors
function mapZoteroColorToCard(bgColorStyle) {
    // Extract hex color from style like "background-color: #ffd40080"
    const match = bgColorStyle.match(/#([0-9a-fA-F]{6})/);
    if (!match) return null;

    const hexColor = match[1].toLowerCase();

    // Map Zotero colors to spatial-notes card-color-X
    const colorMap = {
        'ffd400': 'card-color-4', // Gul
        'ff6666': 'card-color-3', // Röd
        '5fb236': 'card-color-1', // Grön
        '2ea8e5': 'card-color-6', // Blå/Cyan
        'a28ae5': 'card-color-5', // Lila
        'e56eee': 'card-color-5', // Magenta → Lila
        'f19837': 'card-color-2', // Orange
        'aaaaaa': 'card-color-7'  // Grå
    };

    return colorMap[hexColor] || null;
}

// Import notes from Zotero HTML export
function importFromZoteroHTML(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const htmlContent = e.target.result;
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            // Find all highlight paragraphs
            const highlightParagraphs = doc.querySelectorAll('p');

            let importedCount = 0;
            const timestamp = Date.now();
            const session = `zotero_${timestamp}`;

            highlightParagraphs.forEach((p, index) => {
                // Find the highlight span with background color
                const highlightSpan = p.querySelector('span.highlight span[style*="background-color"]');
                if (!highlightSpan) return;

                // Extract the quote text
                const quoteText = highlightSpan.textContent.trim();
                if (!quoteText) return;

                // Extract color
                const bgStyle = highlightSpan.getAttribute('style');
                const cardColor = mapZoteroColorToCard(bgStyle);

                // Extract citation if available
                const citationSpan = p.querySelector('span.citation');
                let citation = '';
                if (citationSpan) {
                    citation = citationSpan.textContent.trim();
                }

                // Extract link/URL if available
                // Priority: PDF annotation links > PDF links > highlight links > article links
                const allLinks = p.querySelectorAll('a');
                let zoteroLink = '';

                if (allLinks.length > 0) {
                    // Priority 1: PDF annotation link (open-pdf with annotation parameter)
                    const pdfAnnotationLink = Array.from(allLinks).find(a =>
                        a.href && a.href.includes('open-pdf') && a.href.includes('annotation=')
                    );

                    if (pdfAnnotationLink) {
                        zoteroLink = pdfAnnotationLink.href;
                        console.log('📍 Found PDF annotation link:', zoteroLink);
                    } else {
                        // Priority 2: PDF link (open-pdf without annotation)
                        const pdfLink = Array.from(allLinks).find(a =>
                            a.href && a.href.includes('open-pdf')
                        );

                        if (pdfLink) {
                            zoteroLink = pdfLink.href;
                            console.log('📄 Found PDF link:', zoteroLink);
                        } else {
                            // Priority 3: Highlight link (with #fragment)
                            const highlightLink = Array.from(allLinks).find(a =>
                                a.href && a.href.includes('#')
                            );

                            if (highlightLink) {
                                zoteroLink = highlightLink.href;
                                console.log('🔗 Found highlight link:', zoteroLink);
                            } else {
                                // Priority 4: Fall back to first available link
                                zoteroLink = allLinks[0].href;
                                console.log('🔗 Using article link:', zoteroLink);
                            }
                        }
                    }
                }

                // Create hidden tags for tracking
                const hidden_tags = [
                    `zotero_import_${timestamp}`,
                    `source_${file.name.replace('.html', '')}`
                ];

                if (citation) {
                    hidden_tags.push(`citation_${citation.replace(/[^a-zA-Z0-9]/g, '_')}`);
                }

                // Add link as metadata (if exists)
                if (zoteroLink) {
                    hidden_tags.push(`url_${zoteroLink}`);
                }

                // Grid positioning
                const cols = Math.ceil(Math.sqrt(highlightParagraphs.length));
                const col = index % cols;
                const row = Math.floor(index / cols);
                const position = {
                    x: 200 + col * 320,
                    y: 200 + row * 200
                };

                // Create card with full metadata
                // Generate unique ID with index to avoid duplicates in batch import
                const baseId = generateCardId();
                const cardId = `${baseId}-z${index}`;

                // Combine quote with citation for display
                let cardText = quoteText;
                if (citation) {
                    cardText = `${quoteText}\n\n${citation}`;
                }

                const nodeData = {
                    id: cardId,
                    title: '',
                    text: cardText,
                    tags: [],
                    hidden_tags: hidden_tags,
                    searchMatch: false,
                    // Import metadata (osynlig)
                    export_timestamp: new Date().toISOString(),
                    export_session: session,
                    export_source: 'zotero',
                    source_file: file.name,
                    page_number: null,
                    matched_terms: citation || null,
                    zotero_url: zoteroLink || null,  // Store Zotero link as metadata
                    card_index: index,
                    // Kort-status
                    isManualCard: false,
                    cardColor: cardColor,
                    // Kopia-tracking (ej tillämpligt vid import)
                    copyOf: null,
                    isCopy: false,
                    copyTimestamp: null
                };

                const newNode = cy.add({
                    group: 'nodes',
                    data: nodeData,
                    position: position
                });

                // Apply color styling if we have a color
                if (cardColor) {
                    newNode.style('background-color', getCardColorValue(cardColor, getCurrentTheme()));
                }

                newNode.grabify();
                importedCount++;
            });

            // Show success message
            const searchInfo = document.getElementById('searchInfo');
            if (searchInfo) {
                searchInfo.textContent = `📚 Zotero import: ${importedCount} kort importerade från ${file.name}`;
                searchInfo.classList.add('visible');
                setTimeout(() => {
                    searchInfo.classList.remove('visible');
                }, 4000);
            }

            console.log(`Zotero import completed: ${importedCount} cards imported from ${file.name}`);

        } catch (error) {
            console.error('Error importing from Zotero:', error);
            alert('Fel vid import från Zotero HTML: ' + error.message);
        }
    };

    reader.readAsText(file);
}

// Clear board completely
function clusterSelectedCards() {
