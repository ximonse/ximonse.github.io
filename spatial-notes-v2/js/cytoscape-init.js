function initCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        
        elements: initialCards.map((card, index) => ({
            data: {
                id: card.id,
                title: card.title || '',
                text: card.text || '', 
                tags: card.tags || [],
                searchMatch: false,
                // Hidden metadata for advanced analysis
                export_timestamp: card.export_timestamp || null,
                export_session: card.export_session || null,
                export_source: card.export_source || null,
                source_file: card.source_file || null,
                page_number: card.page_number || null,
                matched_terms: card.matched_terms || null,
                card_index: card.card_index || null
            },
            position: {
                x: card.x !== undefined ? card.x : (200 + (index % 3) * 300),
                y: card.y !== undefined ? card.y : (200 + Math.floor(index / 3) * 200)
            }
        })),
        
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#ffffff',
                    'border-width': 2,
                    'border-color': '#ddd',
                    'width': function(node) {
                        // Skip width override for annotation nodes (they have their own sizing)
                        if (node.data('isAnnotation')) {
                            return node.data('customWidth') || 120;
                        }
                        // Fixed width for all cards to ensure consistency
                        return 300;
                    },
                    'height': function(node) {
                        // Skip height override for annotation nodes (they have their own sizing)
                        if (node.data('isAnnotation')) {
                            return node.data('customHeight') || 120;
                        }
                        
                        const isManualCard = node.data('isManualCard') || false;
                        
                        if (isManualCard) {
                            // Same padding logic as other cards, but with double padding
                            const measuredHeight = getMeasuredTextHeight(node);
                            return Math.max(140, measuredHeight + 40); // Double padding for larger text
                        }
                        
                        // Use the ruler to get exact height for other cards
                        const measuredHeight = getMeasuredTextHeight(node);
                        return Math.max(140, measuredHeight + 10); // Standard padding, 140px minimum
                    },
                    'shape': 'round-rectangle',
                    'label': function(node) {
                        const title = node.data('title') || '';
                        const text = node.data('text') || '';
                        const tags = node.data('tags') || [];
                        const isManualCard = node.data('isManualCard') || false;
                        
                        
                        // Simple markdown conversion for display
                        let displayText = text;
                        displayText = displayText.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove **bold**
                        displayText = displayText.replace(/\*(.*?)\*/g, '$1'); // Remove *italic*
                        displayText = displayText.replace(/`(.*?)`/g, '$1'); // Remove `code`
                        displayText = displayText.replace(/^- /gm, '• '); // Convert - to bullets
                        
                        // Apply subtle orphan prevention using non-breaking spaces
                        displayText = preventOrphansSubtly(displayText);
                        
                        // Add tags at the bottom if they exist (filter out PDF filename tags)
                        let tagDisplay = '';
                        if (tags.length > 0) {
                            // Filter out tags that look like PDF filenames (author-year-title format)
                            const visibleTags = tags.filter(tag => {
                                // Hide tags that match PDF filename pattern: Author-YYYY-title-words
                                const pdfPattern = /^[A-Za-z\-]+\-\d{4}\-[a-z\-]+$/;
                                return !pdfPattern.test(tag);
                            });
                            
                            if (visibleTags.length > 0) {
                                tagDisplay = '\n\n' + visibleTags.map(tag => `#${tag}`).join(' ');
                            }
                        }
                        
                        // For manually created cards, show ONLY text (no title processing)
                        // For imported cards, show title in caps + text
                        const mainText = (isManualCard || !title) ? displayText : `${title.toUpperCase()}\n\n${displayText}`;
                        return mainText + tagDisplay;
                    },
                    'text-wrap': 'wrap',
                    'text-max-width': 285, // Fixed 285px for all cards to match getMeasuredTextHeight ruler
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': function(node) {
                        const isImported = node.data('export_source') === 'pdf_extractor' || 
                                         node.data('source_file') || 
                                         node.data('matched_terms');
                        const isWelcomeCard = node.id().startsWith('welcome-');
                        
                        // Imported cards and welcome cards get 18px
                        if (isImported || isWelcomeCard) {
                            return 18;
                        }
                        
                        // ALL other cards (manual) get 23px
                        return 23;
                    },
                    'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    'color': '#333'
                }
            },
            {
                selector: 'node.search-match',
                style: {
                    'background-color': '#fff9c4',
                    'border-color': '#f57f17',
                    'border-width': 2
                }
            },
            {
                selector: 'node.tag-filtered',
                style: {
                    'background-color': '#f0f0f0',
                    'border-color': '#ddd',
                    'opacity': 0.3
                }
            },
            {
                selector: 'node.search-non-match',
                style: {
                    'opacity': 0.3
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-color': '#1565c0',
                    'border-width': 4
                }
            },
            {
                selector: 'node.pinned',
                style: {
                    'border-color': '#2e7d32',
                    'border-width': 4,
                    'background-color': '#c8e6c9'
                }
            },
            // ====================================================================================================
            // 📷 IMAGE NODE STYLES - Post-it feel (~10cm) with image background
            // ====================================================================================================
            {
                selector: 'node[type="image"]',
                style: {
                    'width': 300, // Same as regular cards
                    'height': function(node) {
                        // Use the same logic as getMeasuredTextHeight for consistency
                        return getMeasuredTextHeight(node);
                    },
                    'background-image': 'data(imageData)',
                    'background-fit': 'cover',
                    'background-color': function(node) {
                        // Support color styling for image cards
                        const cardColor = node.data('cardColor');
                        if (cardColor) {
                            const colorValue = getCardColorValue(cardColor, getCurrentTheme());
                            return colorValue;
                        }
                        return '#ffffff'; // Default white background
                    },
                    'border-width': function(node) {
                        // Thicker border when colored to show the color better
                        const cardColor = node.data('cardColor');
                        return cardColor ? 6 : 3;
                    },
                    'border-color': function(node) {
                        // Use the card color for border, or default gray
                        const cardColor = node.data('cardColor');
                        if (cardColor) {
                            const colorValue = getCardColorValue(cardColor, getCurrentTheme());
                            return colorValue;
                        }
                        return '#ddd';
                    },
                    'shape': 'round-rectangle',
                    'label': function(node) {
                        // Only show annotation icon if present, no filename
                        const hasAnnotation = (node.data('annotation') || '').length > 0;
                        return hasAnnotation ? '📝' : '';
                    },
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'text-background-color': 'rgba(255, 255, 255, 0.9)',
                    'text-background-padding': '4px',
                    'text-background-shape': 'round-rectangle',
                    'font-size': '14px',
                    'font-weight': 'bold',
                    'color': '#333',
                    'text-wrap': 'wrap',
                    'text-max-width': 280
                }
            },
            {
                selector: 'node[type="image"]:selected',
                style: {
                    'border-color': '#1565c0',
                    'border-width': 5
                }
            },
            {
                selector: 'node[type="image"].search-match',
                style: {
                    'border-color': '#f57f17',
                    'border-width': 4
                }
            },
            // ====================================================================================================
            // 🎨 ANNOTATION STYLES
            // ====================================================================================================
            {
                selector: 'node.annotation-shape',
                style: {
                    'width': function(node) {
                        // Allow dynamic width for annotation shapes
                        return node.data('customWidth') || 120;
                    },
                    'height': function(node) {
                        // Allow dynamic height for annotation shapes
                        return node.data('customHeight') || 120;
                    },
                    'background-color': '#ff6b6b',
                    'border-width': 3,
                    'border-color': '#444',
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '32px',
                    'color': '#333',
                    'text-wrap': 'none',
                    'z-index': function(node) {
                        // Cytoscape z-index must be non-negative integers
                        // 0 = background, 1 = normal, 2 = foreground
                        const zIndex = node.data('customZIndex');
                        if (zIndex === -1) return 0; // Background
                        if (zIndex === 0) return 1;  // Normal
                        if (zIndex === 1) return 2;  // Foreground
                        return 1; // Default to normal
                    },
                    'shape': function(node) {
                        const shape = node.data('shape') || 'rectangle';
                        const shapeMap = {
                            'rect': 'rectangle',
                            'circle': 'ellipse',
                            'triangle': 'triangle',
                            'diamond': 'diamond',
                            'star': 'star',
                            'hexagon': 'hexagon'
                        };
                        return shapeMap[shape] || 'rectangle';
                    }
                }
            },
            {
                selector: 'node.annotation-text',
                style: {
                    'width': function(node) {
                        // Allow dynamic width for annotation text
                        return node.data('customWidth') || 180;
                    },
                    'height': function(node) {
                        // Allow dynamic height for annotation text
                        return node.data('customHeight') || 90;
                    },
                    'background-color': '#fff',
                    'border-width': 2,
                    'border-color': '#ccc',
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '18px',
                    'color': '#333',
                    'text-wrap': 'wrap',
                    'text-max-width': function(node) {
                        // Adjust text width based on node width
                        const width = node.data('customWidth') || 180;
                        return (width - 10) + 'px';
                    },
                    'shape': 'rectangle'
                }
            },
            {
                selector: 'edge.annotation-connection',
                style: {
                    'width': 5,
                    'line-color': '#ff6b6b',
                    'target-arrow-color': '#ff6b6b',
                    'arrow-scale': 1.8,
                    'curve-style': 'bezier',
                    'control-point-step-size': 40
                }
            }
        ],
        
        layout: {
            name: 'preset'
        },
        
        // Enable panning and zooming
        zoomingEnabled: true,
        userZoomingEnabled: true,
        wheelSensitivity: 0.3,
        minZoom: 0.1,
        maxZoom: 3,
        panningEnabled: false,  // Start with panning disabled
        userPanningEnabled: true,  // Keep user controls available
        boxSelectionEnabled: true,
        selectionType: 'additive',  // Allow multiple selection
        
        // Configure user interaction
        autoungrabify: false,
        autounselectify: false
    });
    
    // Make nodes draggable
    cy.nodes().grabify();
    
    // Save state before dragging starts (for undo support)
    cy.on('grab', 'node', function(evt) {
        saveState();
    });
    
    // Double-click to edit card
    cy.on('dblclick', 'node', function(evt) {
        const node = evt.target;
        console.log('🖱️ Double-click on node:', node.id(), 'isAnnotation:', node.data('isAnnotation'), 'classes:', node.classes());
        
        if (node.data('isAnnotation') && node.hasClass('annotation-text')) {
            console.log('📝 Opening text editor for annotation text...');
            editAnnotationText(node);
        } else {
            console.log('📝 Opening card editor for regular node...');
            editCard(node);
        }
    });
    
    // Right-click context menu
    cy.on('cxttap', 'node', function(evt) {
        evt.preventDefault();
        const node = evt.target;
        showContextMenu(evt.originalEvent || evt, node);
    });
    
    // Touch and hold to edit card on mobile
    let touchTimer = null;
    let touchedNode = null;
    
    cy.on('touchstart', 'node', function(evt) {
        touchedNode = evt.target;
        touchTimer = setTimeout(() => {
            if (touchedNode) {
                editCard(touchedNode);
                touchedNode = null;
            }
        }, 1000); // 1 second hold
    });
    
    cy.on('touchend touchmove', 'node', function(evt) {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
        if (evt.type === 'touchend') {
            touchedNode = null;
        }
    });
    
    // Update selection info when selection changes
    cy.on('select unselect', 'node', function(evt) {
        updateSelectionInfo();
    });
    
    // ====================================================================================================
    // 🎨 ANNOTATION EVENT HANDLERS
    // ====================================================================================================
    
    // Canvas click for creating annotations
    cy.on('tap', function(evt) {
        if (!annotationToolbarVisible || annotationMode === 'select') return;
        
        // Only create on background, not on nodes
        if (evt.target === cy) {
            const position = evt.position || evt.cyPosition;
            
            if (['rect', 'circle', 'triangle', 'diamond', 'star', 'hexagon'].includes(annotationMode)) {
                createShapeAnnotation(annotationMode, position);
            } else if (['text-small', 'text-medium', 'text-large'].includes(annotationMode)) {
                createTextAnnotation(annotationMode, position);
            }
        }
    });
    
    // Node click for connections
    cy.on('tap', 'node', function(evt) {
        if (!annotationToolbarVisible) return;
        
        const node = evt.target;
        
        if (annotationMode === 'arrow' || annotationMode === 'line') {
            if (!connectionStartNode) {
                // First click - select start node
                connectionStartNode = node;
                node.style('border-color', '#ff0000');
                node.style('border-width', '4px');
                console.log('🎯 Connection start node selected:', node.id());
            } else if (connectionStartNode !== node) {
                // Second click - create connection
                createConnection(connectionStartNode, node, annotationMode);
                
                // Reset start node styling
                connectionStartNode.style('border-color', '');
                connectionStartNode.style('border-width', '');
                connectionStartNode = null;
                
                console.log('✅ Connection created');
            }
        }
    });
    
    // Track mouse position for arrangement positioning
    cy.on('mousemove', function(evt) {
        lastMousePosition.x = evt.originalEvent.clientX;
        lastMousePosition.y = evt.originalEvent.clientY;
    });
    
    // Also track mouse on the container directly
    document.addEventListener('mousemove', function(evt) {
        lastMousePosition.x = evt.clientX;
        lastMousePosition.y = evt.clientY;
        // Debug: uncomment to see if mouse tracking works
        // console.log('Mouse moved to:', evt.clientX, evt.clientY);
    });
    
    // ====================================================================================================
    // 🎨 ANNOTATION TOOLBAR EVENT LISTENERS
    // ====================================================================================================
    
    // Add click listeners to annotation tools
    document.querySelectorAll('.annotation-tool').forEach(tool => {
        tool.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const toolType = tool.dataset.tool;
            
            if (toolType.startsWith('color-')) {
                // Color selection
                const colors = {
                    'color-red': '#ff6b6b',
                    'color-blue': '#4ecdc4', 
                    'color-green': '#45b7d1',
                    'color-yellow': '#f9ca24',
                    'color-purple': '#a55eea'
                };
                setAnnotationColor(colors[toolType]);
            } else if (toolType === 'resize') {
                // Toggle resize mode
                toggleResizeMode();
                tool.classList.toggle('active', resizeMode);
            } else {
                // Tool selection
                setAnnotationMode(toolType);
            }
        });
    });
    
    // Starta med panorering på, så att zoom fungerar direkt
    cy.panningEnabled(true);
    
    // Auto-center on mobile devices after initial load
    if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) {
        setTimeout(() => {
            cy.fit(null, 50); // Fit all nodes with 50px padding
            cy.center(); // Center the view
            console.log('Mobile auto-center applied');
        }, 500); // Small delay to ensure nodes are rendered
    }
    
    // Re-center when orientation changes on mobile
    window.addEventListener('orientationchange', function() {
        if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) {
            setTimeout(() => {
                cy.fit(null, 50);
                cy.center();
                console.log('Mobile orientation-change auto-center applied');
            }, 300);
        }
    });

    // Hantera Ctrl+drag för att växla mellan panorering och markeringsruta
    cy.on('mousedown', function(evt) {
        if (evt.originalEvent.ctrlKey) {
            // Med Ctrl nedtryckt: aktivera panorering, inaktivera markeringsruta
            cy.boxSelectionEnabled(false);
            cy.panningEnabled(true);
        } else {
            // Utan Ctrl: inaktivera panorering, aktivera markeringsruta
            cy.boxSelectionEnabled(true);
            cy.panningEnabled(false);
        }
    });

    cy.on('mouseup', function(evt) {
        // Återställ alltid till att panorering är på, så att zoom fungerar igen
        cy.panningEnabled(true);
        cy.boxSelectionEnabled(true);
    });

    // ====================================================================================================
    // 📷 IMAGE SYSTEM EVENT LISTENERS - Integration with existing architecture
    // ====================================================================================================
    
    // File input change handlers
    document.getElementById('hiddenCameraInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleImageFiles(e.target.files);
            // Reset input to allow same file again
            e.target.value = '';
        }
    });
    
    document.getElementById('hiddenGalleryInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleImageFiles(e.target.files);
            // Reset input to allow same file again
            e.target.value = '';
        }
    });

    // Zotero HTML import file input handler
    document.getElementById('zoteroHtmlInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            importFromZoteroHTML(e.target.files[0]);
            // Reset input to allow same file again
            e.target.value = '';
        }
    });

    // Paste event listener for Ctrl+V images
    document.addEventListener('paste', handlePasteImage);
    
    // Long press on canvas to paste clipboard content (text or image)
    let canvasPressTimer = null;
    const cyContainer = document.getElementById('cy');
    
    // Canvas background long press using Cytoscape events
    let backgroundTouchTimer = null;
    let backgroundTouchPos = null;
    
    // Touch handling on canvas background (not on nodes)
    cy.on('touchstart', function(evt) {
        console.log('DEBUG touchstart:', evt.target, 'target===cy:', evt.target === cy, 'touches:', evt.originalEvent?.touches?.length);
        if (!evt.target || evt.target === cy) { // Background touch
            const touch = evt.originalEvent.touches[0];
            backgroundTouchPos = { clientX: touch.clientX, clientY: touch.clientY };
            let backgroundTouchStartTime = Date.now();
            console.log('DEBUG background touchstart, pos:', backgroundTouchPos);
            
            backgroundTouchTimer = setTimeout(() => {
                console.log('DEBUG LONG PRESS timeout fired, isMobileDevice():', isMobileDevice(), 'backgroundTouchPos:', backgroundTouchPos);
                if (isMobileDevice() && backgroundTouchPos) {
                    // Check if we have selected cards
                    const selectedNodes = cy.$('node:selected');
                    console.log('DEBUG selectedNodes.length:', selectedNodes.length);
                    if (selectedNodes.length > 0) {
                        // Show mobile card menu for selected cards
                        console.log('DEBUG calling showMobileCardMenu with pos:', backgroundTouchPos, 'nodeId:', selectedNodes[0].id());
                        showMobileCardMenu(backgroundTouchPos, selectedNodes[0].id());
                    } else {
                        // Show image source menu if no cards selected
                        console.log('DEBUG calling showImageSourceMenu');
                        showImageSourceMenu(backgroundTouchPos.clientX, backgroundTouchPos.clientY);
                    }
                }
                backgroundTouchStartTime = null; // Mark as long press handled
            }, 1000);
            
            // Store start time for short tap detection
            evt._boardTouchStartTime = backgroundTouchStartTime;
        }
    });
    
    cy.on('touchend', function(evt) {
        if (backgroundTouchTimer) {
            clearTimeout(backgroundTouchTimer);
            backgroundTouchTimer = null;
        }
        
        if (backgroundTouchPos && evt._boardTouchStartTime && (!evt.target || evt.target === cy)) {
            const tapDuration = Date.now() - evt._boardTouchStartTime;
            console.log('DEBUG board background touch end, duration:', tapDuration);
            
            if (tapDuration < 300) { // Short tap
                console.log('DEBUG board background short tap - deselecting all cards');
                cy.nodes().unselect();
            }
        }
        
        backgroundTouchPos = null;
    });
    
    cy.on('touchmove', function(evt) {
        if (backgroundTouchTimer) {
            clearTimeout(backgroundTouchTimer);
            backgroundTouchTimer = null;
            backgroundTouchPos = null;
        }
    });
    
    // Desktop mouse handling on background
    cy.on('mousedown', function(evt) {
        if (!evt.target || evt.target === cy) { // Background click
            const mouseEvent = evt.originalEvent;
            let mouseDownTime = Date.now();
            
            canvasPressTimer = setTimeout(() => {
                if (!isMobileDevice()) {
                    pasteClipboardContent(mouseEvent.clientX, mouseEvent.clientY);
                }
                mouseDownTime = null; // Mark as long press handled
            }, 1000);
            
            evt._mouseDownTime = mouseDownTime;
        }
    });
    
    cy.on('mouseup', function(evt) {
        if (canvasPressTimer) {
            clearTimeout(canvasPressTimer);
            canvasPressTimer = null;
        }
        
        if (evt._mouseDownTime && (!evt.target || evt.target === cy)) {
            const clickDuration = Date.now() - evt._mouseDownTime;
            console.log('DEBUG board background click end, duration:', clickDuration);
            
            if (clickDuration < 300) { // Short click
                console.log('DEBUG board background short click - deselecting all cards');
                cy.nodes().unselect();
            }
        }
    });
    
    cy.on('mousemove', function(evt) {
        if (canvasPressTimer) {
            clearTimeout(canvasPressTimer);
            canvasPressTimer = null;
        }
    });
    
    // Drag and drop support (bonus functionality)
    // cyContainer already declared above
    cyContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    
    cyContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (files.length > 0) {
            handleImageFiles(files);
            console.log(`📷 ${files.length} bild(er) droppade`);
        }
    });
    
    // Background click events temporarily disabled to test zoom
    // TODO: Re-enable with zoom preservation
    
    // Disable context menu on right click
    cy.container().addEventListener('contextmenu', function(evt) {
        evt.preventDefault();
    });
    
    // ====================================================================================================
    // 🎯 SIMPLE RESIZE SYSTEM
    // ====================================================================================================
    
    // Setup simple resize functionality using mouse events
    console.log('🔄 Setting up simple resize functionality...');
    setupFallbackResize();
    
    
}

// Boolean search functionality
