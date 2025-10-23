        // Event listeners
        document.addEventListener('DOMContentLoaded', function() {
            initCytoscape();
            setupLinkBadges(); // Setup clickable link badges for Zotero cards
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
            isColumnView = !isColumnView;
            const btn = document.getElementById('viewToggleBtn');
            const cyContainer = document.getElementById('cy');
            const columnContainer = document.getElementById('columnView');
            
            if (isColumnView) {
                // Switch to column view
                btn.innerHTML = '🗺️ Brädvy';
                btn.title = 'Växla tillbaka till brädvy';
                cyContainer.style.display = 'none';
                columnContainer.style.display = 'block';
                renderColumnViewDebounced();
            } else {
                // Switch to board view
                btn.innerHTML = '📋 Kolumnvy';
                btn.title = 'Växla till kolumnvy';
                cyContainer.style.display = 'block';
                columnContainer.style.display = 'none';
            }
            
            // Save view state to localStorage
            localStorage.setItem('spatial-notes-view', isColumnView ? 'column' : 'board');
        }

        function convertMarkdownToHtml(text) {
            if (!text) return '';
            
            let html = text;
            // Convert markdown to HTML (opposite of what Cytoscape does)
            html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>'); // ### H3
            html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>'); // ## H2
            html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>'); // # H1
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // **bold**
            html = html.replace(/\*(.*?)\*/g, '<em>$1</em>'); // *italic*
            html = html.replace(/`(.*?)`/g, '<code>$1</code>'); // `code`
            html = html.replace(/~~(.*?)~~/g, '<del>$1</del>'); // ~~strikethrough~~
            // Convert markdown links [text](url) to clickable links
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #007acc; text-decoration: underline;" onclick="event.stopPropagation();">$1</a>');
            html = html.replace(/^- /gm, '• '); // Convert - to bullets
            html = html.replace(/\n/g, '<br>'); // Line breaks
            
            return html;
        }

        // Debounced render to avoid excessive updates
        // Setup column view background handlers (one time only)
        let columnBackgroundHandlersSetup = false;
        function setupColumnBackgroundHandlers() {
            if (columnBackgroundHandlersSetup) return;
            columnBackgroundHandlersSetup = true;
            
            const container = document.getElementById('columnContainer');
            
            if (isMobileDevice()) {
                let columnBackgroundTimer = null;
                let columnTouchPos = null;
                
                container.addEventListener('touchstart', (e) => {
                    // Only trigger if touching the background (not a card or card content)
                    const isCard = e.target.closest('.column-card');
                    const isBackground = !isCard && (e.target === container || 
                                        e.target.classList.contains('column-view') ||
                                        e.target.classList.contains('column-container') ||
                                        e.target.id === 'columnContainer');
                    console.log('DEBUG column background touchstart:', e.target, 'isBackground:', isBackground);
                    
                    if (isBackground) {
                        e.preventDefault(); // Prevent text selection on iPad
                        columnTouchPos = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
                        console.log('DEBUG column background touch detected, pos:', columnTouchPos);
                        let backgroundTouchStartTime = Date.now();
                        
                        columnBackgroundTimer = setTimeout(() => {
                            const selectedNodes = cy.$('node:selected');
                            console.log('DEBUG column background LONG PRESS timeout fired, selected nodes:', selectedNodes.length);
                            if (selectedNodes.length > 0 && columnTouchPos) {
                                // Show mobile card menu for selected cards
                                console.log('DEBUG calling showMobileCardMenu from column background');
                                showMobileCardMenu(columnTouchPos, selectedNodes[0].id());
                            }
                        }, 750);
                        
                        // Handle short tap on background to deselect all
                        const handleBackgroundTouchEnd = (endEvent) => {
                            if (columnBackgroundTimer) {
                                clearTimeout(columnBackgroundTimer);
                                columnBackgroundTimer = null;
                            }
                            
                            const tapDuration = Date.now() - backgroundTouchStartTime;
                            console.log('DEBUG background touch end, duration:', tapDuration);
                            
                            if (tapDuration < 300) { // Short tap
                                console.log('DEBUG background short tap - deselecting all cards');
                                cy.nodes().unselect();
                                document.querySelectorAll('.column-card').forEach(card => {
                                    card.classList.remove('selected');
                                });
                            }
                            
                            columnTouchPos = null;
                            container.removeEventListener('touchend', handleBackgroundTouchEnd);
                            container.removeEventListener('touchmove', handleBackgroundTouchEnd);
                        };
                        
                        container.addEventListener('touchend', handleBackgroundTouchEnd, { once: true });
                        container.addEventListener('touchmove', handleBackgroundTouchEnd, { once: true });
                    }
                }, { passive: false });
            } else {
                // Desktop: Simple click handler for background
                container.addEventListener('click', (e) => {
                    const isCard = e.target.closest('.column-card');
                    if (!isCard) {
                        console.log('DEBUG desktop background click - deselecting all cards');
                        cy.nodes().unselect();
                        document.querySelectorAll('.column-card').forEach(card => {
                            card.classList.remove('selected');
                        });
                    }
                });
            }
        }

        let renderColumnViewTimeout = null;
        function renderColumnView() {
            const container = document.getElementById('columnContainer');
            container.innerHTML = '';
            
            
            // Setup background handlers once
            setupColumnBackgroundHandlers();
            
            if (!cy) return;
            
            // Apply temporal markings before rendering
            if (typeof applyTemporalMarkings === 'function') {
                applyTemporalMarkings();
            }
            
            // Get all nodes and apply automatic sorting
            let nodes = cy.nodes().stdFilter(function(node) {
                return !node.data('isAnnotation'); // Exclude annotation nodes
            });
            
            // Apply sorting based on current sort preference
            nodes = sortColumnViewNodes(nodes);
            
            // Use document fragment for better performance
            const fragment = document.createDocumentFragment();
            nodes.forEach(node => {
                const cardDiv = createColumnCard(node);
                fragment.appendChild(cardDiv);
            });
            container.appendChild(fragment);
            
            // Apply current search highlighting
            updateColumnViewSearch();
        }
        
        function renderColumnViewDebounced() {
            if (renderColumnViewTimeout) {
                clearTimeout(renderColumnViewTimeout);
            }
            renderColumnViewTimeout = setTimeout(renderColumnView, 16); // ~60fps
        }

        // Column view sorting function
        let currentColumnSort = 'creation'; // default sort
        function sortColumnViewNodes(nodes) {
            const nodeArray = nodes.toArray();
            
            switch(currentColumnSort) {
                case 'alphabetical':
                    return nodeArray.sort((a, b) => {
                        const aText = (a.data('title') || a.data('text') || '').toLowerCase();
                        const bText = (b.data('title') || b.data('text') || '').toLowerCase();
                        return aText.localeCompare(bText);
                    });
                
                case 'reverse-alphabetical':
                    return nodeArray.sort((a, b) => {
                        const aText = (a.data('title') || a.data('text') || '').toLowerCase();
                        const bText = (b.data('title') || b.data('text') || '').toLowerCase();
                        return bText.localeCompare(aText);
                    });
                
                case 'creation':
                    return nodeArray.sort((a, b) => {
                        // Sort by ID (assuming timestamp-based IDs)
                        return a.id().localeCompare(b.id());
                    });
                
                case 'reverse-creation':
                    return nodeArray.sort((a, b) => {
                        return b.id().localeCompare(a.id());
                    });
                
                case 'tags':
                    return nodeArray.sort((a, b) => {
                        const aTags = (a.data('tags') || []).join(' ').toLowerCase();
                        const bTags = (b.data('tags') || []).join(' ').toLowerCase();
                        return aTags.localeCompare(bTags);
                    });

                case 'color':
                    return nodeArray.sort((a, b) => {
                        const aColor = a.data('cardColor') || '';
                        const bColor = b.data('cardColor') || '';
                        
                        // Same color order as background-color: röd, orange, gul, lila, blå, vit, grön, grå
                        const colorOrder = {
                            'card-color-3': 1, // röd
                            'card-color-2': 2, // orange  
                            'card-color-4': 3, // gul
                            'card-color-5': 4, // lila
                            'card-color-6': 5, // blå
                            'card-color-8': 6, // vit
                            'card-color-1': 7, // grön
                            'card-color-7': 8, // grå
                            '': 9              // ofärgad (kommer sist)
                        };
                        
                        const aPriority = colorOrder[aColor] || 9;
                        const bPriority = colorOrder[bColor] || 9;
                        return aPriority - bPriority;
                    });

                case 'tagged-date':
                    return nodeArray.sort((a, b) => {
                        const aText = a.data('title') + ' ' + a.data('text');
                        const bText = b.data('title') + ' ' + b.data('text');
                        
                        // Extract @yymmdd dates
                        const aDateMatch = aText.match(/@(\d{6})/);
                        const bDateMatch = bText.match(/@(\d{6})/);
                        
                        const aDate = aDateMatch ? aDateMatch[1] : '999999'; // No date = last
                        const bDate = bDateMatch ? bDateMatch[1] : '999999';
                        
                        return aDate.localeCompare(bDate);
                    });

                case 'reverse-tagged-date':
                    return nodeArray.sort((a, b) => {
                        const aText = a.data('title') + ' ' + a.data('text');
                        const bText = b.data('title') + ' ' + b.data('text');
                        
                        // Extract @yymmdd dates
                        const aDateMatch = aText.match(/@(\d{6})/);
                        const bDateMatch = bText.match(/@(\d{6})/);
                        
                        const aDate = aDateMatch ? aDateMatch[1] : '000000'; // No date = first
                        const bDate = bDateMatch ? bDateMatch[1] : '000000';
                        
                        return bDate.localeCompare(aDate);
                    });

                case 'importance':
                    return nodeArray.sort((a, b) => {
                        const aText = a.data('title') + ' ' + a.data('text');
                        const bText = b.data('title') + ' ' + b.data('text');
                        const aTags = a.data('tags') || [];
                        const bTags = b.data('tags') || [];
                        
                        // Check for search matches OR selected cards (after Enter)
                        const aIsSearchMatch = a.hasClass('search-match') || a.data('searchMatch') || a.selected();
                        const bIsSearchMatch = b.hasClass('search-match') || b.data('searchMatch') || b.selected();
                        
                        // Prioritize search matches and selected cards
                        if (aIsSearchMatch && !bIsSearchMatch) return -1;
                        if (!aIsSearchMatch && bIsSearchMatch) return 1;
                        
                        // Check for #todo tag
                        const aHasTodo = aTags.some(tag => tag.toLowerCase() === 'todo');
                        const bHasTodo = bTags.some(tag => tag.toLowerCase() === 'todo');
                        
                        // Extract @yymmdd dates
                        const aDateMatch = aText.match(/@(\d{6})/);
                        const bDateMatch = bText.match(/@(\d{6})/);
                        
                        const aDate = aDateMatch ? aDateMatch[1] : '999999'; // No date = last
                        const bDate = bDateMatch ? bDateMatch[1] : '999999';
                        
                        // Priority: oldest date + #todo first, then by date, then no date
                        if (aHasTodo && !bHasTodo) return -1; // a has todo, b doesn't
                        if (!aHasTodo && bHasTodo) return 1;  // b has todo, a doesn't
                        
                        // Both have todo or both don't have todo - sort by date (oldest first)
                        return aDate.localeCompare(bDate);
                    });

                case 'background-color':
                    return nodeArray.sort((a, b) => {
                        // Check for search matches OR selected cards (after Enter)
                        const aIsSearchMatch = a.hasClass('search-match') || a.data('searchMatch') || a.selected();
                        const bIsSearchMatch = b.hasClass('search-match') || b.data('searchMatch') || b.selected();
                        
                        // Prioritize search matches and selected cards
                        if (aIsSearchMatch && !bIsSearchMatch) return -1;
                        if (!aIsSearchMatch && bIsSearchMatch) return 1;
                        
                        const aColor = a.data('cardColor') || '';
                        const bColor = b.data('cardColor') || '';
                        
                        // Color priority: röd, orange, gul, lila, blå, vit, grön, grå
                        const colorOrder = {
                            'card-color-3': 1, // röd
                            'card-color-2': 2, // orange  
                            'card-color-4': 3, // gul
                            'card-color-5': 4, // lila
                            'card-color-6': 5, // blå
                            'card-color-8': 6, // vit
                            'card-color-1': 7, // grön
                            'card-color-7': 8, // grå
                            '': 9              // ofärgad (kommer sist)
                        };
                        
                        const aPriority = colorOrder[aColor] || 9;
                        const bPriority = colorOrder[bColor] || 9;
                        
                        return aPriority - bPriority;
                    });

                case 'today-first':
                    return nodeArray.sort((a, b) => {
                        const aTodayScore = getTodayScore(a);
                        const bTodayScore = getTodayScore(b);
                        return bTodayScore - aTodayScore; // Higher score = today content = first
                    });
                
                default:
                    return nodeArray;
            }
        }

        // Function to change column view sorting
        function setColumnViewSort(sortType) {
            currentColumnSort = sortType;
            console.log('Column view sort set to:', sortType);
            
            if (isColumnView) {
                renderColumnViewDebounced();
                
                // Show feedback
                const statusDiv = document.getElementById('selectionInfo');
                if (statusDiv) {
                    let sortName = 'Okänd sortering';
                    switch(sortType) {
                        case 'alphabetical': sortName = 'A → Z'; break;
                        case 'reverse-alphabetical': sortName = 'Z → A'; break;
                        case 'creation': sortName = 'Äldst → Nyast'; break;
                        case 'reverse-creation': sortName = 'Nyast → Äldst'; break;
                        case 'tags': sortName = 'Sorterat efter taggar'; break;
                        case 'color': sortName = 'Färg 1→6'; break;
                        case 'tagged-date': sortName = '@datum Äldst → Nyast'; break;
                        case 'reverse-tagged-date': sortName = '@datum Nyast → Äldst'; break;
                        case 'importance': sortName = 'Viktighet (äldsta #todo först)'; break;
                        case 'background-color': sortName = 'Bakgrundsfärg (röd→grå)'; break;
                        case 'today-first': sortName = 'Idag först'; break;
                    }
                    statusDiv.textContent = `Kolumnvy sorterad: ${sortName}`;
                    statusDiv.classList.add('visible');
                    
                    // Auto-hide after 3 seconds
                    setTimeout(() => {
                        statusDiv.classList.remove('visible');
                    }, 3000);
                }
            }
            
            // Close sort menu
            closeSortMenu();
        }

        function createColumnCard(node) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'column-card';
            cardDiv.dataset.nodeId = node.id();
            
            // Apply current state classes
            if (node.hasClass('search-match')) {
                cardDiv.classList.add('search-match');
            }
            if (node.selected()) {
                cardDiv.classList.add('selected');
            }
            
            // Apply card color if it exists
            const cardColor = node.data('cardColor');
            if (cardColor) {
                const currentTheme = getCurrentTheme();
                const color = getCardColorValue(cardColor, currentTheme);
                if (color) {
                    cardDiv.style.backgroundColor = color;
                }
            }

            // Apply temporal markings if they exist
            const temporalBorderWidth = node.data('temporalBorderWidth');
            const temporalBorderColor = node.data('temporalBorderColor');
            if (temporalBorderWidth && temporalBorderColor) {
                cardDiv.style.borderWidth = temporalBorderWidth + 'px';
                cardDiv.style.borderColor = temporalBorderColor;
                cardDiv.style.borderStyle = 'solid';
            }
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'column-card-content';
            
            // Check if card should show image or text
            const nodeId = node.id();
            const showText = columnCardStates.get(nodeId) || false;
            const hasImage = node.data('imageData');
            
            if (hasImage && !showText) {
                // Show image ONLY - no text/annotation in image mode
                const img = document.createElement('img');
                img.src = node.data('imageData');
                img.className = 'column-card-image';
                img.alt = node.data('originalFileName') || 'Bild';
                contentDiv.appendChild(img);
            } else if (hasImage && showText) {
                // Show text/annotation ONLY - no image in text mode
                const annotation = node.data('annotation');
                if (annotation) {
                    const displayText = convertMarkdownToHtml(annotation);
                    contentDiv.innerHTML = displayText;
                }
            } else {
                // Show text content
                const title = node.data('title') || '';
                const text = node.data('text') || '';
                const isManualCard = node.data('isManualCard') || false;
                
                let displayText = '';
                if (title && !isManualCard) {
                    displayText = `<strong>${title}</strong><br><br>`;
                }
                displayText += convertMarkdownToHtml(text);
                
                contentDiv.innerHTML = displayText;
            }
            
            // Add tags
            const tags = node.data('tags') || [];
            if (tags.length > 0) {
                const visibleTags = tags.filter(tag => {
                    const pdfPattern = /^[A-Za-z\-]+\-\d{4}\-[a-z\-]+$/;
                    return !pdfPattern.test(tag);
                });
                
                if (visibleTags.length > 0) {
                    const tagsDiv = document.createElement('div');
                    tagsDiv.className = 'column-card-tags';
                    visibleTags.forEach(tag => {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'tag';
                        tagSpan.textContent = '#' + tag;
                        tagsDiv.appendChild(tagSpan);
                    });
                    contentDiv.appendChild(tagsDiv);
                }
            }
            
            // Create wrapper for content and selection area
            const cardWrapper = document.createElement('div');
            cardWrapper.style.cssText = `
                display: flex;
                width: 100%;
                min-height: 100%;
            `;
            
            // Content takes most of the space
            contentDiv.style.cssText = `
                flex: 1;
                min-width: 0;
                user-select: text;
                -webkit-user-select: text;
            `;
            
            // Create selection area on the right (40px wide)
            const selectionArea = document.createElement('div');
            selectionArea.className = 'column-card-selection-area';
            selectionArea.style.cssText = `
                width: 40px;
                min-height: 60px;
                background: transparent;
                cursor: pointer;
                flex-shrink: 0;
                user-select: none;
                -webkit-user-select: none;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.3;
                transition: opacity 0.2s;
            `;
            
            // Add visual indicator that changes based on selection state
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                width: 12px; 
                height: 12px; 
                border-radius: 50%; 
                border: 2px solid currentColor;
                background: ${node.selected() ? 'currentColor' : 'transparent'};
                transition: all 0.2s;
            `;
            selectionArea.appendChild(indicator);
            
            // Update indicator when selection changes
            const updateIndicator = () => {
                if (cardDiv.classList.contains('selected')) {
                    indicator.style.background = 'currentColor';
                    selectionArea.style.opacity = '0.8';
                } else {
                    indicator.style.background = 'transparent';
                    selectionArea.style.opacity = '0.3';
                }
            };
            
            // Initial state
            updateIndicator();
            
            // Hover effect for desktop
            selectionArea.addEventListener('mouseenter', () => {
                selectionArea.style.opacity = '0.8';
            });
            selectionArea.addEventListener('mouseleave', updateIndicator);
            
            cardWrapper.appendChild(contentDiv);
            cardWrapper.appendChild(selectionArea);
            cardDiv.appendChild(cardWrapper);
            
            // Add selection click handler to the selection area
            selectionArea.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log('DEBUG selection area click:', node.id(), 'isMobileDevice():', isMobileDevice());
                console.log('DEBUG mobile tap -> toggleColumnCardSelection');
                toggleColumnCardSelection(node.id(), cardDiv);
            });
            
            // Add click handlers for content area (desktop functionality)
            contentDiv.addEventListener('click', (e) => {
                if (!isMobileDevice()) {
                    console.log('DEBUG content area click (desktop):', node.id(), 'ctrlKey:', e.ctrlKey, 'metaKey:', e.metaKey);
                    if (e.ctrlKey || e.metaKey) {
                        // Ctrl+click for multi-select (desktop)
                        console.log('DEBUG ctrl+click -> toggleColumnCardSelection');
                        toggleColumnCardSelection(node.id(), cardDiv);
                    } else if (hasImage) {
                        // Desktop: Toggle between image and text for image cards
                        const currentState = columnCardStates.get(nodeId) || false;
                        columnCardStates.set(nodeId, !currentState);
                        
                        // Re-render just this card
                        const newCard = createColumnCard(node);
                        cardDiv.parentNode.replaceChild(newCard, cardDiv);
                    } else {
                        // Desktop: Select single card
                        selectColumnCard(node.id(), cardDiv);
                    }
                }
                // On mobile, content area clicks do nothing (avoid text selection conflicts)
            });
            
            // Add double-click handler for editing
            cardDiv.addEventListener('dblclick', (e) => {
                e.preventDefault();
                editCard(node); // Reuse existing edit function
            });

            // Add right-click context menu
            cardDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showColumnContextMenu(e, node.id());
            });
            
            // Add iPad/mobile long-press functionality for tagging and color change
            let longPressTimer = null;
            let touchStartTime = 0;
            let touchMoved = false;
            
            cardDiv.addEventListener('touchstart', (e) => {
                console.log('DEBUG column touchstart:', node.id(), 'touches:', e.touches?.length);
                touchStartTime = Date.now();
                touchMoved = false;
                
                // Set up long press detection (800ms)
                longPressTimer = setTimeout(() => {
                    console.log('DEBUG column long press timeout fired, touchMoved:', touchMoved);
                    if (!touchMoved) {
                        e.preventDefault();
                        // Show combined tag/color context menu for iPad
                        console.log('DEBUG calling showMobileCardMenu from column long press:', e.touches[0], node.id());
                        showMobileCardMenu(e.touches[0], node.id());
                    }
                }, 800);
            }, { passive: false });
            
            cardDiv.addEventListener('touchmove', () => {
                touchMoved = true;
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            });
            
            cardDiv.addEventListener('touchend', (e) => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                
                // If it was a quick tap (< 200ms) and didn't move, treat as normal click
                if (!touchMoved && (Date.now() - touchStartTime) < 200) {
                    // Trigger normal click behavior
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        clientX: e.changedTouches[0].clientX,
                        clientY: e.changedTouches[0].clientY
                    });
                    cardDiv.dispatchEvent(clickEvent);
                }
            });
            
            return cardDiv;
        }

        // Mobile/iPad context menu with tagging and color options
        function showMobileCardMenu(touch, nodeId) {
            console.log('DEBUG showMobileCardMenu called with touch:', touch, 'nodeId:', nodeId);
            // Remove any existing mobile menu
            const existingMenu = document.getElementById('mobileCardMenu');
            if (existingMenu) {
                document.body.removeChild(existingMenu);
                console.log('DEBUG removed existing menu');
            }
            
            const node = cy.getElementById(nodeId);
            
            // Ensure the target node is selected for tag operations
            if (!node.selected()) {
                console.log('DEBUG target node not selected, selecting it');
                node.select();
                // Update column view visual selection
                if (isColumnView) {
                    const cardDiv = document.querySelector(`[data-node-id="${nodeId}"]`);
                    if (cardDiv) {
                        cardDiv.classList.add('selected');
                    }
                }
            }
            
            const selectedNodes = cy.$('node:selected');
            const isMultipleSelected = selectedNodes.length > 1;
            const targetNodes = isMultipleSelected ? selectedNodes : cy.$(`#${nodeId}`);
            console.log('DEBUG node found:', !!node, 'selectedNodes.length:', selectedNodes.length, 'isMultipleSelected:', isMultipleSelected);
            
            // Create mobile menu
            const menu = document.createElement('div');
            menu.id = 'mobileCardMenu';
            menu.style.cssText = `
                position: fixed;
                left: ${Math.min(touch.clientX, window.innerWidth - 280)}px;
                top: ${Math.min(touch.clientY, window.innerHeight - 400)}px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                z-index: 10000;
                min-width: 260px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 16px;
                padding: 12px 0;
            `;
            
            const targetText = isMultipleSelected ? `${selectedNodes.length} kort` : '1 kort';
            
            menu.innerHTML = `
                <div style="padding: 8px 16px; font-weight: bold; color: #666; border-bottom: 1px solid #eee;">
                    ${targetText}
                </div>
                
                <!-- Color Section -->
                <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #333;">Färg</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;" id="mobileColorGrid">
                    </div>
                    <div style="margin-top: 8px;">
                        <div class="mobile-clear-color" style="background: #f5f5f5; padding: 6px 12px; border-radius: 16px; text-align: center; cursor: pointer; border: 1px solid #ddd;">Ta bort färg</div>
                    </div>
                </div>
                
                <!-- Tags Section -->
                <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #333;">Taggar</div>
                    <div class="mobile-menu-item" data-action="add-tag" style="padding: 8px 12px; cursor: pointer; border-radius: 8px; margin-bottom: 4px;">➕ Lägg till tagg</div>
                    <div class="mobile-menu-item" data-action="remove-tag" style="padding: 8px 12px; cursor: pointer; border-radius: 8px;">➖ Ta bort tagg</div>
                </div>

                <!-- Pin Section -->
                <div style="padding: 12px 16px;">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #333;">Pinning</div>
                    <div class="mobile-menu-item" data-action="toggle-pin" id="mobilePinToggle" style="padding: 8px 12px; cursor: pointer; border-radius: 8px;">📌 Pinna kort</div>
                </div>
            `;
            
            document.body.appendChild(menu);

            // Update pin button text based on current state
            const pinToggleBtn = menu.querySelector('#mobilePinToggle');
            const anyPinned = targetNodes.some(node => node.hasClass('pinned'));
            if (anyPinned) {
                pinToggleBtn.innerHTML = '📌 Ta bort pinning';
            } else {
                pinToggleBtn.innerHTML = '📌 Pinna kort';
            }

            // Create color dots dynamically with real colors
            const colorGrid = menu.querySelector('#mobileColorGrid');
            const currentTheme = getCurrentTheme();
            
            for (let i = 1; i <= 8; i++) {
                const colorValue = getCardColorValue(`card-color-${i}`, currentTheme);
                const colorDot = document.createElement('div');
                colorDot.className = 'mobile-color-dot';
                colorDot.dataset.color = i;
                colorDot.style.cssText = `
                    background: ${colorValue};
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: ${currentTheme === 'light' ? '#333' : '#fff'};
                    cursor: pointer;
                    border: 2px solid #ddd;
                `;
                colorDot.textContent = i;
                colorGrid.appendChild(colorDot);
            }
            
            // Add color click handlers
            menu.querySelectorAll('.mobile-color-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    const colorNum = dot.dataset.color;
                    const colorId = `card-color-${colorNum}`;
                    
                    targetNodes.forEach(node => {
                        node.data('cardColor', colorId);
                        const colorValue = getCardColorValue(colorId, getCurrentTheme());
                        node.style('background-color', colorValue);
                    });
                    
                    // Update column view if active
                    if (isColumnView) {
                        renderColumnViewDebounced();
                    }

                    // Show feedback
                    const statusDiv = document.getElementById('selectionInfo');
                    if (statusDiv) {
                        statusDiv.textContent = `Färgade ${targetNodes.length} kort med färg ${colorNum}`;
                        statusDiv.classList.add('visible');
                        setTimeout(() => statusDiv.classList.remove('visible'), 2000);
                    }

                    // Save immediately to prevent data loss from autosave/Drive sync
                    saveBoard();

                    document.body.removeChild(menu);
                });
            });
            
            // Clear color handler
            menu.querySelector('.mobile-clear-color').addEventListener('click', () => {
                targetNodes.forEach(node => {
                    removeCardColor(node);
                });

                if (isColumnView) {
                    renderColumnViewDebounced();
                }

                const statusDiv = document.getElementById('selectionInfo');
                if (statusDiv) {
                    statusDiv.textContent = `Tog bort färg från ${targetNodes.length} kort`;
                    statusDiv.classList.add('visible');
                    setTimeout(() => statusDiv.classList.remove('visible'), 2000);
                }

                // Save immediately to prevent data loss from autosave/Drive sync
                saveBoard();

                document.body.removeChild(menu);
            });
            
            // Tag and Pin action handlers
            menu.querySelectorAll('.mobile-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.dataset.action;
                    console.log('DEBUG mobile menu item clicked:', action);
                    if (action === 'add-tag') {
                        console.log('DEBUG calling addTagToSelected from mobile menu');
                        addTagToSelected();
                    } else if (action === 'remove-tag') {
                        console.log('DEBUG calling removeTagFromSelected from mobile menu');
                        removeTagFromSelected();
                    } else if (action === 'toggle-pin') {
                        console.log('DEBUG toggling pin for selected cards');
                        const anyPinned = targetNodes.some(node => node.hasClass('pinned'));
                        targetNodes.forEach(node => {
                            if (anyPinned) {
                                unpinCard(node);
                                node.grabify(); // Make draggable again
                            } else {
                                pinCard(node);
                                node.ungrabify(); // Make undraggable
                            }
                        });

                        // Update column view if active
                        if (isColumnView) {
                            renderColumnViewDebounced();
                        }

                        // Show feedback
                        const statusDiv = document.getElementById('selectionInfo');
                        if (statusDiv) {
                            const action = anyPinned ? 'Tog bort pinning från' : 'Pinnade';
                            statusDiv.textContent = `${action} ${targetNodes.length} kort`;
                            statusDiv.classList.add('visible');
                            setTimeout(() => statusDiv.classList.remove('visible'), 2000);
                        }

                        saveBoard();
                    }
                    document.body.removeChild(menu);
                });
            });
            
            // Close menu when clicking outside
            setTimeout(() => {
                const closeHandler = (e) => {
                    if (!menu.contains(e.target)) {
                        if (document.body.contains(menu)) {
                            document.body.removeChild(menu);
                        }
                        document.removeEventListener('click', closeHandler);
                        document.removeEventListener('touchstart', closeHandler);
                    }
                };
                document.addEventListener('click', closeHandler);
                document.addEventListener('touchstart', closeHandler);
            }, 100);
        }

        function toggleColumnCardSelection(nodeId, cardDiv) {
            const node = cy.getElementById(nodeId);
            console.log('DEBUG toggleColumnCardSelection:', nodeId, 'was selected:', node.selected());
            if (node.selected()) {
                node.unselect();
                cardDiv.classList.remove('selected');
                console.log('DEBUG unselected', nodeId);
            } else {
                node.select();
                cardDiv.classList.add('selected');
                console.log('DEBUG selected', nodeId);
            }
            console.log('DEBUG total selected after toggle:', cy.$('node:selected').length);
        }

        function selectColumnCard(nodeId, cardDiv) {
            console.log('DEBUG selectColumnCard called:', nodeId, 'clearing all selections first');
            // Deselect all
            cy.nodes().unselect();
            document.querySelectorAll('.column-card').forEach(card => {
                card.classList.remove('selected');
            });
            
            // Select this one
            const node = cy.getElementById(nodeId);
            node.select();
            cardDiv.classList.add('selected');
            console.log('DEBUG selectColumnCard completed, selected:', nodeId, 'total selected:', cy.$('node:selected').length);
        }

        function updateColumnViewSearch() {
            if (!isColumnView) return;
            
            document.querySelectorAll('.column-card').forEach(cardDiv => {
                const nodeId = cardDiv.dataset.nodeId;
                const node = cy.getElementById(nodeId);
                
                if (node.hasClass('search-match')) {
                    cardDiv.classList.add('search-match');
                } else {
                    cardDiv.classList.remove('search-match');
                }
            });
        }

        function getCurrentTheme() {
            if (document.body.classList.contains('dark-theme')) return 'dark';
            if (document.body.classList.contains('sepia-theme')) return 'sepia';
            if (document.body.classList.contains('eink-theme')) return 'eink';
            return 'light';
        }

        // Hook into existing search functions to update column view
        const originalPerformSearch = performSearch;
        performSearch = function(query) {
            const result = originalPerformSearch.call(this, query);
            updateColumnViewSearch();
            return result;
        };

        const originalClearSearch = clearSearch;
        clearSearch = function() {
            const result = originalClearSearch.call(this);
            updateColumnViewSearch();
            return result;
        };

        const originalPerformTagFilter = performTagFilter;
        performTagFilter = function() {
            const result = originalPerformTagFilter.apply(this, arguments);
            updateColumnViewSearch();
            return result;
        };

        const originalClearTagFilter = clearTagFilter;
        clearTagFilter = function() {
            const result = originalClearTagFilter.call(this);
            updateColumnViewSearch();
            return result;
        };

        // Function to update column view colors immediately
        function updateColumnViewColors() {
            if (!isColumnView) return;
            
            document.querySelectorAll('.column-card').forEach(cardDiv => {
                const nodeId = cardDiv.dataset.nodeId;
                const node = cy.getElementById(nodeId);
                const cardColor = node.data('cardColor');
                
                if (cardColor) {
                    const currentTheme = getCurrentTheme();
                    const color = getCardColorValue(cardColor, currentTheme);
                    if (color) {
                        cardDiv.style.backgroundColor = color;
                    }
                } else {
                    // Remove background color if no card color
                    cardDiv.style.backgroundColor = '';
                }
            });
        }

        // Function to update column view selections
        function updateColumnViewSelections() {
            if (!isColumnView) return;
            
            document.querySelectorAll('.column-card').forEach(cardDiv => {
                const nodeId = cardDiv.dataset.nodeId;
                const node = cy.getElementById(nodeId);
                
                if (node.selected()) {
                    cardDiv.classList.add('selected');
                } else {
                    cardDiv.classList.remove('selected');
                }
            });
        }

        // Hook into color functions - need to find where colors are applied
        // Override the color application functions to update column view
        setTimeout(() => {
            // Hook into the existing color functions after they're defined
            if (typeof applyColorToNodes === 'function') {
                const originalApplyColorToNodes = applyColorToNodes;
                applyColorToNodes = function() {
                    const result = originalApplyColorToNodes.apply(this, arguments);
                    updateColumnViewColors();
                    return result;
                };
            }

            // Hook into removeCardColor function
            if (typeof removeCardColor === 'function') {
                const originalRemoveCardColor = removeCardColor;
                removeCardColor = function(node) {
                    const result = originalRemoveCardColor.call(this, node);
                    updateColumnViewColors();
                    return result;
                };
            }

            // Hook into direct style updates via Cytoscape events
            if (cy) {
                cy.on('style', function(evt) {
                    // Update column view when any node style changes
                    setTimeout(updateColumnViewColors, 10);
                });
                
                cy.on('data', function(evt) {
                    // Update column view when node data changes (like cardColor)
                    setTimeout(updateColumnViewColors, 10);
                });

                // Hook into selection events
                cy.on('select unselect', function(evt) {
                    // Update column view when selections change
                    setTimeout(updateColumnViewSelections, 10);
                });

                // Hook into add/remove events to re-render column view
                cy.on('add remove', function(evt) {
                    if (isColumnView) {
                        renderColumnViewDebounced();
                    }
                });
            }
        }, 500);

        // Restore view state on page load
        setTimeout(() => {
            const savedView = localStorage.getItem('spatial-notes-view');
            if (savedView === 'column' && !isColumnView) {
                toggleView(); // Switch to column view if it was saved
            }
        }, 1000); // Wait a bit longer to ensure everything is initialized

        // Function to update column view for specific node after text changes
        function updateColumnViewCard(nodeId) {
            if (!isColumnView) return;
            
            const cardDiv = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (cardDiv) {
                const node = cy.getElementById(nodeId);
                const newCard = createColumnCard(node);
                cardDiv.parentNode.replaceChild(newCard, cardDiv);
            }
        }

        // Hook into edit dialogs to update column view on text changes
        // We'll monitor for text changes in edit dialogs
        let editDialogObserver = null;
        function watchEditDialogs() {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        // Check if edit dialog was added
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === 1 && node.querySelector && node.querySelector('textarea')) {
                                const textarea = node.querySelector('textarea');
                                const nodeId = node.dataset?.nodeId || getEditingNodeId();
                                
                                if (textarea && nodeId && isColumnView) {
                                    // Add input listener to textarea
                                    textarea.addEventListener('input', function() {
                                        // Update node data temporarily for preview
                                        const cyNode = cy.getElementById(nodeId);
                                        if (cyNode) {
                                            cyNode.data('text', this.value);
                                            setTimeout(() => updateColumnViewCard(nodeId), 10);
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            return observer;
        }

        // Helper function to get currently editing node ID (best effort)
        function getEditingNodeId() {
            // Try to find the node being edited by looking for selected nodes
            const selected = cy.$('node:selected');
            return selected.length > 0 ? selected[0].id() : null;
        }

        // Start watching for edit dialogs
        setTimeout(() => {
            editDialogObserver = watchEditDialogs();
        }, 2000);

        // Column view context menu
        function showColumnContextMenu(e, nodeId) {
            // Remove any existing context menu
            const existingMenu = document.getElementById('columnContextMenu');
            if (existingMenu) {
                document.body.removeChild(existingMenu);
            }

            const selectedNodes = cy.$('node:selected');
            const isMultipleSelected = selectedNodes.length > 1;
            
            // Create context menu
            const menu = document.createElement('div');
            menu.id = 'columnContextMenu';
            menu.style.cssText = `
                position: fixed;
                left: ${e.clientX}px;
                top: ${e.clientY}px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 10000;
                min-width: 150px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
            `;

            const targetText = isMultipleSelected ? `${selectedNodes.length} kort` : '1 kort';

            menu.innerHTML = `
                <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
                    <div style="padding: 4px 12px; font-weight: bold; color: #666;">Taggar för ${targetText}</div>
                </div>
                <div style="padding: 4px 0;">
                    <div class="context-menu-item" onclick="addTagToSelected()" style="padding: 8px 12px; cursor: pointer;">➕ Lägg till tagg</div>
                    <div class="context-menu-item" onclick="removeTagFromSelected()" style="padding: 8px 12px; cursor: pointer;">➖ Ta bort tagg</div>
                </div>
                <div style="padding: 8px 0; border-top: 1px solid #eee;">
                    <div style="padding: 4px 12px; font-weight: bold; color: #666;">Färger för ${targetText}</div>
                </div>
                <div style="padding: 4px 0;">
                    <div class="context-menu-item" onclick="showColumnColorPicker(event, '${nodeId}')" style="padding: 8px 12px; cursor: pointer;">🎨 Färga kort</div>
                    <div class="context-menu-item" onclick="removeColorFromSelected()" style="padding: 8px 12px; cursor: pointer;">❌ Ta bort färg</div>
                </div>
            `;

            // Add hover effects to menu items
            menu.querySelectorAll('.context-menu-item').forEach(item => {
                item.addEventListener('mouseenter', () => {
                    item.style.backgroundColor = '#f0f0f0';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.backgroundColor = '';
                });
            });

            document.body.appendChild(menu);

            // Close menu when clicking outside
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    document.body.removeChild(menu);
                    document.removeEventListener('click', closeMenu);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 10);
        }

        // Add tag to selected cards
        function addTagToSelected() {
            const selectedNodes = cy.$('node:selected');
            console.log('DEBUG addTagToSelected called, selected nodes:', selectedNodes.length);
            if (selectedNodes.length === 0) return;

            // Create iPad-friendly tag input dialog
            console.log('DEBUG calling showTagInputDialog');
            showTagInputDialog((tagName) => {
                if (!tagName || !tagName.trim()) return;

                const cleanTag = tagName.trim().replace(/^#/, ''); // Remove # if present

                selectedNodes.forEach(node => {
                    const currentTags = node.data('tags') || [];
                    if (!currentTags.includes(cleanTag)) {
                        currentTags.push(cleanTag);
                        node.data('tags', currentTags);
                    }
                });

                // Save and update views
                saveBoard();
                if (isColumnView) {
                    renderColumnViewDebounced();
                }
                
                // Show feedback
                const statusDiv = document.getElementById('selectionInfo');
                if (statusDiv) {
                    statusDiv.textContent = `Lade till tagg "${cleanTag}" på ${selectedNodes.length} kort`;
                    statusDiv.classList.add('visible');
                    setTimeout(() => statusDiv.classList.remove('visible'), 2000);
                }
            });
        }

        // iPad-friendly tag input dialog
        function showTagInputDialog(callback) {
            console.log('DEBUG showTagInputDialog called');
            // Remove any existing dialog
            const existingDialog = document.querySelector('.tag-input-dialog');
            if (existingDialog) {
                existingDialog.remove();
                console.log('DEBUG removed existing tag dialog');
            }
            
            // Create dialog overlay
            const overlay = document.createElement('div');
            overlay.className = 'tag-input-dialog';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Create dialog content
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 20px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #333; text-align: center;">Lägg till tagg</h3>
                <input type="text" id="tagNameInput" placeholder="Taggnamn (utan #)" style="
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 16px;
                    box-sizing: border-box;
                    margin-bottom: 15px;
                " />
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancelTagInput" style="
                        padding: 10px 20px;
                        border: 1px solid #ddd;
                        background: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Avbryt</button>
                    <button id="confirmTagInput" style="
                        padding: 10px 20px;
                        border: none;
                        background: #007bff;
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Lägg till</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            console.log('DEBUG tag input dialog added to DOM');
            
            // Focus input
            const input = document.getElementById('tagNameInput');
            setTimeout(() => input.focus(), 100);
            
            // Event handlers
            const cleanup = () => {
                console.log('DEBUG tag dialog cleanup called');
                overlay.remove();
            };
            
            document.getElementById('cancelTagInput').onclick = () => {
                console.log('DEBUG cancel tag button clicked');
                cleanup();
            };
            
            document.getElementById('confirmTagInput').onclick = () => {
                const tagName = input.value.trim();
                console.log('DEBUG confirm tag button clicked, tagName:', tagName);
                cleanup();
                if (callback) callback(tagName);
            };
            
            // Enter key to confirm
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const tagName = input.value.trim();
                    cleanup();
                    if (callback) callback(tagName);
                } else if (e.key === 'Escape') {
                    cleanup();
                }
            });
            
            // Close on click outside dialog
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                }
            });
        }

        // Remove tag from selected cards
        function removeTagFromSelected() {
            const selectedNodes = cy.$('node:selected');
            if (selectedNodes.length === 0) return;

            // Collect all unique tags from selected nodes
            const allTags = new Set();
            selectedNodes.forEach(node => {
                const tags = node.data('tags') || [];
                tags.forEach(tag => allTags.add(tag));
            });

            if (allTags.size === 0) {
                alert('Inga taggar hittades på de markerade korten.');
                return;
            }

            const tagList = Array.from(allTags).sort();
            
            // Show iPad-friendly tag selection dialog
            showTagSelectionDialog(tagList, (selectedTag) => {
                if (!selectedTag) return;

                const cleanTag = selectedTag.trim().replace(/^#/, '');

                let removedCount = 0;
                selectedNodes.forEach(node => {
                    const currentTags = node.data('tags') || [];
                    const filteredTags = currentTags.filter(tag => tag !== cleanTag);
                    if (filteredTags.length !== currentTags.length) {
                        node.data('tags', filteredTags);
                        removedCount++;
                    }
                });

                if (removedCount > 0) {
                    // Save and update views
                    saveBoard();
                    if (isColumnView) {
                        renderColumnViewDebounced();
                    }
                    
                    // Show feedback
                    const statusDiv = document.getElementById('selectionInfo');
                    if (statusDiv) {
                        statusDiv.textContent = `Tog bort tagg "${cleanTag}" från ${removedCount} kort`;
                        statusDiv.classList.add('visible');
                        setTimeout(() => statusDiv.classList.remove('visible'), 2000);
                    }
                } else {
                    alert(`Taggen "${cleanTag}" hittades inte på de markerade korten.`);
                }
            });
        }

        // iPad-friendly tag selection dialog
        function showTagSelectionDialog(tagList, callback) {
            // Remove any existing dialog
            const existingDialog = document.querySelector('.tag-selection-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }
            
            // Create dialog overlay
            const overlay = document.createElement('div');
            overlay.className = 'tag-selection-dialog';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Create dialog content
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 20px;
                width: 90%;
                max-width: 400px;
                max-height: 70vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #333; text-align: center;">Ta bort tagg</h3>
                <p style="margin: 0 0 15px 0; color: #666; text-align: center; font-size: 14px;">
                    Välj vilken tagg som ska tas bort:
                </p>
                <div id="tagSelectionList" style="margin-bottom: 15px;">
                    ${tagList.map(tag => `
                        <div class="tag-selection-item" data-tag="${tag}" style="
                            padding: 12px;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            margin-bottom: 8px;
                            cursor: pointer;
                            background: #f8f9fa;
                            text-align: center;
                            font-size: 16px;
                        ">${tag}</div>
                    `).join('')}
                </div>
                <div style="text-align: center;">
                    <button id="cancelTagSelection" style="
                        padding: 10px 20px;
                        border: 1px solid #ddd;
                        background: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Avbryt</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Event handlers
            const cleanup = () => {
                overlay.remove();
            };
            
            // Tag selection handlers
            overlay.querySelectorAll('.tag-selection-item').forEach(item => {
                item.addEventListener('click', () => {
                    const selectedTag = item.dataset.tag;
                    cleanup();
                    if (callback) callback(selectedTag);
                });
                
                // Hover effects
                item.addEventListener('mouseenter', () => {
                    item.style.backgroundColor = '#e9ecef';
                    item.style.borderColor = '#007bff';
                });
                
                item.addEventListener('mouseleave', () => {
                    item.style.backgroundColor = '#f8f9fa';
                    item.style.borderColor = '#ddd';
                });
            });
            
            document.getElementById('cancelTagSelection').onclick = cleanup;
            
            // Close on click outside dialog
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                }
            });
        }

        // Show color picker for column view cards
        function showColumnColorPicker(event, nodeId) {
            // Close context menu first
            const menu = document.getElementById('columnContextMenu');
            if (menu) document.body.removeChild(menu);

            // Get the clicked node and selected nodes
            const clickedNode = cy.getElementById(nodeId);
            const selectedNodes = cy.$('node:selected');
            
            // Determine nodes to color - same logic as regular context menu
            const nodesToColor = clickedNode.selected() && selectedNodes.length > 1 ? selectedNodes : [clickedNode];
            
            // Create a fake event object for showColorPicker
            const fakeEvent = {
                clientX: event.clientX || window.innerWidth / 2,
                clientY: event.clientY || window.innerHeight / 2,
                pageX: event.pageX || window.innerWidth / 2,
                pageY: event.pageY || window.innerHeight / 2
            };
            
            // Use the existing color picker
            showColorPicker(fakeEvent, nodesToColor);
        }

        // Remove color from selected cards in column view
        function removeColorFromSelected() {
            const selectedNodes = cy.$('node:selected');
            if (selectedNodes.length === 0) return;

            selectedNodes.forEach(node => {
                removeCardColor(node);
            });

            // Save and update views
            saveBoard();
            if (isColumnView) {
                renderColumnViewDebounced();
            }

            // Close context menu
            const menu = document.getElementById('columnContextMenu');
            if (menu) document.body.removeChild(menu);
        }
