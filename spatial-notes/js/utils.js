        // MINIMAL UNDO/REDO SYSTEM - Define early so functions can use it
        let undoStack = [];
        let redoStack = [];
        const MAX_UNDO_STEPS = 20;
        
        // Generate unique timestamp-based ID for new cards
        function generateUniqueId() {
            const now = new Date();
            const timestamp = now.getFullYear().toString() +
                            (now.getMonth() + 1).toString().padStart(2, '0') +
                            now.getDate().toString().padStart(2, '0') + '-' +
                            now.getHours().toString().padStart(2, '0') +
                            now.getMinutes().toString().padStart(2, '0') +
                            now.getSeconds().toString().padStart(2, '0');
            
            return timestamp + '-copy';
        }
        
        // Save current state for undo
        function saveState() {
            try {
                const state = {
                    timestamp: Date.now(),
                    cards: cy.nodes().map(node => ({
                        id: node.id(),
                        data: node.data(),
                        position: { x: node.position().x, y: node.position().y },
                        selected: node.selected(),
                        classes: node.classes().join(' ')
                    }))
                };
                
                undoStack.push(state);
                if (undoStack.length > MAX_UNDO_STEPS) {
                    undoStack.shift(); // Remove oldest
                }
                redoStack = []; // Clear redo when new action
                console.log('State saved, undo stack size:', undoStack.length);
            } catch (error) {
                console.warn('Failed to save state:', error);
            }
        }
        
        // Restore state for undo/redo
        function restoreState(state) {
            if (!state || !state.cards) return false;
            
            try {
                // Clear current state
                cy.nodes().remove();
                
                // Recreate all cards from saved state
                state.cards.forEach(cardState => {
                    const newNode = cy.add({
                        data: cardState.data,
                        position: cardState.position
                    });
                    
                    // Restore classes (like 'pinned')
                    if (cardState.classes) {
                        newNode.addClass(cardState.classes);
                    }
                    
                    // Make draggable
                    newNode.grabify();
                    
                    // Restore selection
                    if (cardState.selected) {
                        newNode.select();
                    }
                });
                
                console.log('State restored');
                return true;
            } catch (error) {
                console.warn('Failed to restore state:', error);
                return false;
            }
        }
        
        // Get arrangement position based on mouse or fallback to screen center
        function getArrangementPosition() {
            // If we have a valid mouse position, use it
            if (lastMousePosition.x !== null && lastMousePosition.y !== null) {
                // Convert browser coordinates to cytoscape model coordinates
                const cyContainer = cy.container();
                const containerRect = cyContainer.getBoundingClientRect();
                const relativeX = lastMousePosition.x - containerRect.left;
                const relativeY = lastMousePosition.y - containerRect.top;
                
                // Convert to cytoscape world coordinates
                const pan = cy.pan();
                const zoom = cy.zoom();
                const modelX = (relativeX - pan.x) / zoom;
                const modelY = (relativeY - pan.y) / zoom;
                
                console.log('Mouse position conversion:', {
                    mouse: lastMousePosition,
                    container: containerRect,
                    relative: {x: relativeX, y: relativeY},
                    pan, zoom,
                    model: {x: modelX, y: modelY}
                });
                
                return { x: modelX, y: modelY };
            }
            
            // Fallback to visible viewport center (better for mobile)
            const viewportCenter = cy.pan();
            const zoom = cy.zoom();
            const containerWidth = cy.width();
            const containerHeight = cy.height();
            
            // Calculate center of visible viewport in model coordinates  
            const visibleCenterX = (-viewportCenter.x + containerWidth/2) / zoom;
            const visibleCenterY = (-viewportCenter.y + containerHeight/2) / zoom;
            
            console.log('Using visible viewport center:', {
                x: visibleCenterX,
                y: visibleCenterY,
                pan: viewportCenter,
                zoom: zoom,
                container: {w: containerWidth, h: containerHeight}
            });
            
            return {
                x: visibleCenterX,
                y: visibleCenterY
            };
        }
        
        // Text measurement using invisible ruler
        let textRuler = null;
        
        function initTextRuler() {
            textRuler = document.getElementById('text-ruler');
        }
        
        // Memoization cache for getMeasuredTextHeight
        const heightCache = new Map();
        
        // Generate content hash for memoization
        function getContentHash(node) {
            const title = node.data('title') || '';
            const text = node.data('text') || '';
            const tags = node.data('tags') || [];
            const isImported = node.data('export_source') === 'pdf_extractor' || 
                             node.data('source_file') || 
                             node.data('matched_terms');
            const isWelcomeCard = node.id().startsWith('welcome-');
            
            // Create hash from content and styling factors
            return `${title}|${text}|${tags.join(',')}|${isImported}|${isWelcomeCard}`;
        }
        
        // Clear cache for a specific node (when content changes)
        function clearNodeCache(node) {
            // Remove all cached entries that might match this node
            // We need to remove by pattern since content might have changed
            const nodeId = node.id();
            const keysToDelete = [];
            for (const key of heightCache.keys()) {
                // Simple heuristic: if cache gets too large, clear it periodically
                if (heightCache.size > 500) {
                    heightCache.clear();
                    break;
                }
            }
        }
        
        /**
         * Measures the actual rendered height of a node's text using the invisible ruler (with memoization).
         * @param {object} node The Cytoscape node.
         * @returns {number} The measured height of the text in pixels.
         */
        function getMeasuredTextHeight(node) {
            // SPECIAL HANDLING FOR IMAGE NODES
            if (node.data('type') === 'image' && node.data('imageData')) {
                // Use pre-calculated height if available (for new images)
                const preCalculated = node.data('calculatedHeight');
                if (preCalculated) {
                    return preCalculated;
                }
                
                // For imported images, calculate from stored dimensions
                const imageWidth = node.data('imageWidth');
                const imageHeight = node.data('imageHeight');
                if (imageWidth && imageHeight) {
                    const ratio = imageHeight / imageWidth;
                    return Math.round(300 * ratio); // 300px width, maintain aspect ratio
                }
                
                // Last resort: Use a reasonable default to avoid creating Image objects
                // which can be expensive and cause performance issues
                return 260; // Safe default for images - avoid creating Image objects
            }
            
            // NORMAL TEXT NODE PROCESSING
            // Check cache first
            const hash = getContentHash(node);
            if (heightCache.has(hash)) {
                return heightCache.get(hash);
            }
            
            if (!textRuler) initTextRuler();
            
            const title = node.data('title') || '';
            const text = node.data('text') || '';
            const tags = node.data('tags') || [];
            
            // Get the final text content without custom wrapping
            let rawText = text.replace(/\*\*|`|\*|\[|\]/g, '').replace(/^- /gm, '• ');
            
            // Add tags to the measurement
            let tagDisplay = '';
            if (tags.length > 0) {
                tagDisplay = '\n\n' + tags.map(tag => `#${tag}`).join(' ');
            }
            
            const mainText = title ? `${title.toUpperCase()}\n\n${rawText}` : rawText;
            const fullLabel = mainText + tagDisplay;

            // Use EXACT same text-max-width calculation as Cytoscape will use
            const nodeWidth = 300; // Fixed width for all cards
            const textMaxWidth = nodeWidth - 15;

            // Style the ruler to match the node's text properties EXACTLY
            textRuler.style.width = `${textMaxWidth}px`;
            textRuler.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            
            // Use same font-size logic as the Cytoscape style
            const isImported = node.data('export_source') === 'pdf_extractor' || 
                             node.data('source_file') || 
                             node.data('matched_terms');
            const isWelcomeCard = node.id().startsWith('welcome-');
            
            // Imported cards and welcome cards get 18px, all others get 23px
            textRuler.style.fontSize = (isImported || isWelcomeCard) ? '18px' : '23px';
            textRuler.style.lineHeight = '1.2';
            textRuler.style.padding = '0';
            textRuler.style.margin = '0';
            textRuler.style.border = 'none';
            textRuler.style.textAlign = 'center'; // Match Cytoscape text alignment
            textRuler.style.wordWrap = 'break-word';
            
            // Set the text and measure
            textRuler.textContent = fullLabel;
            const measuredTextHeight = textRuler.offsetHeight;
            
            // Add padding that Cytoscape applies to cards
            // Cards need minimum padding for visual breathing room
            const minCardHeight = 140; // 140px minimum height
            
            // Dynamic padding: less padding for longer text, more for short text
            let paddingBuffer;
            if (measuredTextHeight <= 50) {
                paddingBuffer = 25; // Short text needs more padding
            } else if (measuredTextHeight <= 100) {
                paddingBuffer = 20; // Medium text gets normal padding
            } else if (measuredTextHeight <= 200) {
                paddingBuffer = 15; // Long text needs less extra padding
            } else {
                paddingBuffer = 10; // Very long text needs minimal padding
            }
            
            const totalHeight = Math.max(minCardHeight, measuredTextHeight + paddingBuffer);
            
            // Cache the result
            heightCache.set(hash, totalHeight);
            
            return totalHeight;
        }
        
        // Subtle orphan prevention - use non-breaking spaces to keep last 2-3 words together
        function preventOrphansSubtly(text) {
            const words = text.split(' ');
            
            // If text is short, don't modify
            if (words.length <= 4) return text;
            
            // Join last 2-3 words with non-breaking spaces to prevent orphan words
            const lastWords = words.slice(-3); // Last 3 words
            const beforeWords = words.slice(0, -3); // Everything before last 3 words
            
            // Use non-breaking space (Unicode 00A0) to keep last words together
            const joinedLastWords = lastWords.join('\u00A0');
            
            return beforeWords.length > 0 ? 
                beforeWords.join(' ') + ' ' + joinedLastWords : 
                joinedLastWords;
        }
        
