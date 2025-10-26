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
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 2000;
        display: flex; align-items: center; justify-content: center;
    `;
    
    // Create quick note dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white; padding: 20px; border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 500px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #333;">Snabb Anteckning</h3>
        <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">
            Första raden = Titel<br>
            Resten = Innehåll (Shift+Enter för ny rad)<br>
            #taggar hittas automatiskt överallt<br>
            <strong>Enter</strong>=Spara, <strong>Esc</strong>=Avbryt
        </p>
        <textarea id="quickNoteInput" placeholder="Min titel här
Här skriver jag mitt innehåll...
Kan ha #taggar överallt.
#extra #taggar #här" 
            style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; 
                   font-family: 'SF Mono', Consolas, monospace; font-size: 14px; resize: vertical;"></textarea>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const textarea = document.getElementById('quickNoteInput');
    textarea.focus();
    
    // Keyboard shortcuts - same as code dialog
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            createCardFromQuickNote(textarea.value);
            document.body.removeChild(overlay);
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            document.body.removeChild(overlay);
        }
        // Shift+Enter allows normal newline
    });
    
    // Click outside to cancel
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    // ESC handling for focus issues
    function handleEscape(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        }
    }
    document.addEventListener('keydown', handleEscape);
}

// Parse quick note and create card
function createCardFromQuickNote(input) {
    if (!input.trim()) return;
    
    const lines = input.trim().split('\n');
    if (lines.length === 0) return;
    
    // First line is always title
    const title = lines[0].trim();
    
    // Rest is content (skip first line)
    let contentLines = lines.slice(1);
    
    // Check if last line contains only tags (and has at least one #tag)
    let extraTags = [];
    if (contentLines.length > 0) {
        const lastLine = contentLines[contentLines.length - 1].trim();
        const hasOnlyTags = /^(#\w+\s*)+$/.test(lastLine); // Only #tags and whitespace
        
        if (hasOnlyTags && lastLine.includes('#')) {
            // Extract tags from last line and remove it from content
            const tagMatches = lastLine.match(/#\w+/g);
            if (tagMatches) {
                extraTags = tagMatches.map(t => t.substring(1));
            }
            contentLines = contentLines.slice(0, -1); // Remove last line from content
        }
    }
    
    // Join remaining content lines
    const text = contentLines.join('\n').trim();
    
    // Find all #tags in title and content
    let allTags = [...extraTags];
    const allText = (title + ' ' + text);
    const tagMatches = allText.match(/#\w+/g);
    if (tagMatches) {
        allTags.push(...tagMatches.map(t => t.substring(1)));
    }
    
    // Remove duplicates and filter out empty tags
    const uniqueTags = [...new Set(allTags)].filter(tag => tag.length > 0);
    
    // Use screen center as position (no mouse position for keyboard shortcut)
    const viewport = cy.extent();
    const centerX = (viewport.x1 + viewport.x2) / 2;
    const centerY = (viewport.y1 + viewport.y2) / 2;
    
    const newId = generateCardId();
    const newNode = cy.add({
        data: {
            id: newId,
            title: title,
            text: text || title, // Use title as text if no content
            tags: uniqueTags,
            searchMatch: false
        },
        position: { x: centerX, y: centerY }
    });
    
    newNode.grabify();
    console.log(`Created quick note: "${title}" with ${uniqueTags.length} tags`);
}

// Edit card - unified for all card types (including images)
function editCard(node) {
