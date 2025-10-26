function showContextMenu(event, node) {
    // Remove any existing context menu
    hideContextMenu();
    
    // Get mouse position
    const x = event.clientX || event.pageX;
    const y = event.clientY || event.pageY;
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.zIndex = '3000';
    
    // Pin/Unpin option
    const isPinned = node.hasClass('pinned');
    const pinOption = document.createElement('div');
    pinOption.className = 'context-menu-item';
    pinOption.innerHTML = isPinned ? '📌 Ta bort pinning' : '📌 Pinna kort';
    pinOption.onclick = () => {
        if (isPinned) {
            unpinCard(node);
        } else {
            pinCard(node);
        }
        hideContextMenu();
    };
    menu.appendChild(pinOption);
    
    // Color option
    const colorOption = document.createElement('div');
    colorOption.className = 'context-menu-item';
    colorOption.innerHTML = '🎨 Färga kort';
    colorOption.onclick = () => {
        hideContextMenu();
        // If the right-clicked node is selected, color all selected nodes
        // Otherwise, color just the right-clicked node
        const selectedNodes = cy.$('node:selected');
        const nodesToColor = node.selected() && selectedNodes.length > 1 ? selectedNodes : [node];
        showColorPicker(event, nodesToColor);
    };
    menu.appendChild(colorOption);
    
    // Remove color option (if card has color)
    if (node.data('cardColor')) {
        const removeColorOption = document.createElement('div');
        removeColorOption.className = 'context-menu-item';
        removeColorOption.innerHTML = '❌ Ta bort färg';
        removeColorOption.onclick = () => {
            // If the right-clicked node is selected, remove color from all selected nodes
            // Otherwise, remove color from just the right-clicked node
            const selectedNodes = cy.$('node:selected');
            const nodesToProcess = node.selected() && selectedNodes.length > 1 ? selectedNodes : [node];
            nodesToProcess.forEach(n => removeCardColor(n));

            // Save immediately to prevent data loss from autosave/Drive sync
            saveBoard();

            hideContextMenu();
        };
        menu.appendChild(removeColorOption);
    }

    // Resize option for image nodes
    if (node.data('type') === 'image' || node.data('isImageCard')) {
        const resizeOption = document.createElement('div');
        resizeOption.className = 'context-menu-item';
        resizeOption.innerHTML = '↗️ Ändra storlek';
        resizeOption.onclick = () => {
            hideContextMenu();
            showImageResizeDialog(node);
        };
        menu.appendChild(resizeOption);
    }

    // Resize option for annotation/geometric shapes
    if (node.data('isAnnotation') && node.data('annotationType') !== 'connection') {
        const resizeOption = document.createElement('div');
        resizeOption.className = 'context-menu-item';
        resizeOption.innerHTML = '↗️ Ändra storlek';
        resizeOption.onclick = () => {
            hideContextMenu();
            showResizeDialog(node);
        };
        menu.appendChild(resizeOption);
        
        // Font size option for geometric shapes
        const fontSizeOption = document.createElement('div');
        fontSizeOption.className = 'context-menu-item';
        fontSizeOption.innerHTML = '🔤 Ändra fontstorlek';
        fontSizeOption.onclick = () => {
            hideContextMenu();
            showFontSizeDialog(node);
        };
        menu.appendChild(fontSizeOption);
    }
    
    // Arrow visibility toggle (global option)
    const arrowToggleOption = document.createElement('div');
    arrowToggleOption.className = 'context-menu-item';
    const arrowsVisible = !window.arrowsHidden;
    arrowToggleOption.innerHTML = arrowsVisible ? '👁️ Dölj pilar' : '👁️ Visa pilar';
    arrowToggleOption.onclick = () => {
        hideContextMenu();
        toggleArrowVisibility();
    };
    menu.appendChild(arrowToggleOption);
    
    // Remove arrows between selected cards (if multiple cards selected)
    const selectedNodes = cy.$('node:selected');
    if (selectedNodes.length > 1) {
        const removeArrowsOption = document.createElement('div');
        removeArrowsOption.className = 'context-menu-item';
        removeArrowsOption.innerHTML = '🗑️ Ta bort pilar mellan markerade';
        removeArrowsOption.onclick = () => {
            hideContextMenu();
            removeArrowsBetweenSelected();
        };
        menu.appendChild(removeArrowsOption);
        
        // Bulk tag option for multiple selected cards
        const bulkTagOption = document.createElement('div');
        bulkTagOption.className = 'context-menu-item';
        bulkTagOption.innerHTML = '🏷️ Lägg till tagg på alla markerade';
        bulkTagOption.onclick = () => {
            hideContextMenu();
            showBulkTagDialog(selectedNodes);
        };
        menu.appendChild(bulkTagOption);

        // Export option for multiple selected cards
        const exportOption = document.createElement('div');
        exportOption.className = 'context-menu-item';
        exportOption.innerHTML = '📤 Exportera markerade kort';
        exportOption.onclick = () => {
            hideContextMenu();
            showExportMenu();
        };
        menu.appendChild(exportOption);
    }
    
    document.body.appendChild(menu);
    
    // Close menu on click elsewhere
    setTimeout(() => {
        document.addEventListener('click', hideContextMenu, { once: true });
    }, 0);
}

function hideContextMenu() {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
}

// Show keyboard shortcuts dialog (Ctrl+Q)
function showKeyboardShortcutsDialog() {
    // Remove any existing dialog
    const existing = document.getElementById('keyboardShortcutsDialog');
    if (existing) {
        existing.remove();
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'keyboardShortcutsDialog';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        max-width: 700px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        padding: 30px;
    `;

    dialog.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
            <h2 style="margin: 0; font-size: 28px;">⌨️ Kortkommandon</h2>
            <button onclick="document.getElementById('keyboardShortcutsDialog').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #666;">×</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px;">
            <!-- Arrangement -->
            <div class="shortcut-category">
                <h3 style="font-size: 16px; color: #333; margin: 0 0 12px 0; font-weight: 600;">📐 Arrangement</h3>
                <div class="shortcut-list">
                    <div class="shortcut-item"><kbd>H</kbd><span>Horisontell rad</span></div>
                    <div class="shortcut-item"><kbd>V</kbd><span>Vertikal kolumn</span></div>
                    <div class="shortcut-item"><kbd>G+V</kbd><span>Grid vertikal</span></div>
                    <div class="shortcut-item"><kbd>G+H</kbd><span>Grid horisontell</span></div>
                    <div class="shortcut-item"><kbd>G+T</kbd><span>Grid tight (kompakt)</span></div>
                    <div class="shortcut-item"><kbd>Q</kbd><span>Runt kluster</span></div>
                    <div class="shortcut-item"><kbd>QQ</kbd><span>Tight kluster</span></div>
                    <div class="shortcut-item"><kbd>S</kbd><span>Stack (hög)</span></div>
                </div>
            </div>

            <!-- Färg -->
            <div class="shortcut-category">
                <h3 style="font-size: 16px; color: #333; margin: 0 0 12px 0; font-weight: 600;">🎨 Färg</h3>
                <div class="shortcut-list">
                    <div class="shortcut-item"><kbd>0</kbd><span>Ta bort färg</span></div>
                    <div class="shortcut-item"><kbd>1</kbd><span>Grön</span></div>
                    <div class="shortcut-item"><kbd>2</kbd><span>Orange</span></div>
                    <div class="shortcut-item"><kbd>3</kbd><span>Röd</span></div>
                    <div class="shortcut-item"><kbd>4</kbd><span>Gul</span></div>
                    <div class="shortcut-item"><kbd>5</kbd><span>Lila</span></div>
                    <div class="shortcut-item"><kbd>6</kbd><span>Blå</span></div>
                    <div class="shortcut-item"><kbd>T</kbd><span>Färgväljare</span></div>
                </div>
            </div>

            <!-- Kortredigering -->
            <div class="shortcut-category">
                <h3 style="font-size: 16px; color: #333; margin: 0 0 12px 0; font-weight: 600;">📌 Kortredigering</h3>
                <div class="shortcut-list">
                    <div class="shortcut-item"><kbd>C</kbd><span>Kopiera markerade</span></div>
                    <div class="shortcut-item"><kbd>Pin</kbd><span>Pinna kort</span></div>
                    <div class="shortcut-item"><kbd>Unpin</kbd><span>Ta bort pinning</span></div>
                    <div class="shortcut-item"><kbd>Delete</kbd><span>Radera markerade</span></div>
                </div>
            </div>

            <!-- Navigation & Sök -->
            <div class="shortcut-category">
                <h3 style="font-size: 16px; color: #333; margin: 0 0 12px 0; font-weight: 600;">🔍 Navigation & Sök</h3>
                <div class="shortcut-list">
                    <div class="shortcut-item"><kbd>Ctrl+A</kbd><span>Markera alla</span></div>
                    <div class="shortcut-item"><kbd>Ctrl+F</kbd><span>Fokusera sökning</span></div>
                    <div class="shortcut-item"><kbd>Escape</kbd><span>Avmarkera alla</span></div>
                </div>
            </div>

            <!-- Spara & Export -->
            <div class="shortcut-category">
                <h3 style="font-size: 16px; color: #333; margin: 0 0 12px 0; font-weight: 600;">💾 Spara & Export</h3>
                <div class="shortcut-list">
                    <div class="shortcut-item"><kbd>Ctrl+S</kbd><span>Spara</span></div>
                    <div class="shortcut-item"><kbd>Ctrl+E</kbd><span>Exportera markerade</span></div>
                    <div class="shortcut-item"><kbd>Ctrl+Z</kbd><span>Ångra</span></div>
                    <div class="shortcut-item"><kbd>Ctrl+Y</kbd><span>Gör om</span></div>
                </div>
            </div>

            <!-- Tema -->
            <div class="shortcut-category">
                <h3 style="font-size: 16px; color: #333; margin: 0 0 12px 0; font-weight: 600;">🌙 Tema</h3>
                <div class="shortcut-list">
                    <div class="shortcut-item"><kbd>Shift+D</kbd><span>Mörkt tema</span></div>
                    <div class="shortcut-item"><kbd>Shift+S</kbd><span>Sepia tema</span></div>
                    <div class="shortcut-item"><kbd>Shift+E</kbd><span>E-ink tema</span></div>
                </div>
            </div>

            <!-- Övrigt -->
            <div class="shortcut-category">
                <h3 style="font-size: 16px; color: #333; margin: 0 0 12px 0; font-weight: 600;">⚙️ Övrigt</h3>
                <div class="shortcut-list">
                    <div class="shortcut-item"><kbd>Shift+T</kbd><span>Toggle toolbar</span></div>
                    <div class="shortcut-item"><kbd>M</kbd><span>Multi-import dialog</span></div>
                    <div class="shortcut-item"><kbd>Ctrl+Q</kbd><span>Visa denna dialog</span></div>
                </div>
            </div>
        </div>

        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <button onclick="document.getElementById('keyboardShortcutsDialog').remove()" style="padding: 10px 24px; background: #007acc; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">
                Stäng (ESC)
            </button>
        </div>

        <style>
            .shortcut-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 0;
                font-size: 14px;
            }
            .shortcut-item kbd {
                background: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 4px 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                font-weight: bold;
                color: #333;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                min-width: 50px;
                text-align: center;
            }
            .shortcut-item span {
                flex: 1;
                margin-left: 12px;
                color: #666;
            }
            .shortcut-list {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
        </style>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Close on ESC key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Close on click outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// Resize dialog for geometric shapes
function showResizeDialog(node) {
    // Get current size or defaults
    const currentWidth = node.data('customWidth') || 120;
    const currentHeight = node.data('customHeight') || 120;
    const currentZIndex = node.data('customZIndex') || -1;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    dialog.innerHTML = `
        <h3 style="margin-top: 0; text-align: center;">↗️ Ändra storlek & lager</h3>
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Bredd (px):</label>
            <input type="number" id="resizeWidth" value="${currentWidth}" min="20" max="500" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Höjd (px):</label>
            <input type="number" id="resizeHeight" value="${currentHeight}" min="20" max="500" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Lagerhöjd:</label>
            <select id="layerSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="-1" ${currentZIndex === -1 ? 'selected' : ''}>🔻 Bakgrund (under kort)</option>
                <option value="0" ${currentZIndex === 0 ? 'selected' : ''}>📄 Normal nivå</option>
                <option value="1" ${currentZIndex === 1 ? 'selected' : ''}>🔺 Förgrund (över kort)</option>
            </select>
            <small style="color: #666; display: block; margin-top: 5px;">Bakgrund: figurerna hamnar under korten som underlägg</small>
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="keepAspectRatio" checked>
                <span>Behåll proportioner</span>
            </label>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cancelResize" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Avbryt</button>
            <button id="applyResize" style="padding: 10px 20px; border: none; background: #007acc; color: white; border-radius: 4px; cursor: pointer;">Tillämpa</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus first input
    const widthInput = document.getElementById('resizeWidth');
    const heightInput = document.getElementById('resizeHeight');
    const aspectCheckbox = document.getElementById('keepAspectRatio');
    widthInput.focus();
    
    // Keep aspect ratio functionality
    const originalAspectRatio = currentWidth / currentHeight;
    
    widthInput.addEventListener('input', () => {
        if (aspectCheckbox.checked) {
            heightInput.value = Math.round(widthInput.value / originalAspectRatio);
        }
    });
    
    heightInput.addEventListener('input', () => {
        if (aspectCheckbox.checked) {
            widthInput.value = Math.round(heightInput.value * originalAspectRatio);
        }
    });
    
    // Handle buttons
    document.getElementById('cancelResize').onclick = () => {
        document.body.removeChild(overlay);
    };
    
    document.getElementById('applyResize').onclick = () => {
        const newWidth = parseInt(widthInput.value) || currentWidth;
        const newHeight = parseInt(heightInput.value) || currentHeight;
        const newZIndex = parseInt(document.getElementById('layerSelect').value);
        
        // Apply resize and layer change
        resizeAnnotationNode(node, newWidth, newHeight, newZIndex);
        
        document.body.removeChild(overlay);
    };
    
    // ESC to close
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Enter to apply
    const handleEnter = (e) => {
        if (e.key === 'Enter') {
            document.getElementById('applyResize').click();
            document.removeEventListener('keydown', handleEnter);
        }
    };
    document.addEventListener('keydown', handleEnter);
}

// Show resize dialog for image nodes (maintains aspect ratio)
function showImageResizeDialog(node) {
    // Get current and original dimensions
    const currentWidth = node.data('displayWidth') || 300;
    const imageWidth = node.data('imageWidth');
    const imageHeight = node.data('imageHeight');
    const aspectRatio = imageHeight / imageWidth;
    const currentHeight = Math.round(currentWidth * aspectRatio);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;

    dialog.innerHTML = `
        <h3 style="margin-top: 0; text-align: center;">📏 Ändra bildstorlek</h3>
        <p style="color: #666; font-size: 13px; margin-bottom: 15px;">Original: ${imageWidth}×${imageHeight}px</p>
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Bredd (px):</label>
            <input type="range" id="imageWidthSlider" min="100" max="800" value="${currentWidth}" step="10"
                   style="width: 100%; margin-bottom: 5px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <input type="number" id="imageWidthInput" value="${currentWidth}" min="100" max="800"
                       style="width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                <span id="imageDimensions" style="color: #666; font-size: 13px;">${currentWidth}×${currentHeight}px</span>
            </div>
        </div>
        <div style="margin-bottom: 20px;">
            <p style="color: #888; font-size: 12px; margin: 0;">
                ℹ️ Proportionerna bevaras automatiskt
            </p>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cancelImageResize" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Avbryt</button>
            <button id="applyImageResize" style="padding: 10px 20px; border: none; background: #007acc; color: white; border-radius: 4px; cursor: pointer;">Tillämpa</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Get elements
    const widthSlider = document.getElementById('imageWidthSlider');
    const widthInput = document.getElementById('imageWidthInput');
    const dimensionsDisplay = document.getElementById('imageDimensions');

    // Update display when slider or input changes
    const updateDimensions = () => {
        const width = parseInt(widthSlider.value);
        const height = Math.round(width * aspectRatio);
        widthInput.value = width;
        dimensionsDisplay.textContent = `${width}×${height}px`;
    };

    widthSlider.addEventListener('input', updateDimensions);
    widthInput.addEventListener('input', () => {
        widthSlider.value = widthInput.value;
        updateDimensions();
    });

    // Handle buttons
    document.getElementById('cancelImageResize').onclick = () => {
        document.body.removeChild(overlay);
    };

    document.getElementById('applyImageResize').onclick = () => {
        const newWidth = parseInt(widthSlider.value);
        const newHeight = Math.round(newWidth * aspectRatio);

        // Update node data and styling
        node.data('displayWidth', newWidth);
        node.data('displayHeight', newHeight);
        node.style({
            'width': newWidth + 'px',
            'height': newHeight + 'px'
        });

        console.log(`📏 Resized image to ${newWidth}×${newHeight}px`);
        saveBoard(); // Save changes

        document.body.removeChild(overlay);
    };

    // ESC to close
    const handleEscape = (e) => {
        if (e.key === 'Escape' && document.body.contains(overlay)) {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Enter to apply
    const handleEnter = (e) => {
        if (e.key === 'Enter' && document.body.contains(overlay)) {
            document.getElementById('applyImageResize').click();
            document.removeEventListener('keydown', handleEnter);
        }
    };
    document.addEventListener('keydown', handleEnter);

    // Focus input
    widthInput.focus();
    widthInput.select();
}

// Apply resize and layer change to annotation node
function resizeAnnotationNode(node, newWidth, newHeight, newZIndex = null) {
    console.log('🔧 Resizing annotation node:', node.id(), 'to', newWidth, 'x', newHeight, 'z-index:', newZIndex);
    
    // Store the new size and layer in node data
    node.data('customWidth', newWidth);
    node.data('customHeight', newHeight);
    if (newZIndex !== null) {
        node.data('customZIndex', newZIndex);
    }
    
    // Update the visual properties using Cytoscape style
    cy.batch(() => {
        const styleUpdate = {
            'width': newWidth + 'px',
            'height': newHeight + 'px'
        };
        
        if (newZIndex !== null) {
            // Convert internal z-index to Cytoscape z-index
            let cyZIndex = 1; // default
            if (newZIndex === -1) cyZIndex = 0; // Background
            if (newZIndex === 0) cyZIndex = 1;  // Normal
            if (newZIndex === 1) cyZIndex = 2;  // Foreground
            styleUpdate['z-index'] = cyZIndex;
        }
        
        node.style(styleUpdate);
    });
    
    const layerName = newZIndex === -1 ? 'bakgrund' : newZIndex === 0 ? 'normal' : 'förgrund';
    console.log('✅ Resize and layer change applied successfully, now in:', layerName);
    
    // Save the board to persist changes
    saveBoard();
}

// Font size dialog for geometric shapes
function showFontSizeDialog(node) {
    // Get current font size or default
    const currentFontSize = node.style('font-size') || '16px';
    const currentFontSizeValue = parseInt(currentFontSize.replace('px', ''));
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 350px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    dialog.innerHTML = `
        <h3 style="margin-top: 0; color: #333;">🔤 Ändra fontstorlek</h3>
        <div style="margin: 20px 0;">
            <label for="fontSizeInput" style="display: block; margin-bottom: 5px; font-weight: bold;">Fontstorlek (px):</label>
            <input type="number" id="fontSizeInput" value="${currentFontSizeValue}" min="8" max="72" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
        </div>
        <div style="text-align: right; margin-top: 25px;">
            <button id="cancelFontSize" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ddd; border-radius: 5px; background: white; cursor: pointer;">Avbryt</button>
            <button id="applyFontSize" style="padding: 8px 16px; border: none; border-radius: 5px; background: #007bff; color: white; cursor: pointer;">Tillämpa</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus the input
    document.getElementById('fontSizeInput').focus();
    document.getElementById('fontSizeInput').select();
    
    // Cancel button
    document.getElementById('cancelFontSize').onclick = () => {
        document.body.removeChild(overlay);
    };
    
    // Apply button
    document.getElementById('applyFontSize').onclick = () => {
        const fontSizeInput = document.getElementById('fontSizeInput');
        const newFontSize = parseInt(fontSizeInput.value) || currentFontSizeValue;
        
        // Apply font size change
        changeFontSize(node, newFontSize);
        
        document.body.removeChild(overlay);
    };
    
    // ESC to close
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Enter to apply
    const handleEnter = (e) => {
        if (e.key === 'Enter') {
            document.getElementById('applyFontSize').click();
            document.removeEventListener('keydown', handleEnter);
        }
    };
    document.addEventListener('keydown', handleEnter);
}

// Apply font size change to geometric shape
function changeFontSize(node, newFontSize) {
    console.log('🔤 Changing font size for node:', node.id(), 'to', newFontSize + 'px');
    
    // Store the new font size in node data for persistence
    node.data('customFontSize', newFontSize);
    
    // Update the visual properties using Cytoscape style
    cy.batch(() => {
        node.style('font-size', newFontSize + 'px');
    });
    
    console.log('✅ Font size changed successfully to:', newFontSize + 'px');
    
    // Save the board to persist changes
    saveBoard();
}

// Arrow visibility toggle
function toggleArrowVisibility() {
    console.log('👁️ Toggling arrow visibility...');
    
    const edges = cy.edges();
    const currentOpacity = edges.length > 0 ? edges[0].style('opacity') : 1;
    const newOpacity = currentOpacity == 0 ? 1 : 0;
    
    cy.batch(() => {
        edges.style('opacity', newOpacity);
    });
    
    // Store visibility state globally
    window.arrowsHidden = newOpacity == 0;
    
    console.log('✅ Arrows', newOpacity == 0 ? 'hidden' : 'visible');
    
    // Save the board to persist changes
    saveBoard();
}

// Remove arrows between selected cards
function removeArrowsBetweenSelected() {
    const selectedNodes = cy.$('node:selected');
    const selectedNodeIds = new Set(selectedNodes.map(node => node.id()));
    
    console.log('🗑️ Removing arrows between', selectedNodes.length, 'selected cards...');
    
    // Find edges that connect any two selected nodes
    const edgesToRemove = cy.edges().filter(edge => {
        const sourceId = edge.source().id();
        const targetId = edge.target().id();
        return selectedNodeIds.has(sourceId) && selectedNodeIds.has(targetId);
    });
    
    console.log('Found', edgesToRemove.length, 'arrows to remove between selected cards');
    
    if (edgesToRemove.length > 0) {
        cy.batch(() => {
            edgesToRemove.remove();
        });
        
        console.log('✅ Removed', edgesToRemove.length, 'arrows between selected cards');
        
        // Save the board to persist changes
        saveBoard();
    } else {
        console.log('ℹ️ No arrows found between selected cards');
    }
}

// Bulk tag dialog for multiple selected cards
function showBulkTagDialog(selectedNodes) {
    console.log('🏷️ Opening bulk tag dialog for', selectedNodes.length, 'cards');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    dialog.innerHTML = `
        <h3 style="margin-top: 0; color: #333;">🏷️ Lägg till tagg</h3>
        <p style="color: #666; margin-bottom: 20px;">Lägg till samma tagg på alla ${selectedNodes.length} markerade kort</p>
        <div style="margin: 20px 0;">
            <label for="bulkTagInput" style="display: block; margin-bottom: 5px; font-weight: bold;">Tagg namn:</label>
            <input type="text" id="bulkTagInput" placeholder="skriv tagg här..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
            <small style="color: #888; display: block; margin-top: 5px;">Tips: använd inga mellanslag, t.ex. "viktigt" eller "projekt2025"</small>
        </div>
        <div style="text-align: right; margin-top: 25px;">
            <button id="cancelBulkTag" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ddd; border-radius: 5px; background: white; cursor: pointer;">Avbryt</button>
            <button id="applyBulkTag" style="padding: 8px 16px; border: none; border-radius: 5px; background: #007bff; color: white; cursor: pointer;">Lägg till tagg</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus the input
    const tagInput = document.getElementById('bulkTagInput');
    tagInput.focus();
    
    // Cancel button
    document.getElementById('cancelBulkTag').onclick = () => {
        document.body.removeChild(overlay);
    };
    
    // Apply button
    document.getElementById('applyBulkTag').onclick = () => {
        const tagName = tagInput.value.trim();
        if (tagName) {
            applyBulkTag(selectedNodes, tagName);
            document.body.removeChild(overlay);
        } else {
            tagInput.style.borderColor = 'red';
            tagInput.focus();
        }
    };
    
    // ESC to close
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Enter to apply
    const handleEnter = (e) => {
        if (e.key === 'Enter') {
            document.getElementById('applyBulkTag').click();
            document.removeEventListener('keydown', handleEnter);
        }
    };
    document.addEventListener('keydown', handleEnter);
}

// Apply bulk tag to multiple cards
function applyBulkTag(selectedNodes, tagName) {
    console.log('🏷️ Applying tag "' + tagName + '" to', selectedNodes.length, 'cards');
    
    let addedCount = 0;
    let skippedCount = 0;
    
    selectedNodes.forEach(node => {
        const currentTags = node.data('tags') || [];
        
        // Check if tag already exists (case insensitive)
        const tagExists = currentTags.some(tag => 
            tag.toLowerCase() === tagName.toLowerCase()
        );
        
        if (!tagExists) {
            // Add the tag
            const newTags = [...currentTags, tagName];
            node.data('tags', newTags);
            
            // Apply auto-gray coloring for #done tags
            applyAutoDoneColoring(node);
            
            addedCount++;
            console.log(`Added tag "${tagName}" to card: ${node.data('title') || node.id()}`);
        } else {
            skippedCount++;
            console.log(`Tag "${tagName}" already exists on card: ${node.data('title') || node.id()}`);
        }
    });
    
    // Show success message
    const searchInfo = document.getElementById('searchInfo');
    let message = `🏷️ Tagg "${tagName}" tillagd på ${addedCount} kort`;
    if (skippedCount > 0) {
        message += ` (${skippedCount} kort hade redan taggen)`;
    }
    
    searchInfo.textContent = message;
    searchInfo.classList.add('visible');
    setTimeout(() => {
        searchInfo.classList.remove('visible');
    }, 3000);
    
    console.log(`✅ Bulk tag completed: ${addedCount} added, ${skippedCount} skipped`);
    
    // Save the board to persist changes
    saveBoard();
}

// Color picker system
function showColorPicker(event, nodes) {
    console.log('showColorPicker called with', nodes.length, 'nodes');
    
    // Remove any existing color picker
    hideColorPicker();
    
    // Get mouse position or use event position
    const x = event.clientX || event.pageX || window.innerWidth / 2;
    const y = event.clientY || event.pageY || window.innerHeight / 2;
    console.log('Color picker position:', x, y);
    
    // Create color picker popup
    const picker = document.createElement('div');
    picker.className = 'color-picker-popup';
    picker.style.position = 'fixed';
    picker.style.left = x + 'px';
    picker.style.top = y + 'px';
    picker.style.zIndex = '4000';
    
    // Add title
    const title = document.createElement('div');
    title.className = 'color-picker-title';
    title.textContent = `Välj färg för ${nodes.length} kort`;
    picker.appendChild(title);
    
    // Create color grid
    const colorGrid = document.createElement('div');
    colorGrid.className = 'color-picker-grid';
    
    // Add the 8 color options
    for (let i = 1; i <= 8; i++) {
        const colorDot = document.createElement('div');
        colorDot.className = `color-picker-dot card-color-${i}`;
        colorDot.textContent = i; // Add number inside the dot
        colorDot.style.lineHeight = '26px'; // Center vertically
        colorDot.style.textAlign = 'center'; // Center horizontally
        colorDot.style.fontSize = '14px';
        colorDot.style.fontWeight = 'bold';
        colorDot.style.color = '#333';
        colorDot.style.textShadow = '0 0 3px rgba(255,255,255,0.8)';
        colorDot.onclick = () => {
            console.log(`Clicked color ${i}, applying to ${nodes.length} cards`);
            // Apply color to all nodes
            nodes.forEach(node => {
                console.log(`Setting color card-color-${i} on node:`, node.id());
                node.data('cardColor', `card-color-${i}`);
                // Update cytoscape styling immediately
                const colorValue = getCardColorValue(`card-color-${i}`, getCurrentTheme());
                console.log(`Color value:`, colorValue);
                node.style('background-color', colorValue);
            });

            // Save immediately to prevent data loss from autosave/Drive sync
            saveBoard();

            hideColorPicker();
            console.log(`Applied color ${i} to ${nodes.length} cards`);
        };
        colorGrid.appendChild(colorDot);
    }
    
    picker.appendChild(colorGrid);
    
    // Add cancel button
    const cancelBtn = document.createElement('div');
    cancelBtn.className = 'color-picker-cancel';
    cancelBtn.textContent = 'Avbryt';
    cancelBtn.onclick = hideColorPicker;
    picker.appendChild(cancelBtn);
    
    console.log('Adding picker to body:', picker);
    document.body.appendChild(picker);
    console.log('Picker added, should be visible now');
    
    // Close picker on click elsewhere
    setTimeout(() => {
        currentClickHandler = function(e) {
            if (!picker.contains(e.target)) {
                hideColorPicker();
            }
        };
        document.addEventListener('click', currentClickHandler);
    }, 100);
}

let currentClickHandler = null;

function hideColorPicker() {
    const existingPicker = document.querySelector('.color-picker-popup');
    if (existingPicker) {
        existingPicker.remove();
    }
    // Remove the click handler if it exists
    if (currentClickHandler) {
        document.removeEventListener('click', currentClickHandler);
        currentClickHandler = null;
    }
    console.log('Color picker hidden and event listeners cleaned up');
}

function removeCardColor(node) {
    node.removeData('cardColor');
    // Reset to default theme color
    const theme = getCurrentTheme();
    const defaultColor = theme === 'dark' ? '#2a2a2a' : (theme === 'sepia' ? '#f5f5dc' : '#ffffff');
    node.style('background-color', defaultColor);
    console.log('Removed color from card:', node.id());
}

function getCurrentTheme() {
