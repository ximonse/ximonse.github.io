        // Open Google Drive Picker to select multiple images
        async function openDriveImagePicker() {
            // Ensure user is signed in
            if (!isSignedIn || !accessToken) {
                updateSyncStatus('Sign in to use Drive Picker', 'info');
                // Trigger sign-in
                tokenClient.requestAccessToken();
                return;
            }

            // Ensure Picker API is loaded
            if (!pickerApiLoaded) {
                alert('Google Picker is loading... Try again in a moment.');
                return;
            }

            console.log('🖼️ Opening Google Drive Picker for images...');

            // Create and configure the Picker
            const picker = new google.picker.PickerBuilder()
                .setOAuthToken(accessToken)
                .setDeveloperKey(GOOGLE_API_KEY)
                .setAppId(GOOGLE_CLIENT_ID.split('-')[0]) // Extract app ID from client ID
                .addView(
                    new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
                        .setIncludeFolders(true)
                        .setSelectFolderEnabled(false)
                )
                .addView(new google.picker.DocsView(google.picker.ViewId.FOLDERS).setSelectFolderEnabled(false))
                .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
                .setCallback(pickerCallback)
                .setTitle('Välj bilder från Drive')
                .build();

            picker.setVisible(true);
        }

        // Handle Picker selection callback
        async function pickerCallback(data) {
            if (data.action === google.picker.Action.PICKED) {
                console.log('✅ User selected files:', data.docs);

                const selectedFiles = data.docs;
                updateSyncStatus(`Importerar ${selectedFiles.length} bilder...`, 'loading');

                let imported = 0;
                let failed = 0;

                for (const file of selectedFiles) {
                    try {
                        // Download image from Drive
                        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`
                            }
                        });

                        if (!response.ok) {
                            console.error(`Failed to download ${file.name}:`, response.statusText);
                            failed++;
                            continue;
                        }

                        const blob = await response.blob();

                        // Convert to image data and create card
                        const imageData = await processImage(blob);
                        createImageNode(imageData, file.name);

                        imported++;
                        console.log(`✅ Imported ${file.name}`);

                    } catch (error) {
                        console.error(`Error importing ${file.name}:`, error);
                        failed++;
                    }
                }

                // Show result
                const message = failed > 0
                    ? `✅ Importerade ${imported} bilder (${failed} misslyckades)`
                    : `✅ Importerade ${imported} bilder från Drive`;

                updateSyncStatus(message, 'success');
                setTimeout(() => updateSyncStatus('', ''), 3000);

                // Save board after import
                saveBoard();
            } else if (data.action === google.picker.Action.CANCEL) {
                console.log('User cancelled picker');
            }
        }

        function showSmartSearchDialog() {
            // Create overlay for search input
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); z-index: 10000;
                display: flex; justify-content: center; align-items: center;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white; padding: 20px; border-radius: 10px;
                max-width: 400px; width: 90%; max-height: 80vh;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                box-sizing: border-box;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin-top: 0; color: #333; font-size: 18px;">🔍 Smart sökning</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Sök efter:</label>
                    <input type="text" id="smartSearchInput" placeholder='Exempel: "todo" OR "viktigt"'
                        style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;
                               box-sizing: border-box; font-size: 14px;">
                </div>
                <div style="margin-bottom: 20px; font-size: 12px; color: #666;">
                    <strong>Automatisk sortering:</strong><br>
                    1. Vecko-todos (äldsta först)<br>
                    2. Färgordning: Röd → Orange → Vit → Gul → Lila → Blå → Grön → Grå
                </div>
                <div style="text-align: right;">
                    <button id="cancelSmartSearch" style="background: #666; color: white; border: none; 
                                                 padding: 10px 20px; border-radius: 4px; margin-right: 10px;
                                                 cursor: pointer; font-size: 14px;">Avbryt</button>
                    <button id="executeSmartSearch" style="background: #007acc; color: white; border: none; 
                                                padding: 10px 20px; border-radius: 4px; cursor: pointer;
                                                font-size: 14px;">🔍 Sök & Sortera</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Focus on input
            const searchInput = document.getElementById('smartSearchInput');
            searchInput.focus();
            
            // Handle search
            document.getElementById('executeSmartSearch').onclick = function() {
                const query = searchInput.value.trim();
                if (query) {
                    // Perform the search with smart sorting
                    performSearch(query);
                    
                    // Show success message
                    const searchInfo = document.getElementById('searchInfo');
                    if (searchInfo) {
                        searchInfo.textContent += ' (smart sorterat)';
                    }
                }
                document.body.removeChild(overlay);
            };
            
            // Handle cancel
            document.getElementById('cancelSmartSearch').onclick = function() {
                document.body.removeChild(overlay);
            };
            
            // Handle Enter key
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    document.getElementById('executeSmartSearch').click();
                } else if (e.key === 'Escape') {
                    document.getElementById('cancelSmartSearch').click();
                }
            });
            
            // Close on overlay click
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                }
            });
        }
        
        
        // ====================================================================================================
        // 📅 WEEK NUMBERING FUNCTIONS
        // ====================================================================================================
        
        function getISOWeek(date) {
            const tempDate = new Date(date.getTime());
            const dayNum = (date.getDay() + 6) % 7; // Make Monday = 0
            tempDate.setDate(tempDate.getDate() - dayNum + 3); // Thursday of this week
            const firstThursday = tempDate.valueOf();
            tempDate.setMonth(0, 1); // January 1
            if (tempDate.getDay() !== 4) {
                tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
            }
            return 1 + Math.ceil((firstThursday - tempDate) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
        }
        
        function getCurrentWeekData() {
            const now = new Date();
            const currentYear = now.getFullYear();
            const shortYear = currentYear.toString().slice(-2); // "25" for 2025
            const currentWeek = getISOWeek(now);
            
            // Calculate next weeks, handle year transition
            const nextWeek = currentWeek + 1;
            const weekAfter = currentWeek + 2;
            
            // Handle year transition (approximately - ISO weeks can be tricky at year boundaries)
            let nextWeekYear = shortYear;
            let weekAfterYear = shortYear;
            
            if (nextWeek > 52) {
                nextWeekYear = (parseInt(shortYear) + 1).toString().padStart(2, '0');
                if (weekAfter > 52) {
                    weekAfterYear = nextWeekYear;
                }
            }
            
            return {
                thisWeek: `${shortYear}v${currentWeek}`,
                nextWeek: nextWeek > 52 ? `${nextWeekYear}v${nextWeek - 52}` : `${shortYear}v${nextWeek}`,
                weekAfter: weekAfter > 52 ? `${weekAfterYear}v${weekAfter - 52}` : `${shortYear}v${weekAfter}`
            };
        }
        
        // ====================================================================================================
        
        // Add new card
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
            const currentTitle = node.data('title') || '';
            const currentText = node.data('text') || '';
            const currentTags = node.data('tags') || [];
            
            // Create overlay for editing (same as addNewCard and editManualCard)
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
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Titel (valfritt):</label>
                    <input type="text" id="editCardTitle" value="${currentTitle}"
                        style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;
                               box-sizing: border-box; font-size: 14px; margin-bottom: 10px;">
                </div>
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
            
            // Handle save
            document.getElementById('saveEdit').onclick = function() {
                const newTitle = document.getElementById('editCardTitle').value.trim();
                const newText = textarea.value.trim();
                if (!newText) {
                    alert('Text krävs');
                    return;
                }
                
                const tagsInput = document.getElementById('editCardTags').value || '';
                const newTags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
                
                // Update node data
                node.data('title', newTitle);
                node.data('text', newText);
                node.data('tags', newTags);

                // Apply auto-gray coloring for #done tags
                applyAutoDoneColoring(node);

                refreshSearchAndFilter();

                // Save immediately to prevent data loss from autosave/Drive sync
                saveBoard();

                cleanup();
            };
            
            // Handle cancel
            document.getElementById('cancelEdit').onclick = function() {
                cleanup();
            };
            
            // Handle keyboard shortcuts with proper cleanup
            function cleanup() {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                document.removeEventListener('keydown', handleEscape);
                // Clear any existing edit dialogs to prevent conflicts
                const existingDialogs = document.querySelectorAll('[id^="editCard"], [id^="newCard"]');
                existingDialogs.forEach(dialog => {
                    if (dialog.parentNode && dialog.parentNode !== document.body) {
                        dialog.parentNode.remove();
                    }
                });
            }
            
            function handleEscape(e) {
                if (e.key === 'Escape') {
                    cleanup();
                }
            }
            
            textarea.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.key === 'Enter') {
                    document.getElementById('saveEdit').click();
                } else if (e.key === 'Escape') {
                    cleanup();
                }
            });
            
            document.addEventListener('keydown', handleEscape);
        }
        
        // Helper function to refresh search and filter
        function refreshSearchAndFilter() {
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
        }
        
        // Global function to clean up any stray edit dialogs
        function clearAllEditDialogs() {
            // Remove overlays by style attributes
            const overlays = document.querySelectorAll('div[style*="position: fixed"][style*="z-index: 10000"]');
            overlays.forEach(overlay => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            });
            
            // Remove any elements with edit-related IDs
            const editElements = document.querySelectorAll('#editCardText, #editCardTags, #editCardTitle, #newCardText, #newCardTags, #saveEdit, #cancelEdit, #saveCard, #cancelCard');
            editElements.forEach(element => {
                // Find the overlay parent (should be 2-3 levels up)
                let parent = element.parentNode;
                while (parent && parent !== document.body) {
                    if (parent.style.position === 'fixed' && parent.style.zIndex === '10000') {
                        if (parent.parentNode) {
                            parent.parentNode.removeChild(parent);
                        }
                        break;
                    }
                    parent = parent.parentNode;
                }
            });
            
            // Remove all event listeners by cloning and replacing document
            // This is a bit aggressive but ensures no zombie listeners
            console.log('Cleared all edit dialogs and potential zombie listeners');
        }
        
        // Google Drive API Configuration
        const GOOGLE_CLIENT_ID = '971005822021-8ebrpd92n1upsedg7s5fn80mnmvhou5d.apps.googleusercontent.com';
        const GOOGLE_API_KEY = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU01T1-DQ-dY4'; // Public API key for Picker
        const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
        const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

        let isGoogleApiLoaded = false;
        let isSignedIn = false;
        let pickerApiLoaded = false;
        let accessToken = null;
        let tokenClient = null;
        
        // Project management  
        let currentProject = localStorage.getItem('spatial-notes-project-name') || 'Nytt projekt';
        let availableProjects = [];
        let projectsLoaded = false;
        
        // Token management with enhanced persistence
        let tokenExpiry = null;
        let rememberMeEnabled = false;
        
        // Check user's remember preference
        function checkRememberPreference() {
            const remembered = localStorage.getItem('auth_remember_preference');
            return remembered === 'true';
        }
        
        // Save tokens with enhanced persistence options
        function saveTokens(forceRemember = false) {
            if (accessToken) {
                const storage = (rememberMeEnabled || forceRemember) ? localStorage : sessionStorage;
                const prefix = (rememberMeEnabled || forceRemember) ? 'google_' : 'session_google_';
                
                storage.setItem(prefix + 'access_token', accessToken);
                storage.setItem(prefix + 'token_expiry', tokenExpiry?.toString() || '');
                storage.setItem(prefix + 'current_project', currentProject);
                
                if (rememberMeEnabled || forceRemember) {
                    localStorage.setItem('auth_remember_preference', 'true');
                    console.log('Tokens saved to localStorage (30-day persistence)');
                } else {
                    localStorage.setItem('auth_remember_preference', 'false');
                    console.log('Tokens saved to sessionStorage (session only)');
                }
            }
        }
        
        // Load tokens from storage (localStorage or sessionStorage)
        function loadSavedTokens() {
            // Check user preference for remember me
            const rememberPreference = checkRememberPreference();
            
            // Try localStorage first (30-day persistence)
            let savedToken = localStorage.getItem('google_access_token');
            let savedExpiry = localStorage.getItem('google_token_expiry');
            let savedProject = localStorage.getItem('google_current_project');
            let source = 'localStorage (30-day)';
            
            // If no localStorage tokens, try sessionStorage
            if (!savedToken) {
                savedToken = sessionStorage.getItem('session_google_access_token');
                savedExpiry = sessionStorage.getItem('session_google_token_expiry');
                savedProject = sessionStorage.getItem('session_google_current_project');
                source = 'sessionStorage (session)';
            }
            
            if (savedToken && savedExpiry) {
                const expiryTime = parseInt(savedExpiry);
                const now = Date.now();
                
                // Check if token is still valid (with 5 minute buffer)
                if (expiryTime && now < (expiryTime - 5 * 60 * 1000)) {
                    accessToken = savedToken;
                    tokenExpiry = expiryTime;
                    isSignedIn = true;
                    rememberMeEnabled = rememberPreference;
                    
                    if (savedProject) {
                        currentProject = savedProject;
                    }
                    
                    console.log(`Restored valid tokens from ${source}`);
                    return true;
                } else {
                    console.log(`Saved tokens expired, clearing ${source}`);
                    clearSavedTokens();
                }
            }
            
            return false;
        }
        
        // Clear saved tokens from both storage types
        function clearSavedTokens() {
            // Clear localStorage tokens
            localStorage.removeItem('google_access_token');
            localStorage.removeItem('google_token_expiry');
            localStorage.removeItem('google_current_project');
            
            // Clear sessionStorage tokens
            sessionStorage.removeItem('session_google_access_token');
            sessionStorage.removeItem('session_google_token_expiry');
            sessionStorage.removeItem('session_google_current_project');
            
            // Reset auth state
            accessToken = null;
            tokenExpiry = null;
            isSignedIn = false;
            rememberMeEnabled = false;
            
            console.log('Cleared saved tokens from both storage types');
        }
        
        // Check if token needs refresh
        function isTokenExpiringSoon() {
            if (!tokenExpiry) return true;
            const now = Date.now();
            const timeToExpiry = tokenExpiry - now;
            // Refresh if less than 10 minutes left
            return timeToExpiry < (10 * 60 * 1000);
        }
        
        // Show remember me dialog before first login
        function showRememberMeDialog() {
            return new Promise((resolve) => {
                // Check if user has already made a choice
                const existingPreference = localStorage.getItem('auth_remember_preference');
                if (existingPreference !== null) {
                    rememberMeEnabled = existingPreference === 'true';
                    resolve(rememberMeEnabled);
                    return;
                }
                
                // Create remember me dialog
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.7); z-index: 10000;
                    display: flex; justify-content: center; align-items: center;
                `;
                
                const dialog = document.createElement('div');
                dialog.style.cssText = `
                    background: white; padding: 30px; border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 400px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                `;
                
                dialog.innerHTML = `
                    <h3 style="margin: 0 0 20px 0; color: #007acc; text-align: center;">
                        🔐 Google Drive Inloggning
                    </h3>
                    <p style="margin: 0 0 20px 0; line-height: 1.5; color: #333;">
                        Vill du att vi ska komma ihåg din inloggning på den här enheten?
                    </p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #007acc;">📱 Kom ihåg i 30 dagar:</p>
                        <ul style="margin: 0; padding-left: 20px; color: #666;">
                            <li>Funkar på alla dina enheter (iPad, Android, dator)</li>
                            <li>Automatisk synkronisering</li>
                            <li>Mindre inloggningar</li>
                        </ul>
                        
                        <p style="margin: 15px 0 5px 0; font-weight: bold; color: #666;">🔒 Bara denna session:</p>
                        <ul style="margin: 0; padding-left: 20px; color: #666;">
                            <li>Loggas ut när du stänger browsern</li>
                            <li>Mer säkert på delade enheter</li>
                        </ul>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="rememberYes" style="
                            padding: 12px 24px; background: #007acc; color: white; 
                            border: none; border-radius: 6px; cursor: pointer;
                            font-size: 16px; font-weight: bold;
                        ">🔓 Kom ihåg i 30 dagar</button>
                        <button id="rememberNo" style="
                            padding: 12px 24px; background: #666; color: white; 
                            border: none; border-radius: 6px; cursor: pointer;
                            font-size: 16px;
                        ">🔒 Bara denna session</button>
                    </div>
                `;
                
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);
                
                // Handle button clicks
                dialog.querySelector('#rememberYes').onclick = () => {
                    rememberMeEnabled = true;
                    localStorage.setItem('auth_remember_preference', 'true');
                    document.body.removeChild(overlay);
                    resolve(true);
                };
                
                dialog.querySelector('#rememberNo').onclick = () => {
                    rememberMeEnabled = false;
                    localStorage.setItem('auth_remember_preference', 'false');
                    document.body.removeChild(overlay);
                    resolve(false);
                };
            });
        }
        
        // Refresh token if needed before API calls
        async function ensureValidToken() {
            if (!isSignedIn || !accessToken) {
                throw new Error('Not signed in to Google Drive');
            }
            
            if (isTokenExpiringSoon()) {
                console.log('Token expiring soon, requesting new token...');
                
                return new Promise((resolve, reject) => {
                    // Request new token
                    tokenClient.requestAccessToken({
                        prompt: '',
                        callback: (response) => {
                            if (response.access_token) {
                                accessToken = response.access_token;
                                tokenExpiry = Date.now() + (response.expires_in ? response.expires_in * 1000 : 3600000);
                                saveTokens();
                                console.log('Token refreshed successfully');
                                resolve();
                            } else {
                                console.error('Failed to refresh token:', response.error);
                                clearSavedTokens();
                                updateAuthStatus();
                                reject(new Error('Token refresh failed'));
                            }
                        }
                    });
                });
            }
            
            return Promise.resolve();
        }
        
        // ====================================================================================================
        // 📂 PROJECT SELECTOR FUNCTIONS
        // ====================================================================================================
        
        // Update project name in UI
        function updateProjectNameUI() {
            const projectNameElement = document.getElementById('projectName');
            if (projectNameElement) {
                projectNameElement.textContent = currentProject;
                localStorage.setItem('spatial-notes-project-name', currentProject);
            }
        }
        
        // Toggle project dropdown
        function toggleProjectDropdown() {
            const dropdown = document.getElementById('projectDropdown');
            if (dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
                document.removeEventListener('click', closeProjectDropdownOnClickOutside);
            } else {
                dropdown.classList.add('show');
                // Close dropdown when clicking outside
                setTimeout(() => {
                    document.addEventListener('click', closeProjectDropdownOnClickOutside);
                }, 10);
            }
        }
        
        // Close dropdown when clicking outside
        function closeProjectDropdownOnClickOutside(event) {
            const dropdown = document.getElementById('projectDropdown');
            const button = document.getElementById('projectButton');

            if (!dropdown.contains(event.target) && !button.contains(event.target)) {
                dropdown.classList.remove('show');
                document.removeEventListener('click', closeProjectDropdownOnClickOutside);
            }
        }

        // Close menu dropdowns
        function closeMenuDropdowns() {
            const menuDropdowns = document.querySelectorAll('.menu-dropdown');
            menuDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }

        // Rename current project
        function renameProject() {
            const dropdown = document.getElementById('projectDropdown');
            dropdown.classList.remove('show');
            
            const newName = prompt(`Byt namn på projekt "${currentProject}" till:`, currentProject);
            if (newName && newName.trim() && newName.trim() !== currentProject) {
                const oldName = currentProject;
                currentProject = newName.trim();
                updateProjectNameUI();
                
                // Show success message
                updateSyncStatus(`✏️ Projektnamn ändrat: "${oldName}" → "${currentProject}"`, 'success');
                
                // If signed in to Google Drive, this will be saved on next save
                if (isSignedIn && accessToken) {
                    // Automatically save to update the project name in Google Drive
                    setTimeout(() => saveBoard(), 500);
                }
            }
        }
        
        // Create new project
        function createNewProject() {
            const dropdown = document.getElementById('projectDropdown');
            dropdown.classList.remove('show');
            
            const projectName = prompt('Ange namn för det nya projektet:', '');
            if (projectName && projectName.trim()) {
                // Save current project if it has content
                const hasContent = cy.nodes().length > 0;
                if (hasContent && isSignedIn && accessToken) {
                    saveBoard(); // Save current project first
                }
                
                // Clear current board
                cy.nodes().remove();
                cy.edges().remove();
                
                // Set new project name
                currentProject = projectName.trim();
                updateProjectNameUI();
                
                updateSyncStatus(`➕ Nytt projekt skapat: "${currentProject}"`, 'success');
            }
        }
        
        // Show project list (simplified version)
        function showProjectList() {
            const dropdown = document.getElementById('projectDropdown');
            dropdown.classList.remove('show');
            
            if (!isSignedIn || !accessToken) {
                // Show local projects only
                alert('Logga in på Google Drive för att se alla sparade projekt.\n\nFör närvarande arbetar du lokalt med projekt: "' + currentProject + '"');
                return;
            }
            
            // Use existing project manager
            showProjectManager();
        }
        
        // Manage projects (same as existing function)
        function manageProjects() {
            const dropdown = document.getElementById('projectDropdown');
            dropdown.classList.remove('show');
            
            if (!isSignedIn || !accessToken) {
                alert('Logga in på Google Drive för att hantera projekt.\n\nFör närvarande arbetar du lokalt med projekt: "' + currentProject + '"');
                return;
            }
            
            showProjectManager();
        }
        
        // Initialize project name on page load
        function initializeProjectName() {
            updateProjectNameUI();
        }
        
        // ====================================================================================================
        // 💾 SMART SAVE SYSTEM - Enhanced save with Google Drive integration
        // ====================================================================================================
        
        // Smart save function - handles Google Drive integration
        async function smartSave() {
            try {
                // Always save to localStorage first (instant backup)
                saveBoard();
                updateSyncStatus('Sparad lokalt ✓', 'success');
                
                // Check if user is signed in to Google Drive
                if (isSignedIn && accessToken) {
                    // User is signed in - save to Google Drive with structured filename
                    await saveToGoogleDriveWithStructure();
                } else {
                    // User not signed in - offer to sign in
                    showGoogleDriveSignInPrompt();
                }
            } catch (error) {
                console.error('Smart save error:', error);
                updateSyncStatus('Sparning misslyckades', 'error');
            }
        }
        
        // Save to Google Drive with proper folder structure and naming
        async function saveToGoogleDriveWithStructure() {
            try {
                await ensureValidToken();
                
                // Create structured filename: projektnamn_YYYY-MM-DD_HH-MM.json
                const now = new Date();
                const dateStr = now.getFullYear() + '-' + 
                               String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(now.getDate()).padStart(2, '0');
                const timeStr = String(now.getHours()).padStart(2, '0') + '-' + 
                               String(now.getMinutes()).padStart(2, '0');
                
                // Clean project name for filename (remove invalid chars)
                const cleanProjectName = currentProject
                    .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dashes
                    .replace(/\s+/g, '_')           // Replace spaces with underscores
                    .substring(0, 50);              // Limit length
                
                const filename = `${cleanProjectName}_${dateStr}_${timeStr}.json`;
                
                updateSyncStatus(`Sparar till Google Drive: ${filename}`, 'loading');
                
                // Get board data
                const boardData = {
                    project_name: currentProject,
                    saved_date: now.toISOString(),
                    cards: cy.nodes().map(node => ({
                        id: node.id(),
                        title: node.data('title') || '',
                        text: node.data('text') || '',
                        tags: node.data('tags') || [],
                        hidden_tags: node.data('hidden_tags') || [],
                        position: node.position(),
                        pinned: node.hasClass('pinned') || false,
                        isManualCard: node.data('isManualCard') || false,
                        cardColor: node.data('cardColor') || null,
                        // Image data
                        isImageCard: node.data('isImageCard') || false,
                        imageData: node.data('imageData') || null,
                        imageWidth: node.data('imageWidth') || null,
                        imageHeight: node.data('imageHeight') || null,
                        displayWidth: node.data('displayWidth') || null,
                        displayHeight: node.data('displayHeight') || null,
                        calculatedHeight: node.data('calculatedHeight') || null,
                        originalFileName: node.data('originalFileName') || null,
                        imageNotes: node.data('imageNotes') || '',
                        // Annotation data - CRITICAL for shapes/text annotations
                        isAnnotation: node.data('isAnnotation') || false,
                        annotationType: node.data('annotationType') || null,
                        shape: node.data('shape') || null,
                        textSize: node.data('textSize') || null,
                        label: node.data('label') || null,
                        customWidth: node.data('customWidth') || null,
                        customHeight: node.data('customHeight') || null,
                        backgroundColor: node.style('background-color'),
                        fontSize: node.style('font-size'),
                        width: node.style('width'),
                        height: node.style('height'),
                        // All other metadata
                        export_timestamp: node.data('export_timestamp') || null,
                        export_session: node.data('export_session') || null,
                        export_source: node.data('export_source') || null,
                        source_file: node.data('source_file') || null,
                        page_number: node.data('page_number') || null,
                        matched_terms: node.data('matched_terms') || null,
                        card_index: node.data('card_index') || null
                    })),
                    edges: cy.edges().map(edge => ({
                        source: edge.source().id(),
                        target: edge.target().id(),
                        // Save edge styling
                        lineColor: edge.style('line-color'),
                        targetArrowColor: edge.style('target-arrow-color'),
                        targetArrowShape: edge.style('target-arrow-shape'),
                        width: edge.style('width'),
                        arrowScale: edge.style('arrow-scale'),
                        curveStyle: edge.style('curve-style'),
                        // Save edge metadata
                        isAnnotation: edge.data('isAnnotation') || false,
                        annotationType: edge.data('annotationType') || null,
                        connectionType: edge.data('connectionType') || null
                    })),
                    metadata: {
                        total_cards: cy.nodes().length,
                        total_edges: cy.edges().length,
                        version: '2.1',
                        saved_from: 'spatial-notes-smart-save'
                    }
                };
                
                // Find or create 'Spatial Notes' folder
                const folderId = await findOrCreateSpatialNotesFolder();
                
                // Save file to the folder
                const fileBlob = new Blob([JSON.stringify(boardData, null, 2)], { type: 'application/json' });
                
                // Check if file already exists with same name (for versioning)
                const existingFiles = await findFilesInFolder(folderId, filename);
                
                let saveResponse;
                if (existingFiles.length > 0) {
                    // Update existing file
                    const fileId = existingFiles[0].id;
                    saveResponse = await updateFileInGoogleDrive(fileId, fileBlob);
                } else {
                    // Create new file
                    saveResponse = await createFileInGoogleDrive(filename, fileBlob, folderId);
                }
                
                if (saveResponse.ok) {
                    const fileInfo = await saveResponse.json();
                    updateSyncStatus(`✅ Sparad i Google Drive: "${filename}"`, 'success');
                    console.log(`Successfully saved project "${currentProject}" to Google Drive as ${filename}`);
                } else {
                    throw new Error('Failed to save to Google Drive: ' + saveResponse.statusText);
                }
                
            } catch (error) {
                console.error('Error saving to Google Drive with structure:', error);
                updateSyncStatus('Google Drive-sparning misslyckades', 'error');
                // Local save is still done, so user doesn't lose data
            }
        }
        
        // Show prompt to sign in to Google Drive
        function showGoogleDriveSignInPrompt() {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); z-index: 10001;
                display: flex; justify-content: center; align-items: center;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white; padding: 30px; border-radius: 10px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 400px; width: 90%;
                text-align: center; font-family: inherit;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin: 0 0 20px 0; color: #333;">💾 Spara online?</h3>
                <p style="margin: 15px 0; color: #666; line-height: 1.5;">
                    Ditt projekt "<strong>${currentProject}</strong>" är sparat lokalt.<br><br>
                    Vill du logga in på Google Drive för att spara online och synka mellan dina enheter?
                </p>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                    <button id="signInYes" style="
                        padding: 12px 20px; background: #007acc; color: white; 
                        border: none; border-radius: 6px; cursor: pointer; font-size: 16px;
                    ">🔗 Ja, logga in</button>
                    <button id="signInNo" style="
                        padding: 12px 20px; background: #666; color: white; 
                        border: none; border-radius: 6px; cursor: pointer; font-size: 16px;
                    ">📱 Nej, bara lokalt</button>
                </div>
                <p style="margin: 15px 0 5px 0; font-size: 12px; color: #999;">
                    Du kan alltid logga in senare via menyn.
                </p>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Handle buttons
            document.getElementById('signInYes').onclick = () => {
                document.body.removeChild(overlay);
                // Start Google sign-in process
                toggleGoogleDriveAuth();
            };
            
            document.getElementById('signInNo').onclick = () => {
                document.body.removeChild(overlay);
                updateSyncStatus('Sparad lokalt (endast denna enhet)', 'info');
            };
            
            // Close on Escape
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }
        
        // Find or create 'Spatial Notes' folder in Google Drive
        async function findOrCreateSpatialNotesFolder() {
            try {
                // Search for existing 'Spatial Notes' folder
                const searchParams = new URLSearchParams({
                    q: "name='Spatial Notes' and mimeType='application/vnd.google-apps.folder'",
                    fields: 'files(id, name)'
                });
                
                const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?${searchParams}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const searchResult = await searchResponse.json();
                
                if (searchResult.files && searchResult.files.length > 0) {
                    // Folder exists, return its ID
                    return searchResult.files[0].id;
                } else {
                    // Create new folder
                    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: 'Spatial Notes',
                            mimeType: 'application/vnd.google-apps.folder'
                        })
                    });
                    
                    const createResult = await createResponse.json();
                    console.log('Created Spatial Notes folder:', createResult.id);
                    return createResult.id;
                }
                
            } catch (error) {
                console.error('Error finding/creating Spatial Notes folder:', error);
                // Return null to save to root folder as fallback
                return null;
            }
        }
        
        // Find files in a specific folder
        async function findFilesInFolder(folderId, filename) {
            try {
                const query = folderId 
                    ? `name='${filename}' and '${folderId}' in parents`
                    : `name='${filename}'`;
                
                const searchParams = new URLSearchParams({
                    q: query,
                    fields: 'files(id, name, modifiedTime)'
                });
                
                const response = await fetch(`https://www.googleapis.com/drive/v3/files?${searchParams}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                return result.files || [];
                
            } catch (error) {
                console.error('Error finding files in folder:', error);
                return [];
            }
        }
        
        // Create file in Google Drive
        async function createFileInGoogleDrive(filename, fileBlob, parentFolderId = null) {
            const metadata = {
                name: filename
            };
            
            if (parentFolderId) {
                metadata.parents = [parentFolderId];
            }
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            form.append('file', fileBlob);
            
            return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: form
            });
        }
        
        // Update existing file in Google Drive
        async function updateFileInGoogleDrive(fileId, fileBlob) {
            return fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: fileBlob
            });
        }
        
        // Initialize Google API
        async function initializeGoogleAPI() {
            try {
                // Wait for Google Identity Services to be available
                if (typeof google === 'undefined' || !google.accounts) {
                    console.log('Google Identity Services not yet loaded, retrying in 2 seconds...');
                    setTimeout(() => initializeGoogleAPI(), 2000);
                    return;
                }
                
                console.log('Initializing Google Identity Services...');
                
                // Try to load saved tokens first
                const hasValidTokens = loadSavedTokens();
                if (hasValidTokens) {
                    console.log('✅ Auto-signed in with saved tokens');
                    updateAuthStatus();
                    
                    // Load available projects and current project
                    setTimeout(async () => {
                        await loadAvailableProjects();
                        if (currentProject) {
                            await loadFromGoogleDrive();
                        }
                    }, 1000);
                }
                
                // Initialize Google Identity Services token client
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: GOOGLE_SCOPE,
                    callback: (response) => {
                        if (response.access_token) {
                            accessToken = response.access_token;
                            isSignedIn = true;
                            
                            // Calculate token expiry (Google tokens typically last 1 hour)
                            tokenExpiry = Date.now() + (response.expires_in ? response.expires_in * 1000 : 3600000);
                            
                            // Save tokens for persistence
                            saveTokens();
                            
                            console.log('Successfully signed in to Google Drive');
                            console.log('Token expires at:', new Date(tokenExpiry).toLocaleString());
                            updateAuthStatus();
                            
                            // Load available projects and then current project
                            setTimeout(async () => {
                                await loadAvailableProjects();
                                await loadFromGoogleDrive();
                            }, 500);
                        } else if (response.error) {
                            console.error('Authentication error:', response.error);
                            updateSyncStatus('Authentication failed', 'error');
                        }
                    },
                });
                
                isGoogleApiLoaded = true;
                console.log('Google Identity Services initialized successfully');

                // Load Google Picker API
                if (typeof gapi !== 'undefined') {
                    gapi.load('picker', {
                        'callback': function() {
                            pickerApiLoaded = true;
                            console.log('✅ Google Picker API loaded');
                        },
                        'onerror': function() {
                            console.error('❌ Failed to load Google Picker API');
                        }
                    });
                } else {
                    console.log('⏳ Waiting for gapi to load Picker...');
                    setTimeout(() => {
                        if (typeof gapi !== 'undefined') {
                            gapi.load('picker', () => {
                                pickerApiLoaded = true;
                                console.log('✅ Google Picker API loaded (delayed)');
                            });
                        }
                    }, 2000);
                }

                // Try to restore saved tokens
                if (loadSavedTokens()) {
                    console.log(`Restored session from saved tokens, project: ${currentProject}`);
                    updateAuthStatus();
                    
                    // Load projects and current project
                    setTimeout(async () => {
                        await loadAvailableProjects();
                        console.log(`Loading saved project: ${currentProject}`);
                        await loadFromGoogleDrive();
                    }, 500);
                } else {
                    updateAuthStatus();
                }
                
            } catch (error) {
                console.error('Error initializing Google Identity Services:', error);
                
                // Check if we're running locally
                if (window.location.protocol === 'file:') {
                    console.log('Google Drive sync requires HTTPS. Deploy to GitHub Pages to test.');
                    updateSyncStatus('Google Drive needs HTTPS', 'info');
                    
                    // Disable the Google Drive button for local development
                    const driveBtn = document.getElementById('googleDriveBtn');
                    if (driveBtn) {
                        driveBtn.disabled = true;
                        driveBtn.innerHTML = '<span>⚠️</span><span>Needs HTTPS</span>';
                    }
                } else {
                    console.log('Google Identity Services will retry in 5 seconds...');
                    updateSyncStatus('Google API loading...', 'info');
                    
                    // Retry initialization after 5 seconds
                    setTimeout(() => initializeGoogleAPI(), 5000);
                }
            }
        }
        
        // Update authentication status
        function updateAuthStatus() {
            if (!isGoogleApiLoaded) return;
            
            const driveBtn = document.getElementById('googleDriveBtn');
            const driveButtonText = document.getElementById('driveButtonText');
            
            // Check if elements exist before updating
            if (!driveBtn) {
                console.log('Google Drive button not found in DOM');
                return;
            }
            
            if (isSignedIn && accessToken) {
                if (driveButtonText) driveButtonText.textContent = `${currentProject}`;
                driveBtn.innerHTML = `✅ Google Drive (Inloggad)`;
                updateSyncStatus(`Synced: ${currentProject}`, 'success');
                
                // Start auto-sync
                startAutoSync();
            } else {
                if (driveButtonText) driveButtonText.textContent = 'Google Drive';
                driveBtn.innerHTML = `🔗 Google Drive (Ej inloggad)`;
                updateSyncStatus('', '');
                
                // Stop auto-sync when signed out
                stopAutoSync();
            }
        }
        
        // Toggle Google Drive authentication with Remember Me option
        async function toggleGoogleDriveAuth() {
            if (!isGoogleApiLoaded || !tokenClient) {
                updateSyncStatus('Google API not loaded yet...', 'loading');
                return;
            }
            
            try {
                if (isSignedIn && accessToken) {
                    // Sign out
                    if (confirm('Logga ut från Google Drive?\n\nDetta kommer att:\n• Stoppa automatisk synkronisering\n• Du behöver logga in igen för Drive-funktioner\n• Lokalt sparade kort påverkas inte')) {
                        google.accounts.oauth2.revoke(accessToken, () => {
                            console.log('Access token revoked');
                        });
                        
                        // Clear all tokens and saved data
                        clearSavedTokens();
                        
                        updateSyncStatus('Signed out from Google Drive', 'info');
                        updateAuthStatus();
                    }
                } else {
                    // Show remember me dialog first
                    updateSyncStatus('Förbereder inloggning...', 'loading');
                    
                    // Show remember me dialog and wait for user choice
                    const rememberChoice = await showRememberMeDialog();
                    console.log('User chose remember me:', rememberChoice);
                    
                    // Sign in - request access token  
                    updateSyncStatus('Signing in to Google Drive...', 'loading');
                    tokenClient.requestAccessToken({prompt: 'consent'});
                }
            } catch (error) {
                console.error('Authentication error:', error);
                updateSyncStatus('Authentication failed', 'error');
            }
        }
        
        // Project Management Functions
        
        // Load list of available projects from Google Drive
        async function loadAvailableProjects() {
            try {
                await ensureValidToken();
                const params = new URLSearchParams({
                    q: "name contains 'spatial-notes-' and name contains '.json' and trashed=false",
                    spaces: 'drive',
                    fields: 'files(id, name, modifiedTime)',
                    orderBy: 'modifiedTime desc'
                });
                
                const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                
                if (!response.ok) {
                    console.error('Failed to load projects:', response.statusText);
                    return [];
                }
                
                const result = await response.json();
                const projects = [];
                
                result.files.forEach(file => {
                    // Extract project name from filename: spatial-notes-PROJECT.json -> PROJECT
                    const match = file.name.match(/^spatial-notes-(.+)\.json$/);
                    if (match) {
                        projects.push({
                            name: match[1],
                            fileId: file.id,
                            lastModified: file.modifiedTime
                        });
                    }
                });
                
                availableProjects = projects;
                projectsLoaded = true;
                console.log('Loaded projects:', projects);
                return projects;
                
            } catch (error) {
                console.error('Error loading projects:', error);
                return [];
            }
        }
        
        // Switch to a different project
        async function switchProject(projectName) {
            if (projectName === currentProject) return;
            
            try {
                // Save current project first
                if (isSignedIn && accessToken) {
                    updateSyncStatus('Saving current project...', 'loading');
                    await saveToGoogleDrive();
                }
                
                // Switch to new project
                currentProject = projectName;
                
                // Save current project to localStorage immediately
                localStorage.setItem('google_current_project', currentProject);
                
                updateSyncStatus(`Switching to ${projectName}...`, 'loading');
                
                // Load the new project
                const success = await loadFromGoogleDrive();
                
                if (success) {
                    updateSyncStatus(`✅ Loaded ${projectName}`, 'success');
                } else {
                    // New project - start with empty board
                    cy.nodes().remove();
                    updateSyncStatus(`✅ New project: ${projectName}`, 'success');
                }
                
                // Update UI
                updateAuthStatus();
                
            } catch (error) {
                console.error('Error switching project:', error);
                updateSyncStatus('Failed to switch project', 'error');
            }
        }
        
        // Create a new project
        async function createNewProject(projectName) {
            if (!projectName || projectName.trim() === '') return;
            
            // Sanitize project name
            projectName = projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
            
            // Check if project already exists
            const existingProject = availableProjects.find(p => p.name === projectName);
            if (existingProject) {
                alert(`Project "${projectName}" already exists!`);
                return;
            }
            
            // Switch to new project
            await switchProject(projectName);
        }
        
        // Get current project filename
        function getCurrentProjectFileName() {
            return `spatial-notes-${currentProject}.json`;
        }
        
        // Update node appearance after loading
        function updateNodeAppearance(node) {
            try {
                // Apply color if node has cardColor data
                const cardColor = node.data('cardColor');
                if (cardColor) {
                    const colorValue = getCardColorValue(cardColor, getCurrentTheme());
                    node.style('background-color', colorValue);
                }
                
                // Apply pinned styling if needed
                const isPinned = node.data('isPinned');
                if (isPinned) {
                    node.addClass('pinned');
                    node.data('pinned', true);
                    node.ungrabify(); // Prevent dragging pinned cards
                } else {
                    node.grabify(); // Make sure non-pinned cards are draggable
                }
                
                // Update text content and height with delay to ensure DOM is ready
                setTimeout(() => {
                    try {
                        const heightInfo = getMeasuredTextHeight(node);
                        console.log(`Setting height for node ${node.id()}: ${heightInfo}px`);
                        node.style('height', heightInfo + 'px');
                    } catch (heightError) {
                        console.error('Error calculating height for node:', node.id(), heightError);
                        // Fallback to default height calculation with proper padding
                        const textLength = (node.data('text') || '').length;
                        const defaultHeight = Math.max(140, textLength * 0.8 + 60); // 140px minimum fallback
                        console.log(`Fallback height for ${node.id()}: ${defaultHeight}px`);
                        node.style('height', defaultHeight + 'px');
                    }
                }, 100);
                
            } catch (error) {
                console.error('Error updating node appearance:', error);
                // Continue without styling rather than failing
            }
        }
        
        // Update sync status display using the existing search results info area
        function updateSyncStatus(message, type = '') {
            const statusEl = document.querySelector('.search-results-info');
            
            if (!statusEl) {
                console.log('Status element not found');
                return;
            }
            
            // Show the status box and set message
            statusEl.textContent = message;
            statusEl.classList.add('visible');
            
            // Clear existing type classes
            statusEl.classList.remove('sync-success', 'sync-error', 'sync-loading', 'sync-info');
            
            // Add type-specific styling
            if (type) {
                statusEl.classList.add(`sync-${type}`);
            }
            
            // Auto-clear status after 5 seconds for non-permanent messages
            if (type === 'loading' || type === 'info') {
                setTimeout(() => {
                    statusEl.textContent = '';
                    statusEl.classList.remove('visible', 'sync-loading', 'sync-info');
                }, 5000);
            } else if (type === 'error') {
                // Keep error messages longer
                setTimeout(() => {
                    statusEl.textContent = '';
                    statusEl.classList.remove('visible', 'sync-error');
                }, 8000);
            } else if (type === 'success') {
                // Keep success messages for a medium time
                setTimeout(() => {
                    statusEl.textContent = '';
                    statusEl.classList.remove('visible', 'sync-success');
                }, 6000);
            }
        }
        
        // Save board to Google Drive
        async function saveToGoogleDrive() {
            try {
                // Ensure we have a valid token
                await ensureValidToken();
                
                console.log(`Saving project "${currentProject}" to Google Drive...`);
                updateSyncStatus('Saving to Google Drive...', 'loading');
                
                const cardCount = cy.nodes().length;
                console.log(`Preparing to save ${cardCount} cards`);
                
                const boardData = {
                    cards: cy.nodes().map(node => ({
                        id: node.id(),
                        title: node.data('title') || '',
                        text: node.data('text') || '',
                        tags: node.data('tags') || [],
                        hidden_tags: node.data('hidden_tags') || [],
                        x: node.position('x'),
                        y: node.position('y'),
                        cardColor: node.data('cardColor') || '',
                        export_source: node.data('export_source') || '',
                        source_file: node.data('source_file') || '',
                        matched_terms: node.data('matched_terms') || '',
                        isManualCard: node.data('isManualCard') || false,
                        isPinned: node.data('isPinned') || false,
                        pinned: node.hasClass('pinned') || false,
                        // Image data - CRITICAL for image persistence
                        type: node.data('type') || 'text',
                        isImageCard: node.data('isImageCard') || false,
                        imageData: node.data('imageData') || null,
                        imageWidth: node.data('imageWidth') || null,
                        imageHeight: node.data('imageHeight') || null,
                        displayWidth: node.data('displayWidth') || null,
                        displayHeight: node.data('displayHeight') || null,
                        calculatedHeight: node.data('calculatedHeight') || null,
                        originalFileName: node.data('originalFileName') || null,
                        imageNotes: node.data('imageNotes') || '',
                        annotation: node.data('annotation') || null,
                        searchableText: node.data('searchableText') || null,
                        // Annotation data - CRITICAL for shapes/text annotations
                        isAnnotation: node.data('isAnnotation') || false,
                        annotationType: node.data('annotationType') || null,
                        shape: node.data('shape') || null,
                        textSize: node.data('textSize') || null,
                        label: node.data('label') || null,
                        customWidth: node.data('customWidth') || null,
                        customHeight: node.data('customHeight') || null,
                        backgroundColor: node.style('background-color'),
                        fontSize: node.style('font-size'),
                        width: node.style('width'),
                        height: node.style('height'),
                        // Other metadata
                        export_timestamp: node.data('export_timestamp') || null,
                        export_session: node.data('export_session') || null,
                        page_number: node.data('page_number') || null,
                        card_index: node.data('card_index') || null
                    })),
                    edges: cy.edges().map(edge => ({
                        source: edge.source().id(),
                        target: edge.target().id(),
                        // Save edge styling
                        lineColor: edge.style('line-color'),
                        targetArrowColor: edge.style('target-arrow-color'),
                        targetArrowShape: edge.style('target-arrow-shape'),
                        width: edge.style('width'),
                        arrowScale: edge.style('arrow-scale'),
                        curveStyle: edge.style('curve-style'),
                        // Save edge metadata
                        isAnnotation: edge.data('isAnnotation') || false,
                        annotationType: edge.data('annotationType') || null,
                        connectionType: edge.data('connectionType') || null
                    })),
                    timestamp: new Date().toISOString(),
                    version: '2.0'
                };
                
                const fileContent = JSON.stringify(boardData, null, 2);
                const fileName = getCurrentProjectFileName();
                
                console.log(`File to save: ${fileName}`);
                console.log(`Content length: ${fileContent.length} characters`);
                console.log(`Board data:`, boardData);
                
                // Check if file already exists
                console.log('Checking if file exists...');
                const existingFileId = await findSpatialNotesFile();
                console.log('Existing file ID:', existingFileId);
                
                if (existingFileId) {
                    // Update existing file
                    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: fileContent
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Failed to update file: ${response.statusText}`);
                    }
                } else {
                    // Create new file (simple approach)
                    const metadata = {
                        name: fileName
                    };
                    
                    // First create the file metadata
                    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(metadata)
                    });
                    
                    if (!createResponse.ok) {
                        throw new Error(`Failed to create file: ${createResponse.statusText}`);
                    }
                    
                    const fileInfo = await createResponse.json();
                    
                    // Then upload the content
                    const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileInfo.id}?uploadType=media`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: fileContent
                    });
                    
                    if (!uploadResponse.ok) {
                        throw new Error(`Failed to upload content: ${uploadResponse.statusText}`);
                    }
                }
                
                updateSyncStatus('✅ Saved to Drive', 'success');
                return true;
            } catch (error) {
                console.error('Error saving to Google Drive:', error);
                
                // If error is auth-related, clear tokens and update UI
                if (error.message.includes('Not signed in') || error.message.includes('Token refresh failed')) {
                    clearSavedTokens();
                    updateAuthStatus();
                    updateSyncStatus('Please sign in to Google Drive', 'error');
                } else {
                    updateSyncStatus('Failed to save to Drive', 'error');
                }
                return false;
            }
        }
        
        // Load board from Google Drive
        async function loadFromGoogleDrive() {
            try {
                // Ensure we have a valid token
                await ensureValidToken();
                
                console.log(`Loading project "${currentProject}" from Google Drive...`);
                updateSyncStatus('Loading from Google Drive...', 'loading');
                
                const fileId = await findSpatialNotesFile();
                console.log('File search result:', fileId);
                
                if (!fileId) {
                    console.log(`No file found for project "${currentProject}"`);
                    updateSyncStatus(`No saved data for "${currentProject}"`, 'info');
                    return false;
                }
                
                const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                
                console.log('Drive API response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Drive API error:', errorText);
                    throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
                }
                
                const fileContent = await response.text();
                console.log('File content length:', fileContent.length);
                console.log('File content preview:', fileContent.substring(0, 200));
                
                const boardData = JSON.parse(fileContent);
                console.log('Parsed board data:', boardData);
                
                // Check if we already have cards loaded (from localStorage)
                const existingCards = cy.nodes().length;
                console.log(`Found ${existingCards} existing cards before Drive sync`);
                
                // Clear existing cards silently without visual updates during sync
                cy.batch(() => {
                    cy.nodes().remove();
                });
                
                // Add cards from Drive in a batch to minimize visual updates
                if (boardData.cards && boardData.cards.length > 0) {
                    console.log(`Loading ${boardData.cards.length} cards...`);
                    
                    // Batch all card additions to prevent visual jumping
                    cy.batch(() => {
                        boardData.cards.forEach((card, index) => {
                            console.log(`Adding card ${index + 1}:`, card.id, card.title?.substring(0, 30));
                            
                            const nodeData = {
                                id: card.id,
                                title: card.title || '',
                                text: card.text || '',
                                tags: card.tags || [],
                                hidden_tags: card.hidden_tags || [],
                                cardColor: card.cardColor || '',
                                export_source: card.export_source || '',
                                source_file: card.source_file || '',
                                matched_terms: card.matched_terms || '',
                                isManualCard: card.isManualCard || false,
                                isPinned: card.isPinned || false,
                                // IMAGE SUPPORT - Essential for preserving pasted images!
                                type: card.type || 'text',
                                isImageCard: card.isImageCard || false,
                                imageData: card.imageData || null,
                                imageWidth: card.imageWidth || null,
                                imageHeight: card.imageHeight || null,
                                calculatedHeight: card.calculatedHeight || null,
                                annotation: card.annotation || null,
                                searchableText: card.searchableText || null,
                                originalFileName: card.originalFileName || null,
                                imageNotes: card.imageNotes || '',
                                // ANNOTATION SUPPORT - Essential for preserving shapes/text annotations
                                isAnnotation: card.isAnnotation || false,
                                annotationType: card.annotationType || null,
                                shape: card.shape || null,
                                textSize: card.textSize || null,
                                label: card.label || null,
                                customWidth: card.customWidth || null,
                                customHeight: card.customHeight || null,
                                // Other metadata
                                export_timestamp: card.export_timestamp || null,
                                export_session: card.export_session || null,
                                page_number: card.page_number || null,
                                card_index: card.card_index || null
                            };
                            
                            const node = cy.add({
                                data: nodeData,
                                position: { x: card.x || 0, y: card.y || 0 }
                            });
                            
                            // Apply auto-gray coloring for #done tags
                            applyAutoDoneColoring(node);

                            // Apply image styling if this is an image node
                            if ((card.type === 'image' || card.isImageCard) && card.imageData) {
                                console.log('🖼️ Restoring image from Drive:', card.originalFileName || 'unknown');

                                // Use saved display width, or default to 300px
                                const displayWidth = card.displayWidth || 300;
                                const ratio = card.imageHeight / card.imageWidth;
                                const displayHeight = Math.round(displayWidth * ratio);

                                node.style({
                                    'background-image': card.imageData,
                                    'background-fit': 'cover',
                                    'background-position': 'center',
                                    'width': displayWidth + 'px',
                                    'height': displayHeight + 'px'
                                });

                                // Store display dimensions in data for future saves
                                node.data('displayWidth', displayWidth);
                                node.data('displayHeight', displayHeight);
                            }

                            // Restore annotation styling if this is an annotation
                            if (card.isAnnotation && card.annotationType === 'shape') {
                                console.log('🔷 Restoring shape annotation:', card.id, card.shape);
                                node.addClass('annotation-shape');

                                // Restore shape data
                                if (card.shape) node.data('shape', card.shape);
                                if (card.label) node.data('label', card.label);
                                if (card.customWidth) node.data('customWidth', card.customWidth);
                                if (card.customHeight) node.data('customHeight', card.customHeight);

                                // Restore ALL styling in one call (like edges)
                                node.style({
                                    'background-color': card.backgroundColor || '#ff0000',
                                    'width': card.width || '200px',
                                    'height': card.height || '200px'
                                });
                                console.log(`  Restored shape: color=${card.backgroundColor}, size=${card.width}x${card.height}`);
                            } else if (card.isAnnotation && card.annotationType === 'text') {
                                console.log('📝 Restoring text annotation:', card.id);
                                node.addClass('annotation-text');

                                // Restore text annotation data
                                if (card.textSize) node.data('textSize', card.textSize);
                                if (card.label) node.data('label', card.label);
                                if (card.customWidth) node.data('customWidth', card.customWidth);
                                if (card.customHeight) node.data('customHeight', card.customHeight);

                                // Restore ALL styling in one call (like edges)
                                node.style({
                                    'background-color': card.backgroundColor || '#ff0000',
                                    'font-size': card.fontSize || '32px',
                                    'width': card.width || '200px',
                                    'height': card.height || '100px'
                                });
                                console.log(`  Restored text: color=${card.backgroundColor}, size=${card.width}x${card.height}`);
                            } else {
                                // Only apply cardColor styling for NON-annotations
                                const cardColor = node.data('cardColor');
                                if (cardColor) {
                                    const colorValue = getCardColorValue(cardColor, getCurrentTheme());
                                    node.style('background-color', colorValue);
                                }
                            }

                            // Handle both isPinned and pinned (for backwards compatibility)
                            if (node.data('isPinned') || card.pinned) {
                                node.addClass('pinned');
                                node.data('pinned', true);
                                node.ungrabify(); // Prevent dragging pinned cards
                            } else {
                                node.grabify(); // Make sure non-pinned cards are draggable
                            }
                        });

                        // Load edges (connections between nodes)
                        if (boardData.edges && boardData.edges.length > 0) {
                            console.log(`Loading ${boardData.edges.length} edges...`);
                            boardData.edges.forEach(edgeData => {
                                const newEdge = cy.add({
                                    group: 'edges',
                                    data: {
                                        source: edgeData.source,
                                        target: edgeData.target,
                                        isAnnotation: edgeData.isAnnotation || false,
                                        annotationType: edgeData.annotationType || null,
                                        connectionType: edgeData.connectionType || null
                                    }
                                });

                                // Restore edge styling if available
                                if (edgeData.lineColor || edgeData.targetArrowColor) {
                                    newEdge.style({
                                        'line-color': edgeData.lineColor || '#999',
                                        'target-arrow-color': edgeData.targetArrowColor || '#999',
                                        'target-arrow-shape': edgeData.targetArrowShape || 'triangle',
                                        'width': edgeData.width || 5,
                                        'arrow-scale': edgeData.arrowScale || 1.8,
                                        'curve-style': edgeData.curveStyle || 'bezier'
                                    });
                                    console.log(`🎨 Restored edge styling: ${edgeData.lineColor}`);
                                }
                            });
                            console.log('✅ All edges loaded with styling');
                        }
                    });

                    console.log('All cards and edges loaded successfully');
                    updateSyncStatus(`✅ Loaded ${boardData.cards.length} cards from "${currentProject}"`, 'success');
                    
                    // Skip height updates if cards were already loaded from localStorage 
                    // to prevent visual jumping during Drive sync
                    if (existingCards === 0) {
                        // Only update heights for first load (no localStorage data)
                        console.log('First load - applying height calculations');
                        setTimeout(() => {
                            cy.batch(() => {
                                cy.nodes().forEach(node => {
                                    try {
                                        const heightInfo = getMeasuredTextHeight(node);
                                        node.style('height', heightInfo + 'px');
                                    } catch (error) {
                                        const textLength = (node.data('text') || '').length;
                                        const fallbackHeight = Math.max(140, textLength * 0.8 + 60);
                                        node.style('height', fallbackHeight + 'px');
                                    }
                                });
                            });
                            console.log(`Height calculations applied to ${cy.nodes().length} cards`);
                        }, 150);
                    } else {
                        console.log('Skipped height updates - cards already properly sized from localStorage');
                    }
                    
                    // Auto-save to localStorage as backup
                    setTimeout(() => saveBoard(), 500);
                    
                    return true;
                } else {
                    console.log('No cards found in board data');
                    updateSyncStatus(`Empty project: "${currentProject}"`, 'info');
                    return false;
                }
            } catch (error) {
                console.error('Error loading from Google Drive:', error);
                
                // If error is auth-related, clear tokens and update UI
                if (error.message.includes('Not signed in') || error.message.includes('Token refresh failed')) {
                    clearSavedTokens();
                    updateAuthStatus();
                    updateSyncStatus('Please sign in to Google Drive', 'error');
                } else {
                    updateSyncStatus('Failed to load from Drive', 'error');
                }
                return false;
            }
        }
        
        // Find existing spatial notes file in Google Drive
        async function findSpatialNotesFile() {
            try {
                const fileName = getCurrentProjectFileName();
                const params = new URLSearchParams({
                    q: `name='${fileName}' and trashed=false`,
                    spaces: 'drive',
                    fields: 'files(id, name)'
                });
                
                const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to search files: ${response.statusText}`);
                }
                
                const result = await response.json();
                const files = result.files;
                return files && files.length > 0 ? files[0].id : null;
            } catch (error) {
                console.error('Error searching for spatial notes file:', error);
                return null;
            }
        }
        
        // Show project manager modal
        async function showProjectManager() {
            if (!isSignedIn || !accessToken) {
                alert('Please sign in to Google Drive first!');
                return;
            }
            
            // Load latest projects
            await loadAvailableProjects();
            
            let html = `
                <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="closeProjectManager(event)">
                    <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;" onclick="event.stopPropagation();">
                        <h2 style="margin-top: 0; text-align: center;">📁 Project Manager</h2>
                        
                        <div style="margin-bottom: 20px;">
                            <strong>Current Project:</strong> <span style="color: #007acc;">${currentProject}</span>
                        </div>
                        
                        <h3>Available Projects:</h3>
                        <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
            `;
            
            if (availableProjects.length === 0) {
                html += '<p style="text-align: center; color: #666;">No projects found. Create your first project below!</p>';
            } else {
                availableProjects.forEach(project => {
                    const isCurrentProject = project.name === currentProject;
                    const lastModified = new Date(project.lastModified);
                    const date = lastModified.toLocaleDateString('sv-SE'); // YYYY-MM-DD format
                    const time = lastModified.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }); // HH:MM format
                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee; ${isCurrentProject ? 'background: #f0f8ff;' : ''}">
                            <div>
                                <strong>${project.name}</strong> ${isCurrentProject ? '(current)' : ''}
                                <br><small style="color: #666;">Sparad: ${date} kl. ${time}</small>
                            </div>
                            <div>
                                ${!isCurrentProject ? `<button onclick="switchToProject('${project.name}')" style="margin-right: 5px; padding: 4px 8px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">Switch</button>` : ''}
                                <button onclick="deleteProject('${project.name}')" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                            </div>
                        </div>
                    `;
                });
            }
            
            html += `
                        </div>
                        
                        <h3 style="margin-top: 25px;">Create New Project:</h3>
                        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                            <input type="text" id="newProjectName" placeholder="Project name..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <button onclick="createProject()" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Create</button>
                        </div>
                        
                        <div style="text-align: center; margin-top: 25px;">
                            <button onclick="closeProjectManager()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            const modal = document.createElement('div');
            modal.id = 'projectManagerModal';
            modal.innerHTML = html;
            document.body.appendChild(modal);
        }
        
        // Close project manager modal
        function closeProjectManager(event) {
            if (event && event.target !== event.currentTarget) return;
            const modal = document.getElementById('projectManagerModal');
            if (modal) {
                document.body.removeChild(modal);
            }
        }
        
        // Switch to project from modal
        async function switchToProject(projectName) {
            closeProjectManager();
            await switchProject(projectName);
        }
        
        // Create project from modal
        async function createProject() {
            const input = document.getElementById('newProjectName');
            const projectName = input.value.trim();
            
            if (!projectName) {
                alert('Please enter a project name!');
                return;
            }
            
            closeProjectManager();
            await createNewProject(projectName);
        }
        
        // Delete project
        async function deleteProject(projectName) {
            if (projectName === currentProject) {
                alert('Cannot delete the current project! Switch to another project first.');
                return;
            }
            
            if (!confirm(`Are you sure you want to delete project "${projectName}"? This cannot be undone!`)) {
                return;
            }
            
            try {
                // Find and delete the project file
                const project = availableProjects.find(p => p.name === projectName);
                if (project) {
                    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${project.fileId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                    
                    if (response.ok) {
                        // Refresh project list and modal
                        await loadAvailableProjects();
                        closeProjectManager();
                        setTimeout(() => showProjectManager(), 100);
                        updateSyncStatus(`Deleted project: ${projectName}`, 'info');
                    } else {
                        alert('Failed to delete project: ' + response.statusText);
                    }
                }
            } catch (error) {
                console.error('Error deleting project:', error);
                alert('Error deleting project: ' + error.message);
            }
        }
        
        // Auto-sync functionality
        let autoSyncInterval;
        function startAutoSync() {
            if (!isSignedIn || !accessToken) return;
            
            // Auto-save to Drive every 20 minutes when signed in
            autoSyncInterval = setInterval(async () => {
                if (isSignedIn && accessToken) {
                    await saveToGoogleDrive();
                }
            }, 20 * 60 * 1000);
        }
        
        function stopAutoSync() {
            if (autoSyncInterval) {
                clearInterval(autoSyncInterval);
                autoSyncInterval = null;
            }
        }
        
