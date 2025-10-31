
document.addEventListener('DOMContentLoaded', () => {
    const commands = [
        // File Operations
        { id: 'save-board', title: '💾 Save to LocalStorage', shortcut: 'Ctrl+S', action: () => saveBoard() },
        { id: 'save-google-drive', title: '💾 Save to Google Drive', action: () => saveToGoogleDriveWithStructure() },
        { id: 'save-file', title: '💾 Save to File', action: () => saveWithTimestamp() },
        { id: 'save-as', title: '💾 Save As...', action: () => saveAs() },
        { id: 'load-file', title: '📂 Load from File', action: () => loadBoard() },
        { id: 'export-json', title: '📤 Export to JSON', action: () => exportToJSON() },
        { id: 'import-json', title: '📥 Import from JSON', action: () => importFromJSON() },
        { id: 'import-pdf-extractor', title: '📥 Import from PDF-Extractor', action: () => importFromExtractor() },
        { id: 'import-zotero', title: '📚 Import from Zotero', action: () => document.getElementById('zoteroHtmlInput').click() },

        // AI & Tools
        { id: 'ai-chatgpt', title: '🤖 ChatGPT Sorter', action: () => toggleAiPanel() },
        { id: 'ai-claude', title: '🤖 Claude AI Assistant', action: () => toggleAIPanel() },
        { id: 'reset-gemini-key', title: '🔑 Reset Google AI API Key', action: () => { localStorage.removeItem('googleAiApiKey'); alert('Google AI API Key has been reset.'); } },

        // Annotation
        { id: 'annotation-tools', title: '🎨 Toggle Annotation Tools', shortcut: 'D', action: () => toggleAnnotationToolbar() },
        { id: 'select-tool', title: '🔍 Annotation: Select Tool', action: () => setAnnotationMode('select') },
        { id: 'rect-tool', title: '⬜ Annotation: Rectangle Tool', action: () => setAnnotationMode('rect') },
        { id: 'circle-tool', title: '⭕ Annotation: Circle Tool', action: () => setAnnotationMode('circle') },
        { id: 'text-small-tool', title: '🅰️ Annotation: Small Text', action: () => setAnnotationMode('text-small') },
        { id: 'arrow-tool', title: '→ Annotation: Arrow Tool', action: () => setAnnotationMode('arrow') },

        // Settings & View
        { id: 'column-view', title: '📋 Toggle Column/Board View', shortcut: 'K', action: () => toggleView() },
        { id: 'toggle-theme', title: '🎨 Cycle Theme', shortcut: 'Shift+D', action: () => toggleDarkTheme() },
        { id: 'show-shortcuts', title: '⌨️ Show Keyboard Shortcuts', shortcut: 'Ctrl+Q', action: () => showKeyboardShortcutsDialog() },
        { id: 'show-manual', title: '❓ Show User Manual', shortcut: 'Ctrl+H', action: () => showUserManual() },
        { id: 'toggle-metadata', title: '⚙️ Toggle Metadata View', action: () => toggleMetadataView() },
        { id: 'debug-positions', title: '🐛 Debug Positions', action: () => debugDumpPositions() },
        { id: 'clear-board', title: '🗑️ Clear Board', action: () => clearBoard() },

        // Card Actions
        { id: 'add-new-card', title: '➕ Add New Card', shortcut: 'N', action: () => addNewCard() },
        { id: 'copy-selected', title: '📋 Copy Selected Cards', shortcut: 'C', action: () => copySelectedCards() },
        { id: 'pin-selected', title: '📌 Pin Selected Cards', shortcut: 'P', action: () => pinSelectedCards() },
        { id: 'unpin-selected', title: '🔓 Unpin Selected Cards', shortcut: 'U', action: () => unpinSelectedCards() },
        { id: 'delete-selected', title: '🗑️ Delete Selected Cards', shortcut: 'Delete', action: () => deleteSelectedCards() },
        { id: 'select-all', title: '✨ Select All Cards', shortcut: 'Ctrl+A', action: () => cy.nodes().not('.pinned').select() },

        // Arrangement
        { id: 'arrange-column', title: '↕️ Arrange in Column', shortcut: 'V', action: () => arrangeSelectedInColumn() },
        { id: 'arrange-row', title: '↔️ Arrange in Row', shortcut: 'H', action: () => arrangeSelectedInRow() },
        { id: 'arrange-grid-vertical', title: '🚦 Arrange in Vertical Grid', shortcut: 'G+V', action: () => arrangeSelectedGridVerticalColumns() },
        { id: 'arrange-grid-horizontal', title: '🚥 Arrange in Horizontal Grid', shortcut: 'G+H', action: () => arrangeSelectedGridHorizontalPacked() },
        { id: 'arrange-grid-top', title: '📈 Arrange in Top-Aligned Grid', shortcut: 'G+T', action: () => arrangeSelectedGridTopAligned() },
        { id: 'cluster-cards', title: '👨‍👩‍👧‍👦 Cluster Selected Cards', shortcut: 'Q', action: () => clusterSelectedCards() },
        { id: 'stack-cards', title: '📚 Stack Selected Cards', shortcut: 'QQ / Alt+S', action: () => stackSelectedCards() },
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
            const filteredCommands = commands.filter(cmd => cmd.title.toLowerCase().includes(filter.toLowerCase()));
            resultsContainer.innerHTML = filteredCommands.map((cmd, index) => `
                <div class="command-palette-item ${index === selectedIndex ? 'selected' : ''}" data-command-id="${cmd.id}">
                    <span>${cmd.title}</span>
                    ${cmd.shortcut ? `<span class="shortcut">${cmd.shortcut}</span>` : ''}
                </div>
            `).join('');

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
                items[selectedIndex].scrollIntoView({ block: 'nearest' });
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
});
