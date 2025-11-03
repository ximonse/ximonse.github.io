
document.addEventListener('DOMContentLoaded', () => {
    // Wait for all functions to be loaded
    setTimeout(() => {
    const commands = [
        // Save & Google Drive (Top Priority)
        { id: 'save-board', category: 'Save & Google Drive', title: '💾 Save to LocalStorage', shortcut: 'Ctrl+S', action: () => window.saveBoard() },
        { id: 'save-google-drive', category: 'Save & Google Drive', title: '💾 Save to Google Drive', action: () => window.saveToGoogleDriveWithStructure() },
        { id: 'google-drive-projects', category: 'Save & Google Drive', title: '📁 Browse Google Drive Projects', action: () => window.showProjectManager() },
        { id: 'google-drive-auth', category: 'Save & Google Drive', title: '🔗 Google Drive Sign In/Out', action: () => window.toggleGoogleDriveAuth() },

        // File Operations
        { id: 'save-file', category: 'File Operations', title: '💾 Save to File', action: () => window.saveWithTimestamp() },
        { id: 'save-as', category: 'File Operations', title: '💾 Save As...', action: () => window.saveAs() },
        { id: 'load-file', category: 'File Operations', title: '📂 Load from File', action: () => window.loadBoard() },
        { id: 'export-json', category: 'File Operations', title: '📤 Export to JSON', action: () => window.exportToJSON() },
        { id: 'import-json', category: 'File Operations', title: '📥 Import from JSON', action: () => window.importFromJSON() },
        { id: 'import-pdf-extractor', category: 'File Operations', title: '📥 Import from PDF-Extractor', action: () => window.importFromExtractor() },
        { id: 'import-zotero', category: 'File Operations', title: '📚 Import from Zotero', action: () => document.getElementById('zoteroHtmlInput').click() },

        // Card Creation & Import
        { id: 'add-new-card', category: 'Card Creation', title: '➕ Add New Card', shortcut: 'N', action: () => window.addNewCard() },
        { id: 'multi-import', category: 'Card Creation', title: '📋 Multi-Import (Create Multiple Cards)', shortcut: 'M', action: () => window.showMultiCardPasteDialog() },
        { id: 'image-upload', category: 'Card Creation', title: '📷 Upload Images', action: () => window.triggerImageUpload() },
        { id: 'smart-search', category: 'Card Creation', title: '🔍 Smart Search with Auto-Sort', action: () => window.showSmartSearchDialog() },

        // Search & Navigation
        { id: 'focus-search', category: 'Search & Navigation', title: '🔎 Focus Search Field', shortcut: 'F', action: () => document.getElementById('searchInput').focus() },
        { id: 'sort-menu', category: 'Search & Navigation', title: '📊 Show Sort Menu', shortcut: 'O', action: () => window.showSortMenu(event) },

        // Colors
        { id: 'color-picker', category: 'Colors', title: '🎨 Open Color Picker', shortcut: 'T', action: () => { const sel = cy.$('node:selected'); if (sel.length > 0) showColorPicker({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }, sel); } },
        { id: 'remove-color', category: 'Colors', title: '⚪ Remove Color from Selected', shortcut: '0', action: () => { cy.$('node:selected').forEach(n => removeCardColor(n)); saveBoard(); } },
        { id: 'apply-color-1', category: 'Colors', title: '🟢 Apply Color 1 (Green)', shortcut: '1', action: () => { cy.$('node:selected').forEach(n => { n.data('cardColor', 'card-color-1'); n.style('background-color', getCardColorValue('card-color-1', getCurrentTheme())); }); saveBoard(); } },
        { id: 'apply-color-2', category: 'Colors', title: '🟠 Apply Color 2 (Orange)', shortcut: '2', action: () => { cy.$('node:selected').forEach(n => { n.data('cardColor', 'card-color-2'); n.style('background-color', getCardColorValue('card-color-2', getCurrentTheme())); }); saveBoard(); } },
        { id: 'apply-color-3', category: 'Colors', title: '🔴 Apply Color 3 (Red)', shortcut: '3', action: () => { cy.$('node:selected').forEach(n => { n.data('cardColor', 'card-color-3'); n.style('background-color', getCardColorValue('card-color-3', getCurrentTheme())); }); saveBoard(); } },
        { id: 'apply-color-4', category: 'Colors', title: '🟡 Apply Color 4 (Yellow)', shortcut: '4', action: () => { cy.$('node:selected').forEach(n => { n.data('cardColor', 'card-color-4'); n.style('background-color', getCardColorValue('card-color-4', getCurrentTheme())); }); saveBoard(); } },
        { id: 'apply-color-5', category: 'Colors', title: '🟣 Apply Color 5 (Purple)', shortcut: '5', action: () => { cy.$('node:selected').forEach(n => { n.data('cardColor', 'card-color-5'); n.style('background-color', getCardColorValue('card-color-5', getCurrentTheme())); }); saveBoard(); } },
        { id: 'apply-color-6', category: 'Colors', title: '🔵 Apply Color 6 (Blue)', shortcut: '6', action: () => { cy.$('node:selected').forEach(n => { n.data('cardColor', 'card-color-6'); n.style('background-color', getCardColorValue('card-color-6', getCurrentTheme())); }); saveBoard(); } },
        { id: 'apply-color-7', category: 'Colors', title: '⚫ Apply Color 7 (Gray)', shortcut: '7', action: () => { cy.$('node:selected').forEach(n => { n.data('cardColor', 'card-color-7'); n.style('background-color', getCardColorValue('card-color-7', getCurrentTheme())); }); saveBoard(); } },
        { id: 'apply-color-8', category: 'Colors', title: '⚪ Apply Color 8 (White)', shortcut: '8', action: () => { cy.$('node:selected').forEach(n => { n.data('cardColor', 'card-color-8'); n.style('background-color', getCardColorValue('card-color-8', getCurrentTheme())); }); saveBoard(); } },

        // Card Actions
        { id: 'copy-selected', category: 'Card Actions', title: '📋 Copy Selected Cards', shortcut: 'C', action: () => window.copySelectedCards() },
        { id: 'pin-selected', category: 'Card Actions', title: '📌 Pin Selected Cards', shortcut: 'P', action: () => window.pinSelectedCards() },
        { id: 'unpin-selected', category: 'Card Actions', title: '🔓 Unpin Selected Cards', shortcut: 'U', action: () => window.unpinSelectedCards() },
        { id: 'delete-selected', category: 'Card Actions', title: '🗑️ Delete Selected Cards', shortcut: 'Delete', action: () => window.deleteSelectedCards() },
        { id: 'select-all', category: 'Card Actions', title: '✨ Select All Cards', shortcut: 'Ctrl+A', action: () => cy.nodes().not('.pinned').select() },

        // Tags
        { id: 'add-tag', category: 'Tags', title: '🏷️ Add Tag to Selected Cards', action: () => window.addTagToSelected() },
        { id: 'remove-tag', category: 'Tags', title: '🏷️ Remove Tag from Selected Cards', action: () => window.removeTagFromSelected() },

        // Arrangement
        { id: 'arrange-column', category: 'Arrangement', title: '↕️ Arrange in Column', shortcut: 'V', action: () => window.arrangeSelectedInColumn() },
        { id: 'arrange-row', category: 'Arrangement', title: '↔️ Arrange in Row', shortcut: 'H', action: () => window.arrangeSelectedInRow() },
        { id: 'arrange-grid-vertical', category: 'Arrangement', title: '🚦 Arrange in Vertical Grid', shortcut: 'G+V', action: () => window.arrangeSelectedGridVerticalColumns() },
        { id: 'arrange-grid-horizontal', category: 'Arrangement', title: '🚥 Arrange in Horizontal Grid', shortcut: 'G+H', action: () => window.arrangeSelectedGridHorizontalPacked() },
        { id: 'arrange-grid-top', category: 'Arrangement', title: '📈 Arrange in Top-Aligned Grid', shortcut: 'G+T', action: () => window.arrangeSelectedGridTopAligned() },
        { id: 'cluster-cards', category: 'Arrangement', title: '👨‍👩‍👧‍👦 Cluster Selected Cards', shortcut: 'Q', action: () => window.clusterSelectedCards() },
        { id: 'stack-cards', category: 'Arrangement', title: '📚 Stack Selected Cards', shortcut: 'QQ / Alt+S', action: () => window.stackSelectedCards() },
        { id: 'circular-swarm', category: 'Arrangement', title: '⭕ Circular Swarm Arrangement', shortcut: 'X', action: () => window.arrangeCircularSwarm() },
        { id: 'force-directed', category: 'Arrangement', title: '🌐 Force-Directed Physics Layout', shortcut: 'B', action: () => window.layoutWithConnections() },

        // Arrows
        { id: 'toggle-arrows', category: 'Arrows', title: '↔️ Toggle Arrow Visibility', action: () => window.toggleArrowVisibility() },
        { id: 'remove-arrows-between', category: 'Arrows', title: '✂️ Remove Arrows Between Selected', action: () => window.removeArrowsBetweenSelected() },

        // Column View
        { id: 'column-view', category: 'Column View', title: '📋 Toggle Column/Board View', shortcut: 'K', action: () => window.toggleView() },
        { id: 'sort-importance', category: 'Column View', title: '⚡ Sort by Importance', shortcut: 'I', action: () => window.setColumnViewSort('importance') },
        { id: 'sort-background-color', category: 'Column View', title: '🎨 Sort by Background Color', shortcut: 'W', action: () => window.setColumnViewSort('background-color') },

        // AI & Tools
        { id: 'ai-chatgpt', category: 'AI & Tools', title: '🤖 ChatGPT Sorter', action: () => window.toggleAiPanel() },
        { id: 'ai-claude', category: 'AI & Tools', title: '🤖 Claude AI Assistant', action: () => window.toggleAIPanel() },
        { id: 'batch-ocr-selected', category: 'AI & Tools', title: '📸 OCR Selected Images with Gemini', action: () => {
            const selectedNodes = cy.$('node:selected');
            const imageNodes = selectedNodes.filter(n => n.data('type') === 'image');
            if (imageNodes.length > 0) {
                batchGeminiOCR(imageNodes);
            } else {
                alert('Inga bildkort är markerade. Markera bildkort först.');
            }
        }},
        { id: 'reset-gemini-key', category: 'AI & Tools', title: '🔑 Reset Google AI API Key', action: () => { localStorage.removeItem('googleAiApiKey'); alert('Google AI API Key has been reset.'); } },

        // Annotation
        { id: 'annotation-tools', category: 'Annotation', title: '🎨 Toggle Annotation Tools', shortcut: 'D', action: () => window.toggleAnnotationToolbar() },
        { id: 'select-tool', category: 'Annotation', title: '🔍 Select Tool', action: () => window.setAnnotationMode('select') },
        { id: 'rect-tool', category: 'Annotation', title: '⬜ Rectangle Tool', action: () => window.setAnnotationMode('rect') },
        { id: 'circle-tool', category: 'Annotation', title: '⭕ Circle Tool', action: () => window.setAnnotationMode('circle') },
        { id: 'text-small-tool', category: 'Annotation', title: '🅰️ Small Text', action: () => window.setAnnotationMode('text-small') },
        { id: 'arrow-tool', category: 'Annotation', title: '→ Arrow Tool', action: () => window.setAnnotationMode('arrow') },

        // Settings & View
        { id: 'toggle-simplified-toolbar', category: 'Settings', title: '☰ Toggle Simplified/Full Toolbar', shortcut: 'Shift+T', action: () => window.toggleSimplifiedToolbar() },
        { id: 'toggle-theme', category: 'Settings', title: '🌙 Cycle Theme (Light/Dark)', shortcut: 'Shift+D', action: () => window.toggleDarkTheme() },
        { id: 'sepia-theme', category: 'Settings', title: '📜 Sepia Theme', shortcut: 'Shift+S', action: () => window.toggleSepiaTheme() },
        { id: 'eink-theme', category: 'Settings', title: '📄 E-Ink Theme', shortcut: 'Shift+E', action: () => window.toggleEInkTheme() },
        { id: 'show-shortcuts', category: 'Settings', title: '⌨️ Show Keyboard Shortcuts', shortcut: 'Ctrl+Q', action: () => window.showKeyboardShortcutsDialog() },
        { id: 'show-manual', category: 'Settings', title: '❓ Show User Manual', shortcut: 'Ctrl+H', action: () => window.showUserManual() },
        { id: 'toggle-metadata', category: 'Settings', title: '⚙️ Toggle Metadata View', action: () => window.toggleMetadataView() },
        { id: 'debug-positions', category: 'Settings', title: '🐛 Debug Positions', action: () => window.debugDumpPositions() },
        { id: 'clear-board', category: 'Settings', title: '🗑️ Clear Board', action: () => window.clearBoard() },
    ];

    let commandPaletteOverlay = document.createElement('div');
    commandPaletteOverlay.className = 'command-palette-overlay';
    document.body.appendChild(commandPaletteOverlay);

    window.showCommandPalette = function() {
        commandPaletteOverlay.innerHTML = `
            <div class="command-palette">
                <input type="text" class="command-palette-input" placeholder="Type a command...">
                <div class="command-palette-results"></div>
            </div>
        `;
        commandPaletteOverlay.style.display = 'flex';

        const input = commandPaletteOverlay.querySelector('.command-palette-input');
        const resultsContainer = commandPaletteOverlay.querySelector('.command-palette-results');
        let selectedIndex = 0;

        function renderResults(filter = '') {
            const filteredCommands = commands.filter(cmd =>
                cmd.title.toLowerCase().includes(filter.toLowerCase()) ||
                cmd.category.toLowerCase().includes(filter.toLowerCase())
            );

            // Group commands by category
            const grouped = {};
            let totalIndex = 0;
            filteredCommands.forEach(cmd => {
                if (!grouped[cmd.category]) {
                    grouped[cmd.category] = [];
                }
                grouped[cmd.category].push({...cmd, globalIndex: totalIndex++});
            });

            // Render with category headers
            let html = '';
            Object.keys(grouped).forEach(category => {
                html += `<div class="command-palette-category">${category}</div>`;
                grouped[category].forEach(cmd => {
                    html += `
                        <div class="command-palette-item ${cmd.globalIndex === selectedIndex ? 'selected' : ''}" data-command-id="${cmd.id}" data-index="${cmd.globalIndex}">
                            <span>${cmd.title}</span>
                            ${cmd.shortcut ? `<span class="shortcut">${cmd.shortcut}</span>` : ''}
                        </div>
                    `;
                });
            });

            resultsContainer.innerHTML = html;

            resultsContainer.querySelectorAll('.command-palette-item').forEach(item => {
                item.addEventListener('click', () => {
                    const commandId = item.getAttribute('data-command-id');
                    const command = commands.find(cmd => cmd.id === commandId);
                    if (command) {
                        command.action();
                        hideCommandPalette();
                    }
                });
            });
        }

        function selectItem(index) {
            const items = resultsContainer.querySelectorAll('.command-palette-item');
            if (index >= 0 && index < items.length) {
                selectedIndex = index;
                renderResults(input.value);
                // Ensure selected item is always visible and centered
                const selectedItem = resultsContainer.querySelectorAll('.command-palette-item')[selectedIndex];
                if (selectedItem) {
                    selectedItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            }
        }

        input.addEventListener('input', () => {
            selectedIndex = 0;
            renderResults(input.value);
        });

        input.addEventListener('keydown', (e) => {
            const items = resultsContainer.querySelectorAll('.command-palette-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectItem((selectedIndex + 1) % items.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectItem((selectedIndex - 1 + items.length) % items.length);
            } else if (e.key === 'Enter') {
                const selectedItem = resultsContainer.querySelector('.command-palette-item.selected');
                if (selectedItem) {
                    selectedItem.click();
                }
            } else if (e.key === 'Escape') {
                hideCommandPalette();
            }
        });

        renderResults();
        input.focus();
    }

    function hideCommandPalette() {
        commandPaletteOverlay.style.display = 'none';
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (commandPaletteOverlay.style.display === 'flex') {
                hideCommandPalette();
            } else {
                showCommandPalette();
            }
        }
    });

    commandPaletteOverlay.addEventListener('click', (e) => {
        if (e.target === commandPaletteOverlay) {
            hideCommandPalette();
        }
    });
    }, 100); // End of setTimeout - wait for functions to load
});
