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

    // Add image source options for mobile background long press
    if (!node && isMobileDevice()) {
        const pasteOption = document.createElement('div');
        pasteOption.className = 'context-menu-item';
        pasteOption.innerHTML = '📋 Klistra in';
        pasteOption.onclick = async () => {
            hideContextMenu();
            try {
                await pasteClipboardContent(x, y);
            } catch (err) {
                console.error('Clipboard paste failed:', err);
                alert('Kunde inte klistra in från clipboard. Kontrollera behörigheter.');
            }
        };
        menu.appendChild(pasteOption);

        const cameraOption = document.createElement('div');
        cameraOption.className = 'context-menu-item';
        cameraOption.innerHTML = '📷 Ta foto';
        cameraOption.onclick = () => {
            hideContextMenu();
            document.getElementById('hiddenCameraInput').click();
        };
        menu.appendChild(cameraOption);

        const galleryOption = document.createElement('div');
        galleryOption.className = 'context-menu-item';
        galleryOption.innerHTML = '🖼️ Välj från galleri';
        galleryOption.onclick = () => {
            hideContextMenu();
            document.getElementById('hiddenGalleryInput').click();
        };
        menu.appendChild(galleryOption);

        const fileOption = document.createElement('div');
        fileOption.className = 'context-menu-item';
        fileOption.innerHTML = '📁 Välj fil';
        fileOption.onclick = () => {
            hideContextMenu();
            document.getElementById('hiddenGalleryInput').click();
        };
        menu.appendChild(fileOption);

        // Add a separator
        const separator = document.createElement('div');
        separator.style.height = '1px';
        separator.style.backgroundColor = '#eee';
        separator.style.margin = '8px 0';
        menu.appendChild(separator);
    }
    
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

        const readWithGeminiOption = document.createElement('div');
        readWithGeminiOption.className = 'context-menu-item';
        readWithGeminiOption.innerHTML = '✨ Läs med Gemini';
        readWithGeminiOption.onclick = () => {
            hideContextMenu();
            readImageWithGemini(node);
        };
        menu.appendChild(readWithGeminiOption);
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

function showKeyboardShortcutsDialog() {
    const shortcuts = {
        'Global': {
            'Ctrl+K': 'Open Command Palette',
            'N': 'New Card',
            'Ctrl+S': 'Save Board',
            'Ctrl+O': 'Load Board',
            'Ctrl+Q': 'Show Shortcuts',
            'Ctrl+H': 'Show User Manual',
        },
        'Card Selection': {
            'Ctrl+Click': 'Select Multiple Cards',
            'Ctrl+A': 'Select All Cards',
            'Delete': 'Delete Selected Cards',
            'P': 'Pin Selected Cards',
            'U': 'Unpin Selected Cards',
            'C': 'Copy Selected Cards',
        },
        'Arrangement': {
            'V': 'Arrange in Column',
            'H': 'Arrange in Row',
            'G+V': 'Arrange in Vertical Grid',
            'G+H': 'Arrange in Horizontal Grid',
            'G+T': 'Arrange in Top-Aligned Grid',
            'Q': 'Cluster/Stack Cards',
        }
    };

    let dialogContent = '<div style="max-height: 70vh; overflow-y: auto;">';
    for (const category in shortcuts) {
        dialogContent += `<h3>${category}</h3><ul style="list-style: none; padding: 0;">`;
        for (const shortcut in shortcuts[category]) {
            dialogContent += `<li style="display: flex; justify-content: space-between; padding: 4px 0;"><span>${shortcuts[category][shortcut]}</span><span style="background: #eee; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${shortcut}</span></li>`;
        }
        dialogContent += '</ul>';
    }
    dialogContent += '</div>';

    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 10002; max-width: 500px; width: 90%;';
    dialog.innerHTML = `<h2>Keyboard Shortcuts</h2>${dialogContent}<button onclick="this.parentElement.remove()" style="margin-top: 20px; padding: 8px 16px; width: 100%;">Close</button>`;
    document.body.appendChild(dialog);
}

function showUserManual() {
    const manualContent = `
        <h2>Welcome to Spatial Notes!</h2>
        <p>This is a visual tool to help you organize your thoughts and ideas. Here are some tips to get you started:</p>
        <ul>
            <li><strong>Create Cards:</strong> Double-click on the canvas to create a new card, or use the 'N' key.</li>
            <li><strong>Edit Cards:</strong> Double-click on a card to edit its content and tags.</li>
            <li><strong>Arrange Cards:</strong> Select one or more cards and use the arrangement commands (V, H, G+V, etc.) to organize them.</li>
            <li><strong>Command Palette:</strong> Press Ctrl+K (or Cmd+K) to open the command palette and access all available commands.</li>
            <li><strong>AI Assistant:</strong> Use the AI assistants to automatically sort and organize your cards.</li>
        </ul>
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 10002; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;';
    dialog.innerHTML = `${manualContent}<button onclick="this.parentElement.remove()" style="margin-top: 20px; padding: 8px 16px; width: 100%;">Close</button>`;
    document.body.appendChild(dialog);
}

function showResizeDialog(node) {
    // ... (implementation in annotation.js)
}

function showImageResizeDialog(node) {
    // ... (implementation in image-handling.js)
}

function showFontSizeDialog(node) {
    // ... (implementation in annotation.js)
}

function showBulkTagDialog(selectedNodes) {
    // ... (implementation in card-editing.js)
}

function showColorPicker(event, nodes) {
    // ... (implementation in card-editing.js)
}

function hideColorPicker() {
    // ... (implementation in card-editing.js)
}

function showMultiCardPasteDialog() {
    // ... (implementation in card-creation.js)
}

function createCardFromForm(x, y, selectedColor = '') {
    // ... (implementation in card-creation.js)
}

function showCodeDialog(x, y) {
    // ... (implementation in card-creation.js)
}

function createCardFromCode(x, y, input) {
    // ... (implementation in card-creation.js)
}

function showQuickNoteDialog() {
    // ... (implementation in card-creation.js)
}

function createCardFromQuickNote(input) {
    // ... (implementation in card-creation.js)
}

function showAIQueryDialog() {
    // ... (implementation in ai-assistant.js)
}

function showClaudeAPIKeyDialog() {
    // ... (implementation in ai-assistant.js)
}

function showProjectManager() {
    // ... (implementation in google-drive.js)
}

function closeProjectManager(event) {
    // ... (implementation in google-drive.js)
}

function showExportMenu() {
    // ... (implementation in save-load.js)
}

function showSortMenu(event) {
    // ... (implementation in sorting-temporal.js)
}

function closeSortMenu() {
    // ... (implementation in sorting-temporal.js)
}

function showColumnViewSortMenu(event) {
    // ... (implementation in column-view.js)
}

function showMobileCardMenu(touch, nodeId) {
    // ... (implementation in column-view.js)
}

function showTagInputDialog(callback) {
    // ... (implementation in column-view.js)
}

function showTagSelectionDialog(tagList, callback) {
    // ... (implementation in column-view.js)
}

function showGoogleDriveSignInPrompt() {
    // ... (implementation in google-drive.js)
}

function showRememberMeDialog() {
    // ... (implementation in google-drive.js)
}