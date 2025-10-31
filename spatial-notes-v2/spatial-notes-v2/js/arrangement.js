function selectSearchResults() {
    const searchMatches = cy.$('.search-match');
    console.log('Mobile select button pressed, found matches:', searchMatches.length);
    
    if (searchMatches.length > 0) {
        // Convert search matches to selected cards
        searchMatches.select();
        console.log('Selected search matches via mobile button');
        
        // Clear search visuals but keep cards selected
        searchActive = false;
        cy.nodes().removeClass('search-match');
        cy.nodes().data('searchMatch', false);
        
        const searchInfo = document.getElementById('searchInfo');
        searchInfo.classList.remove('visible');
        
        // Hide the select button
        const selectBtn = document.getElementById('searchSelectBtn');
        selectBtn.style.display = 'none';
        
        // Blur the search input so keyboard shortcuts work
        const searchInput = document.getElementById('searchInput');
        searchInput.blur();
        
        console.log(`✅ Selected ${searchMatches.length} search results via mobile button`);
    }
}

// ========================================
// END MOBILE SEARCH SUPPORT  
// ========================================
// ========================================
// END DATE-BASED AUTO-MARKING SYSTEM
// ========================================
// ========================================
// END SORTING SYSTEM
// ========================================

// Alignment functions for selected cards
function alignSelectedVertical() {
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    if (selectedNodes.length < 2) return;
    
    // Get the leftmost card's X position as reference (fixed reference point)
    let referenceX = selectedNodes[0].position().x;
    selectedNodes.forEach(node => {
        if (node.position().x < referenceX) {
            referenceX = node.position().x;
        }
    });
    
    // Sort cards by current Y position to maintain relative order
    const sortedNodes = selectedNodes.sort((a, b) => a.position().y - b.position().y);
    
    // Start from the topmost card's position, adjusted for its height
    const firstCardHeight = getMeasuredTextHeight(sortedNodes[0]);
    let currentY = sortedNodes[0].position().y - (firstCardHeight / 2);
    
    // Position each card using measured height + 20% spacing (60px)
    cy.batch(() => {
        sortedNodes.forEach((node, index) => {
            const cardHeight = getMeasuredTextHeight(node);
            
            // Position this card at its center Y
            const centerY = currentY + (cardHeight / 2);
            node.animate({
                position: { x: referenceX, y: centerY }
            }, {
                duration: 300,
                easing: 'ease-out'
            });
            
            // Calculate next Y position with 20% spacing (60px)
            if (index < sortedNodes.length - 1) {
                const spacing = 60; // 20% of 300px card width
                currentY += cardHeight + spacing;
            }
        });
    });
    
    console.log(`Aligned ${selectedNodes.length} cards vertically with 60px spacing`);
}

function alignSelectedVerticalSimple() {
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    if (selectedNodes.length < 2) return;
    
    // Get the leftmost card's X position as reference
    let referenceX = selectedNodes[0].position().x;
    selectedNodes.forEach(node => {
        if (node.position().x < referenceX) {
            referenceX = node.position().x;
        }
    });
    
    // Align all cards to the same X position, keep original Y positions
    selectedNodes.forEach(node => {
        node.animate({
            position: { x: referenceX, y: node.position().y }
        }, {
            duration: 300,
            easing: 'ease-out'
        });
    });
    
    console.log(`Aligned ${selectedNodes.length} cards vertically (simple)`);
}

function alignSelectedHorizontal() {
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    if (selectedNodes.length < 2) return;
    
    // Calculate the average Y position for better alignment
    let totalY = 0;
    selectedNodes.forEach(node => {
        totalY += node.position().y;
    });
    const averageY = totalY / selectedNodes.length;
    
    // Align all cards to the average Y position (centers them)
    selectedNodes.forEach(node => {
        node.animate({
            position: { x: node.position().x, y: averageY }
        }, {
            duration: 300,
            easing: 'ease-out'
        });
    });
    
    console.log(`Aligned ${selectedNodes.length} cards horizontally at center`);
}

function arrangeSelectedInGrid() {
    // If we have copied cards, create and arrange them. Otherwise, arrange selected nodes.
    if (copiedCards.length > 0) {
        arrangeCopiedCardsInGrid();
        return;
    }
    
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    if (selectedNodes.length < 2) return;
    
    // Save state for undo before arranging
    console.log('About to save state before grid arrangement');
    saveState();
    console.log('State saved, proceeding with arrangement');
    
    // Calculate grid dimensions
    const nodeCount = selectedNodes.length;
    const cols = Math.ceil(Math.sqrt(nodeCount));
    const rows = Math.ceil(nodeCount / cols);
    
    // Use mouse position or fallback to screen center
    const arrangePos = getArrangementPosition();
    const screenCenterX = arrangePos.x;
    const screenCenterY = arrangePos.y;
    
    // Calculate grid starting position (top-left corner)
    const spacing = 180; // Closer distance between cards for compact grid
    const gridWidth = (cols - 1) * spacing;
    const gridHeight = (rows - 1) * spacing;
    const startX = screenCenterX - (gridWidth / 2);
    const startY = screenCenterY - (gridHeight / 2);
    
    // Arrange nodes in grid with center alignment
    selectedNodes.forEach((node, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const newX = startX + (col * spacing);
        const newY = startY + (row * spacing);
        
        node.animate({
            position: { x: newX, y: newY }
        }, {
            duration: 400,
            easing: 'ease-out'
        });
    });
    
    console.log(`Arranged ${selectedNodes.length} cards in centered ${rows}×${cols} grid`);
}

function arrangeSelectedInColumn() {
    // Check if we should arrange copied cards instead
    if (copiedCards.length > 0) {
        arrangeCopiedCardsInColumn();
        return;
    }
    
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    
    // If only one card selected, move it instead of arranging
    if (selectedNodes.length === 1) {
        moveSelectedCard();
        return;
    }
    
    if (selectedNodes.length < 2) return;
    
    // Use mouse position or fallback to screen center
    const arrangePos = getArrangementPosition();
    const centerX = arrangePos.x;
    const centerY = arrangePos.y;
    
    // Sort nodes - check arrows first, then custom sorting, then original order
    let nodesToArrange;
    if (sortMode) {
        nodesToArrange = sortNodes(selectedNodes.toArray());
        console.log('Applied sorting:', sortMode);
        sortMode = null;
        // Hide status message
        const statusDiv = document.getElementById('selectionInfo');
        if (statusDiv) statusDiv.classList.remove('visible');
    } else {
        // Try arrow-based sorting first
        nodesToArrange = getArrowBasedOrder(selectedNodes.toArray());
    }
    
    // Calculate total height needed for all cards with spacing
    let totalRequiredHeight = 0;
    nodesToArrange.forEach((node, index) => {
        const cardHeight = getCardHeight(node);
        totalRequiredHeight += cardHeight;
        if (index < nodesToArrange.length - 1) {
            totalRequiredHeight += 60; // 20% spacing (60px)
        }
    });
    
    // Start positioning from arrangement center, working upwards
    let currentY = centerY - (totalRequiredHeight / 2);
    
    nodesToArrange.forEach((node, index) => {
        // Get this card's actual height
        const cardHeight = getCardHeight(node);
        
        // Position this card at its center
        const cardCenterY = currentY + (cardHeight / 2);
        node.animate({
            position: { x: centerX, y: cardCenterY }
        }, {
            duration: 400,
            easing: 'ease-out'
        });
        
        // Move to next card position
        if (index < selectedNodes.length - 1) {
            const padding = 60; // 20% spacing
            currentY += cardHeight + padding;
        }
    });
    
    console.log(`Arranged ${selectedNodes.length} cards in centered column`);
}

function arrangeSelectedInRow() {
    // If we have copied cards, create and arrange them. Otherwise, arrange selected nodes.
    if (copiedCards.length > 0) {
        arrangeCopiedCardsInRow();
        return;
    }
    
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    if (selectedNodes.length < 2) return;
    
    // Save state for undo before arranging
    console.log('H command: About to save state for undo');
    saveState();
    console.log('H command: State saved, proceeding with arrangement');
    
    // Use mouse position or fallback to screen center
    const arrangePos = getArrangementPosition();
    const centerX = arrangePos.x;
    const centerY = arrangePos.y;
    
    // Sort nodes - check arrows first, then custom sorting, then left-to-right order
    let sortedNodes;
    if (sortMode) {
        sortedNodes = sortNodes(selectedNodes.toArray());
        console.log('Applied sorting:', sortMode);
        sortMode = null;
        // Hide status message
        const statusDiv = document.getElementById('selectionInfo');
        if (statusDiv) statusDiv.classList.remove('visible');
    } else {
        // Try arrow-based sorting first, fallback to left-to-right
        const arrowSorted = getArrowBasedOrder(selectedNodes.toArray());
        sortedNodes = arrowSorted.length === selectedNodes.length ? arrowSorted : selectedNodes.sort((a, b) => a.position().x - b.position().x);
    }
    
    // Calculate total width needed for all cards with spacing (use 20% spacing)
    let totalRequiredWidth = 0;
    sortedNodes.forEach((node, index) => {
        const cardWidth = getCardWidth(node);
        totalRequiredWidth += cardWidth;
        if (index < sortedNodes.length - 1) {
            totalRequiredWidth += 60; // 20% of 300px = 60px spacing
        }
    });
    
    // Start positioning from arrangement center, working leftwards
    let currentX = centerX - (totalRequiredWidth / 2);
    
    cy.batch(() => {
        sortedNodes.forEach((node, index) => {
            // Get this card's actual width and height
            const cardWidth = getCardWidth(node);
            const cardHeight = getCardHeight(node);
            
            // Position this card with top-aligned positioning
            const cardCenterX = currentX + (cardWidth / 2);
            const cardCenterY = centerY + (cardHeight / 2); // Top-align: center Y based on card's height
            
            node.animate({
                position: { x: cardCenterX, y: cardCenterY }
            }, {
                duration: 400,
                easing: 'ease-out'
            });
            
            // Move to next card position with 20% spacing
            currentX += cardWidth + 60;
        });
    });
    
    console.log(`Arranged ${selectedNodes.length} cards in centered row with 20% spacing`);
}

// Helper function to calculate card width (considers geometric shapes)
function getCardWidth(node) {
    // Check if it's a geometric shape with custom width
    if (node.data('isAnnotation') && node.data('customWidth')) {
        return node.data('customWidth');
    }
    return 300; // Fixed width for all regular cards
}

// Helper function to calculate card height (considers geometric shapes)
function getCardHeight(node) {
    // Check if it's a geometric shape with custom height
    if (node.data('isAnnotation') && node.data('customHeight')) {
        return node.data('customHeight');
    }
    return getMeasuredTextHeight(node); // Use text-based height for regular cards
}


// Create new cards from copied data and arrange them in column
function createAndArrangeInColumn() {
    if (copiedCards.length === 0) return;
    
    const arrangePos = getArrangementPosition();
    const centerX = arrangePos.x;
    const centerY = arrangePos.y;
    
    // Create new nodes from copied card data
    const newNodes = [];
    copiedCards.forEach(cardData => {
        const newNode = cy.add({
            data: {
                id: generateCardId(),
                title: cardData.title,
                text: cardData.text,
                tags: cardData.tags,
                hidden_tags: cardData.hidden_tags,
                searchMatch: false,
                // Copy all metadata
                export_timestamp: cardData.export_timestamp,
                export_session: cardData.export_session,
                export_source: cardData.export_source,
                source_file: cardData.source_file,
                page_number: cardData.page_number,
                matched_terms: cardData.matched_terms,
                card_index: cardData.card_index,
                isManualCard: cardData.isManualCard,
                cardColor: cardData.cardColor,
                // Copy metadata
                copyOf: cardData.copyOf,
                isCopy: cardData.isCopy,
                copyTimestamp: cardData.copyTimestamp
            },
            position: { x: centerX, y: centerY }
        });
        
        newNode.grabify();
        newNodes.push(newNode);
    });
    
    // Calculate total height needed for all cards with spacing
    let totalRequiredHeight = 0;
    newNodes.forEach((node, index) => {
        const cardHeight = getMeasuredTextHeight(node);
        totalRequiredHeight += cardHeight;
        if (index < newNodes.length - 1) {
            totalRequiredHeight += 60; // 20% spacing
        }
    });
    
    // Start positioning from arrangement center, working upwards
    let currentY = centerY - (totalRequiredHeight / 2);
    
    newNodes.forEach((node, index) => {
        const cardHeight = getMeasuredTextHeight(node);
        const cardCenterY = currentY + (cardHeight / 2);
        
        node.position({ x: centerX, y: cardCenterY });
        
        // Move to next position
        if (index < newNodes.length - 1) {
            currentY += cardHeight + 60;
        }
    });
    
    // Clear copied cards and select the new ones
    copiedCards = [];
    cy.nodes().unselect();
    newNodes.forEach(node => node.select());
    
    console.log(`Created and arranged ${newNodes.length} copied cards in column`);
}

// Create new cards from copied data and arrange them in row (H command)
function createAndArrangeInRow() {
    if (copiedCards.length === 0) return;
    
    const arrangePos = getArrangementPosition();
    const centerX = arrangePos.x;
    const centerY = arrangePos.y;
    
    // Create new nodes from copied card data
    const newNodes = [];
    copiedCards.forEach(cardData => {
        const newNode = cy.add({
            data: {
                id: generateCardId(),
                title: cardData.title,
                text: cardData.text,
                tags: cardData.tags,
                hidden_tags: cardData.hidden_tags,
                searchMatch: false,
                isManualCard: cardData.isManualCard,
                cardColor: cardData.cardColor,
                copyOf: cardData.copyOf,
                isCopy: cardData.isCopy,
                copyTimestamp: cardData.copyTimestamp
            },
            position: { x: centerX, y: centerY }
        });
        
        newNode.grabify();
        newNodes.push(newNode);
    });
    
    // Arrange in horizontal row with 60px spacing
    const cardWidth = 300;
    const spacing = 60; // 20% spacing
    let totalWidth = newNodes.length * cardWidth + (newNodes.length - 1) * spacing;
    let currentX = centerX - (totalWidth / 2);
    
    newNodes.forEach((node, index) => {
        const cardHeight = getMeasuredTextHeight(node);
        const cardCenterX = currentX + (cardWidth / 2);
        const cardCenterY = centerY + (cardHeight / 2);
        
        node.position({ x: cardCenterX, y: cardCenterY });
        currentX += cardWidth + spacing;
    });
    
    // Clear copied cards and select new ones
    copiedCards = [];
    cy.nodes().unselect();
    newNodes.forEach(node => node.select());
    
    console.log(`Created and arranged ${newNodes.length} copied cards in row`);
}

// Move single selected card to mouse cursor
function moveSelectedCard() {
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    if (selectedNodes.length !== 1) return;
    
    saveState(); // Save for undo
    
    const arrangePos = getArrangementPosition();
    const targetX = arrangePos.x;
    const targetY = arrangePos.y;
    
    const node = selectedNodes[0];
    const cardHeight = getMeasuredTextHeight(node);
    // Position so card's top edge is at mouse cursor
    const cardCenterY = targetY + (cardHeight / 2);
    
    node.animate({
        position: { x: targetX, y: cardCenterY }
    }, {
        duration: 300,
        easing: 'ease-out'
    });
    
    console.log(`Moved card to cursor position (${Math.round(targetX)}, ${Math.round(targetY)})`);
}

// Stack: Neat stack, top and left aligned at mouse cursor
function stackSelectedCards() {
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    if (selectedNodes.length < 2) return;
    
    saveState(); // Save for undo
    
    const arrangePos = getArrangementPosition();
    const baseX = arrangePos.x; // Start at mouse cursor X
    const baseY = arrangePos.y; // Start at mouse cursor Y (top edge)
    
    // Sort cards by current position for consistent stacking
    const sortedNodes = selectedNodes.sort((a, b) => a.position().y - b.position().y);
    
    // Stack them with small offset for neat pile effect
    const stackOffsetX = 3; // 3px right offset per card
    const stackOffsetY = 5; // 5px down offset per card
    
    sortedNodes.forEach((node, index) => {
        const cardHeight = getMeasuredTextHeight(node);
        const stackX = baseX + (index * stackOffsetX);
        // Position so first card's top edge is at mouse cursor Y
        const stackY = baseY + (index * stackOffsetY) + (cardHeight / 2);
        
        node.animate({
            position: { x: stackX, y: stackY }
        }, {
            duration: 300,
            easing: 'ease-out'
        });
    });
    
    console.log(`Stack: Created neat pile of ${selectedNodes.length} cards at cursor`);
}

function updateSelectionInfo() {
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    const selectionInfo = document.getElementById('selectionInfo');
    
    if (selectedNodes.length === 0) {
        selectionInfo.classList.remove('visible');
        return;
    }
    
    const count = selectedNodes.length;
    const pinnedCount = selectedNodes.filter('.pinned').length;
    const unpinnedCount = count - pinnedCount;
    
    let text = `${count} kort markerade`;
    if (pinnedCount > 0 && unpinnedCount > 0) {
        text += ` (${pinnedCount} pinnade, ${unpinnedCount} opinnde)`;
    } else if (pinnedCount > 0) {
        text += ` (alla pinnade)`;
    } else {
        text += ` (alla opinnde)`;
    }
    
    text += '<br><small>';
    if (count >= 2) {
        text += '1=kolumn, 2=rad, 3=rutnät, V=fördela↕, Shift+V=linje↕, H=linje↔';
    } else {
        text += 'P=pin, U=unpin, Delete=ta bort, Esc=avmarkera';
    }
    text += '</small>';
    
    selectionInfo.innerHTML = text;
    selectionInfo.classList.add('visible');
}

// Layout functions
function applyLayout() {
    const layoutSelect = document.getElementById('layoutSelect');
    const selectedLayout = layoutSelect.value;
    
    let layoutOptions;
    
    switch(selectedLayout) {
        case 'cose':
            layoutOptions = {
                name: 'cose',
                idealEdgeLength: 150,
                nodeOverlap: 100,
                refresh: 20,
                fit: false,
                padding: 50,
                randomize: false,
                componentSpacing: 100,
                nodeRepulsion: 400000,
                edgeElasticity: 100,
                nestingFactor: 5,
                gravity: 80,
                numIter: 1000,
                animate: true
            };
            break;
        case 'grid':
            // Use custom smart grid layout instead of Cytoscape's grid
            applySmartGridLayout();
            return;
        default: // preset
            // Don't run layout for manual positioning
            return;
    }
    
    const layout = cy.layout(layoutOptions);
    layout.run();
}

// Smart column layout - all cards in single column with top alignment
function arrangeAllInColumn() {
    const allNodes = cy.nodes();
    if (allNodes.length === 0) return;
    
    // Calculate center X position
    let totalX = 0;
    allNodes.forEach(node => {
        totalX += node.position().x;
    });
    const centerX = totalX / allNodes.length;
    
    // Calculate total height needed and start from center
    let totalRequiredHeight = 0;
    allNodes.forEach((node, index) => {
        const cardHeight = getMeasuredTextHeight(node);
        totalRequiredHeight += cardHeight;
        if (index < allNodes.length - 1) {
            totalRequiredHeight += 30; // spacing between cards
        }
    });
    
    // Start positioning from center, working upwards
    let currentY = -(totalRequiredHeight / 2);
    
    allNodes.forEach((node, index) => {
        const cardHeight = getMeasuredTextHeight(node);
        const cardCenterY = currentY + (cardHeight / 2);
        
        node.animate({
            position: { x: centerX, y: cardCenterY }
        }, {
            duration: 500,
            easing: 'ease-out'
        });
        
        // Move to next card position
        if (index < allNodes.length - 1) {
            currentY += cardHeight + 30;
        }
    });
    
    // Show feedback
    const searchInfo = document.getElementById('searchInfo');
    searchInfo.textContent = `Kolumn-layout applicerat: ${allNodes.length} kort i en kolumn`;
    searchInfo.classList.add('visible');
    setTimeout(() => {
        searchInfo.classList.remove('visible');
    }, 2000);
}

// Smart grid layout using same spacing as arrangements
function applySmartGridLayout() {
    const allNodes = cy.nodes();
    if (allNodes.length === 0) return;
    
    // Calculate grid dimensions
    const nodeCount = allNodes.length;
    const cols = Math.ceil(Math.sqrt(nodeCount));
    const rows = Math.ceil(nodeCount / cols);
    
    // Calculate center point of all nodes
    let totalX = 0, totalY = 0;
    allNodes.forEach(node => {
        const pos = node.position();
        totalX += pos.x;
        totalY += pos.y;
    });
    const centerX = totalX / allNodes.length;
    const centerY = totalY / allNodes.length;
    
    // Measure card dimensions for smart spacing (same as arrangements)
    const ruler = document.getElementById('text-ruler');
    let maxCardWidth = 280; // Default
    let maxCardHeight = 120; // Default
    
    allNodes.forEach(node => {
        const title = node.data('title') || '';
        const text = node.data('text') || '';
        const tags = node.data('tags') || [];
        
        // Measure text height
        const combinedText = title + '\n\n' + text + '\n\n' + tags.map(tag => `#${tag}`).join(' ');
        ruler.textContent = combinedText;
        const measuredHeight = Math.max(140, ruler.offsetHeight + 40);
        maxCardHeight = Math.max(maxCardHeight, measuredHeight);
        
        // Calculate width based on content
        const baseWidth = 180;
        const extraWidth = Math.min(120, (title + text).length * 0.9);
        const cardWidth = baseWidth + extraWidth;
        maxCardWidth = Math.max(maxCardWidth, cardWidth);
    });
    
    // Add smart spacing
    const horizontalSpacing = maxCardWidth + 40;
    const verticalSpacing = maxCardHeight + 30;
    
    // Calculate grid starting position (centered)
    const gridWidth = (cols - 1) * horizontalSpacing;
    const gridHeight = (rows - 1) * verticalSpacing;
    const startX = centerX - gridWidth / 2;
    const startY = centerY - gridHeight / 2;
    
    // Position nodes in grid with top-aligned rows
    const nodeArray = allNodes.toArray();
    
    // Group nodes by row and calculate each row's top position
    for (let row = 0; row < rows; row++) {
        const rowNodes = [];
        const rowStartIndex = row * cols;
        const rowEndIndex = Math.min((row + 1) * cols, nodeArray.length);
        
        // Get nodes for this row
        for (let i = rowStartIndex; i < rowEndIndex; i++) {
            rowNodes.push(nodeArray[i]);
        }
        
        // Find tallest card in this row to determine row height
        let maxRowHeight = 0;
        rowNodes.forEach(node => {
            const cardHeight = getMeasuredTextHeight(node);
            maxRowHeight = Math.max(maxRowHeight, cardHeight);
        });
        
        // Position each card in this row (top-aligned)
        rowNodes.forEach((node, colIndex) => {
            const cardHeight = getMeasuredTextHeight(node);
            
            const newX = startX + colIndex * horizontalSpacing;
            const rowBaseY = startY + row * verticalSpacing;
            // Align to top of row, then center the card within its space
            const newY = rowBaseY;
            
            node.animate({
                position: { x: newX, y: newY }
            }, {
                duration: 500,
                easing: 'ease-out'
            });
        });
    }
    
    // Show feedback
    const searchInfo = document.getElementById('searchInfo');
    searchInfo.textContent = `Grid-layout applicerat: ${cols}×${rows} rutnät med ${allNodes.length} kort`;
    searchInfo.classList.add('visible');
    setTimeout(() => {
        searchInfo.classList.remove('visible');
    }, 2000);
}

// G+V: Grid Vertical - column-focused arrangement with max gap between cards (bottom-edge to top-edge)
function arrangeSelectedGridVerticalColumns() {
