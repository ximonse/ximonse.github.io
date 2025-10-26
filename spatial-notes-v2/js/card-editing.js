function editCard(node) {
    // Clear any existing edit dialogs first
    clearAllEditDialogs();
    
    // Handle image nodes differently - use annotation field for text
    const isImageNode = node.data('type') === 'image';
    const currentText = isImageNode ? (node.data('annotation') || '') : (node.data('text') || '');
    const currentTags = node.data('tags') || [];
    
    // Create overlay for editing (unified UI without title)
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
        <h3 style="margin-top: 0; color: #333; font-size: 18px;">Redigera kort</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Text:</label>
            <textarea id="editCardText" 
                style="width: 100%; height: 200px; font-family: inherit; font-size: 14px; 
                       border: 1px solid #ccc; border-radius: 4px; padding: 8px;
                       box-sizing: border-box; resize: vertical;">${currentText}</textarea>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555;">Färg (valfritt):</label>
            <div id="editCardColorPicker" style="display: flex; gap: 8px; align-items: center;">
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
            <input type="text" id="editCardTags" value="${currentTags.join(', ')}"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;
                       box-sizing: border-box; font-size: 14px;">
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555;">📅 Snabbveckor:</label>
            <div id="editWeekButtons" style="display: flex; gap: 8px; flex-wrap: wrap;">
                <!-- Week buttons will be populated by JavaScript -->
            </div>
        </div>
        <div style="text-align: right;">
            <button id="cancelEdit" style="background: #666; color: white; border: none; 
                                         padding: 10px 20px; border-radius: 4px; margin-right: 10px;
                                         cursor: pointer; font-size: 14px;">Avbryt</button>
            <button id="saveEdit" style="background: #007acc; color: white; border: none; 
                                        padding: 10px 20px; border-radius: 4px; cursor: pointer;
                                        font-size: 14px;">Spara ändringar</button>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
            <strong>Tips:</strong> Enter = ny rad, Ctrl+Enter = spara, Esc = avbryt
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus on textarea and select all text
    const textarea = document.getElementById('editCardText');
    textarea.focus();
    textarea.select();
    
    // Handle color picker selection and show current color
    let selectedColor = '';
    const currentCardColor = node.data('cardColor') || '';
    const currentColorNumber = currentCardColor.replace('card-color-', '') || '';
    
    const colorDots = document.querySelectorAll('#editCardColorPicker .color-dot');
    colorDots.forEach(dot => {
        // Show current color as selected
        if (dot.dataset.color === currentColorNumber) {
            dot.style.border = '2px solid #007acc';
            selectedColor = currentColorNumber;
        } else if (!currentColorNumber && dot.dataset.color === '') {
            dot.style.border = '2px solid #007acc';
            selectedColor = '';
        }
        
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
    const weekButtonsContainer = document.getElementById('editWeekButtons');
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
            const tagsInput = document.getElementById('editCardTags');
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
    
    // Handle keyboard shortcuts with proper cleanup
    function cleanup() {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
        document.removeEventListener('keydown', handleEscape);
    }
    
    function handleEscape(e) {
        if (e.key === 'Escape') {
            cleanup();
        }
    }
    
    // Handle save
    document.getElementById('saveEdit').onclick = function() {
        const newText = textarea.value.trim();
        const tagsInput = document.getElementById('editCardTags').value || '';
        const newTags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        // Allow saving with just tags (no text required)
        if (!newText && newTags.length === 0) {
            alert('Antingen text eller minst en tagg krävs');
            return;
        }
        
        if (isImageNode) {
            // For image nodes, save to annotation field and update searchable text
            node.data('annotation', newText);
            node.data('searchableText', newText.toLowerCase());
            
            // Update title to show annotation indicator
            // Don't show filename in title, keep title empty for clean image display
            node.data('title', '');
        } else {
            // For regular nodes, save to text field
            node.data('text', newText);
        }
        
        node.data('tags', newTags);
        
        // Apply selected color if any
        if (selectedColor) {
            node.data('cardColor', `card-color-${selectedColor}`);
        } else if (selectedColor === '') {
            // Remove color if "no color" was selected
            node.data('cardColor', null);
        }
        
        // Apply auto-gray coloring for #done tags
        applyAutoDoneColoring(node);

        // Force refresh of node styling
        cy.style().update();

        refreshSearchAndFilter();

        // Save immediately to prevent data loss from autosave/Drive sync
        saveBoard();

        cleanup();
    };
    
    // Handle cancel
    document.getElementById('cancelEdit').onclick = function() {
        cleanup();
    };
    
    // Handle keyboard shortcuts
    textarea.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            document.getElementById('saveEdit').click();
        } else if (e.key === 'Escape') {
            cleanup();
        }
    });
    
    document.addEventListener('keydown', handleEscape);
}

// DEPRECATED - Edit manually created cards with textarea popup
// Now using unified editCard() function instead
function editManualCard_DEPRECATED(node) {
    const currentText = node.data('text') || '';
    const currentTags = node.data('tags') || [];
    
    // Create overlay for editing
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
        <h3 style="margin-top: 0; color: #333; font-size: 18px;">Redigera kort</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Text:</label>
            <textarea id="editCardText" 
                style="width: 100%; height: 200px; font-family: inherit; font-size: 14px; 
                       border: 1px solid #ccc; border-radius: 4px; padding: 8px;
                       box-sizing: border-box; resize: vertical;">${currentText}</textarea>
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Tags (valfritt):</label>
            <input type="text" id="editCardTags" value="${currentTags.join(', ')}"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;
                       box-sizing: border-box; font-size: 14px;">
        </div>
        <div style="text-align: right;">
            <button id="cancelEdit" style="background: #666; color: white; border: none; 
                                         padding: 10px 20px; border-radius: 4px; margin-right: 10px;
                                         cursor: pointer; font-size: 14px;">Avbryt</button>
            <button id="saveEdit" style="background: #007acc; color: white; border: none; 
                                        padding: 10px 20px; border-radius: 4px; cursor: pointer;
                                        font-size: 14px;">Spara ändringar</button>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
            <strong>Tips:</strong> Enter = ny rad, Ctrl+Enter = spara, Esc = avbryt
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus on textarea and select all text
    const textarea = document.getElementById('editCardText');
    textarea.focus();
    textarea.select();
    
    // Handle keyboard shortcuts with proper cleanup
    function cleanup() {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
        document.removeEventListener('keydown', handleEscape);
    }
    
    function handleEscape(e) {
        if (e.key === 'Escape') {
            cleanup();
        }
    }
    
    // Handle save
    document.getElementById('saveEdit').onclick = function() {
        const newText = textarea.value.trim();
        if (!newText) {
            alert('Text krävs');
            return;
        }
        
        const tagsInput = document.getElementById('editCardTags').value || '';
        const newTags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        // Update node data
        node.data('text', newText);
        node.data('tags', newTags);
        
        // Apply auto-gray coloring for #done tags
        applyAutoDoneColoring(node);
        
        // Re-run search if active
        const searchInput = document.getElementById('searchInput');
        if (searchInput.value.trim()) {
            performSearch(searchInput.value);
        }

        // Re-run tag filter if active
        const tagFilterInput = document.getElementById('tagFilterInput');
        if (tagFilterInput.value.trim()) {
            performTagFilter(tagFilterInput.value);
        }

        // Save immediately to prevent data loss from autosave/Drive sync
        saveBoard();

        cleanup();
    };
    
    // Handle cancel
    document.getElementById('cancelEdit').onclick = function() {
        cleanup();
    };
    
    // Handle keyboard shortcuts
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            document.getElementById('saveEdit').click();
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            cleanup();
        }
    });
    
    document.addEventListener('keydown', handleEscape);
}

// DEPRECATED - Edit imported cards with old prompt system  
// Now using unified editCard() function instead
function editImportedCard_DEPRECATED(node) {
