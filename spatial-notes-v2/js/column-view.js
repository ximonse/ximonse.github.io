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
    

    
    return cardDiv;
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
    hideContextMenu(); // Use the global hide function

    const node = cy.getElementById(nodeId);
    if (!node) return;

    const selectedNodes = cy.$('node:selected');
    const isMultipleSelected = selectedNodes.length > 1;
    const targetNodes = isMultipleSelected ? selectedNodes : node;

    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'context-menu'; // Use the main context menu class
    menu.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: 10000;
        min-width: 220px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        padding: 8px 0;
    `;

    // --- Tags Section ---
    const addTagOption = document.createElement('div');
    addTagOption.className = 'context-menu-item';
    addTagOption.innerHTML = '➕ Lägg till tagg';
    addTagOption.onclick = () => { hideContextMenu(); addTagToSelected(); };
    menu.appendChild(addTagOption);

    const removeTagOption = document.createElement('div');
    removeTagOption.className = 'context-menu-item';
    removeTagOption.innerHTML = '➖ Ta bort tagg';
    removeTagOption.onclick = () => { hideContextMenu(); removeTagFromSelected(); };
    menu.appendChild(removeTagOption);

    // --- Color Section ---
    const colorOption = document.createElement('div');
    colorOption.className = 'context-menu-item';
    colorOption.innerHTML = '🎨 Färga kort';
    colorOption.onclick = () => { 
        hideContextMenu(); 
        showColorPicker(e, targetNodes);
    };
    menu.appendChild(colorOption);

    if (targetNodes.some(n => n.data('cardColor'))) {
        const removeColorOption = document.createElement('div');
        removeColorOption.className = 'context-menu-item';
        removeColorOption.innerHTML = '❌ Ta bort färg';
        removeColorOption.onclick = () => { 
            hideContextMenu();
            targetNodes.forEach(n => removeCardColor(n));
            saveBoard();
            if (isColumnView) renderColumnViewDebounced();
        };
        menu.appendChild(removeColorOption);
    }

    // --- Pinning Section ---
    const anyPinned = targetNodes.some(n => n.hasClass('pinned'));
    const pinOption = document.createElement('div');
    pinOption.className = 'context-menu-item';
    pinOption.innerHTML = anyPinned ? '📌 Ta bort pinning' : '📌 Pinna kort';
    pinOption.onclick = () => {
        hideContextMenu();
        targetNodes.forEach(n => {
            if (anyPinned) unpinCard(n); else pinCard(n);
        });
        saveBoard();
        if (isColumnView) renderColumnViewDebounced();
    };
    menu.appendChild(pinOption);

    // --- Image Section (only for single, image nodes) ---
    if (!isMultipleSelected && (node.data('type') === 'image' || node.data('isImageCard'))) {
        const resizeOption = document.createElement('div');
        resizeOption.className = 'context-menu-item';
        resizeOption.innerHTML = '↗️ Ändra storlek';
        resizeOption.onclick = () => { hideContextMenu(); showImageResizeDialog(node); };
        menu.appendChild(resizeOption);

        const readWithGeminiOption = document.createElement('div');
        readWithGeminiOption.className = 'context-menu-item';
        readWithGeminiOption.innerHTML = '✨ Läs med Gemini';
        readWithGeminiOption.onclick = () => { hideContextMenu(); readImageWithGemini(node); };
        menu.appendChild(readWithGeminiOption);
    }

    document.body.appendChild(menu);

    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', hideContextMenu, { once: true });
        document.addEventListener('touchstart', hideContextMenu, { once: true });
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

// ====================================================================================================
// 🔗 ZOTERO LINK BADGE SYSTEM
// ====================================================================================================

let linkBadgesContainer = null;

function setupLinkBadges() {
    // Create container for link badges
    linkBadgesContainer = document.createElement('div');
    linkBadgesContainer.id = 'linkBadgesContainer';
    linkBadgesContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
    `;
    document.getElementById('cy').appendChild(linkBadgesContainer);

    // Update badges whenever the view changes
    cy.on('pan zoom drag position', updateLinkBadges);
    cy.on('add remove', updateLinkBadges);

    // Initial render
    updateLinkBadges();
    console.log('🔗 Link badge system initialized');
}

function updateLinkBadges() {
