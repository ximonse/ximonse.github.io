            cy.nodes().style('display', 'element');

            const searchInfo = document.getElementById('searchInfo');
            searchInfo.classList.remove('visible');

            // Hide mobile select button
            const selectBtn = document.getElementById('searchSelectBtn');
            selectBtn.style.display = 'none';
        }
        
        // Tag filtering functions with Boolean logic
        function performTagFilter(filterText) {
            if (!filterText.trim()) {
                clearTagFilter();
                return;
            }
            
            const query = filterText.toLowerCase().trim();
            let matchCount = 0;
            
            cy.nodes().forEach(node => {
                const nodeTags = node.data('tags') || [];
                const nodeTagsLower = nodeTags.map(tag => tag.toLowerCase());
                
                // Create searchable tag string (space-separated for boolean evaluation)
                const searchableTagText = nodeTagsLower.join(' ');
                
                // Use boolean evaluation on tags
                const matches = evaluateBooleanTagQuery(query, searchableTagText, nodeTagsLower);
                
                if (matches) {
                    node.removeClass('tag-filtered');
                    matchCount++;
                } else {
                    node.addClass('tag-filtered');
                }
            });
            
            const searchInfo = document.getElementById('searchInfo');
            searchInfo.textContent = `${matchCount} kort matchade tag-filter: "${filterText}"`;
            searchInfo.classList.add('visible');
        }
        
        // Boolean query evaluation specifically for tags
        function evaluateBooleanTagQuery(query, searchableTagText, nodeTagsArray) {
            // Handle different boolean operators for tags
            
            // Split by OR first (lowest precedence)
            if (query.includes(' or ')) {
                const orParts = query.split(' or ');
                return orParts.some(part => evaluateBooleanTagQuery(part.trim(), searchableTagText, nodeTagsArray));
            }
            
            // Handle NOT operations
            if (query.includes(' not ')) {
                const notIndex = query.indexOf(' not ');
                const beforeNot = query.substring(0, notIndex).trim();
                const afterNot = query.substring(notIndex + 5).trim(); // ' not '.length = 5
                
                // If there's something before NOT, it must match
                let beforeMatches = true;
                if (beforeNot) {
                    beforeMatches = evaluateBooleanTagQuery(beforeNot, searchableTagText, nodeTagsArray);
                }
                
                // The part after NOT must NOT match
                const afterMatches = evaluateBooleanTagQuery(afterNot, searchableTagText, nodeTagsArray);
                
                return beforeMatches && !afterMatches;
            }
            
            // Handle AND operations (default behavior and explicit)
            const andParts = query.includes(' and ') ? 
                query.split(' and ') : 
                query.split(' ').filter(term => term.length > 0);
                
            return andParts.every(term => {
                term = term.trim();
                
                if (term.startsWith('"') && term.endsWith('"')) {
                    // Exact tag search - must match complete tag
                    const exactTag = term.slice(1, -1);
                    return nodeTagsArray.some(tag => tag === exactTag);
                } else {
                    // Partial tag search - can be part of any tag
                    return nodeTagsArray.some(tag => tag.includes(term));
                }
            });
        }
        
        function clearTagFilter() {
            cy.nodes().removeClass('tag-filtered');
            const searchInfo = document.getElementById('searchInfo');
            searchInfo.classList.remove('visible');
        }
        
        // Multi-selection functions
        function pinSelectedCards() {
            const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
            selectedNodes.forEach(node => {
                if (!node.hasClass('pinned')) {
                    pinCard(node);
                }
            });
            if (selectedNodes.length > 0) {
                console.log(`Pinned ${selectedNodes.length} cards`);
                updateSelectionInfo(); // Update after pinning
            }
        }
        
        function unpinSelectedCards() {
            const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
            selectedNodes.forEach(node => {
                if (node.hasClass('pinned')) {
                    unpinCard(node);
                }
            });
            if (selectedNodes.length > 0) {
                console.log(`Unpinned ${selectedNodes.length} cards`);
                updateSelectionInfo(); // Update after unpinning
            }
        }
        
        function deleteSelectedCards() {
            // Get all selected nodes and edges
            const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
            const selectedEdges = cy.$('edge:selected');
            console.log(`Delete attempt on ${selectedNodes.length} selected nodes and ${selectedEdges.length} selected edges`);
            
            if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
            
            // Save state for undo before deleting
            saveState();
            
            // Delete selected edges (arrows) first - they have no protection
            if (selectedEdges.length > 0) {
                const edgeCount = selectedEdges.length;
                cy.batch(() => {
                    selectedEdges.remove();
                });
                console.log(`✅ Deleted ${edgeCount} selected arrows`);
                
                // Save the board to persist changes
                saveBoard();
            }
            
            // Filter out ALL pinned cards using proper filtering
            const unpinnedNodes = selectedNodes.filter(function(node) {
                const hasClass = node.hasClass('pinned');
                const hasData = node.data('pinned');
                const isPinned = hasClass || hasData;
                
                console.log(`Node ${node.id()}: hasClass=${hasClass}, hasData=${hasData}, isPinned=${isPinned}`);
                return !isPinned;
            });
            
            const pinnedNodes = selectedNodes.filter(function(node) {
                const hasClass = node.hasClass('pinned');
                const hasData = node.data('pinned');
                return hasClass || hasData;
            });
            
            console.log(`Unpinned to delete: ${unpinnedNodes.length}, Pinned to skip: ${pinnedNodes.length}`);
            
            // Only delete unpinned nodes
            if (unpinnedNodes.length > 0) {
                const count = unpinnedNodes.length;
                unpinnedNodes.remove();
                console.log(`Successfully deleted ${count} unpinned cards`);
                updateSelectionInfo(); // Update after deletion
            }
            
            // Show message if user tried to delete pinned cards
            if (pinnedNodes.length > 0) {
                const pinnedCount = pinnedNodes.length;
                console.log(`PROTECTED: Skipped ${pinnedCount} pinned cards - unpin them first to delete`);
                
                // Show a brief visual feedback
                const searchInfo = document.getElementById('searchInfo');
                if (searchInfo) {
                    searchInfo.textContent = `🔒 ${pinnedCount} pinnade kort skyddade - ta bort pinning först`;
                    searchInfo.classList.add('visible');
                    setTimeout(() => {
                        searchInfo.classList.remove('visible');
                    }, 4000);
                }
            }
        }
        
        // ========================================
        // SORTING SYSTEM - EASY TO FIND
        // ========================================
        // Global sorting state
        let sortMode = null; // null, 'textLength-asc', 'textLength-desc', 'alphabetic-asc', 'alphabetic-desc', 'color', 'date-asc', 'date-desc', 'temporal-asc', 'temporal-desc', 'tagCount'
        
        function showSortMenu(event) {
            event.preventDefault();
            event.stopPropagation();
            
            // Column view: no selection required, automatic sorting
            if (isColumnView) {
                // Show column view specific sort menu
                showColumnViewSortMenu(event);
                return;
            }
            
            // Board view: Check if we have selected nodes
            const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
            if (selectedNodes.length < 2) {
                alert('Markera minst 2 kort för att sortera');
                return;
            }
            
            // Create sort menu
            const sortMenu = document.createElement('div');
            sortMenu.id = 'sortMenu';
            sortMenu.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: white; border: 2px solid #007acc; border-radius: 8px;
                padding: 15px; z-index: 10001; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            sortMenu.innerHTML = `
                <h3 style="margin: 0 0 15px 0; text-align: center; color: #007acc;">📊 Sortera ${selectedNodes.length} kort</h3>
                <p style="margin: 0 0 15px 0; text-align: center; font-size: 14px; color: #666;">
                    Välj sortering, tryck sedan H/V/G+V/G+H/G+T för layout
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button onclick="setSortMode('textLength-asc')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">📝 Text: Kort → Lång</button>
                    <button onclick="setSortMode('textLength-desc')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">📝 Text: Lång → Kort</button>
                    <button onclick="setSortMode('alphabetic-asc')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🔤 A → Z</button>
                    <button onclick="setSortMode('alphabetic-desc')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🔤 Z → A</button>
                    <button onclick="setSortMode('color')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🎨 Färg 1→6</button>
                    <button onclick="setSortMode('date-asc')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">📅 Skapande: Äldst → Nyast</button>
                    <button onclick="setSortMode('date-desc')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">📅 Skapande: Nyast → Äldst</button>
                    <button onclick="setSortMode('temporal-asc')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🕒 Datum: Tidigare → Senare</button>
                    <button onclick="setSortMode('temporal-desc')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🕒 Datum: Senare → Tidigare</button>
                    <button onclick="setSortMode('today-first')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🌅 Idag först</button>
                    <button onclick="setSortMode('tagCount')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🏷️ Färre → Fler taggar</button>
                </div>
                <div style="text-align: center; margin-top: 15px;">
                    <button onclick="closeSortMenu()" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Avbryt</button>
                </div>
            `;
            
            document.body.appendChild(sortMenu);
            
            // Close on outside click
            setTimeout(() => {
                document.addEventListener('click', function closeSortOnClick(e) {
                    if (!sortMenu.contains(e.target)) {
                        closeSortMenu();
                        document.removeEventListener('click', closeSortOnClick);
                    }
                });
            }, 100);
        }
        
        function setSortMode(mode) {
            sortMode = mode;
            console.log('Sort mode set to:', mode);
            closeSortMenu();
            
            if (isColumnView) {
                // Column view: apply sorting immediately
                setColumnViewSortFromBoardMode(mode);
            } else {
                // Board view: show instruction
                const statusDiv = document.getElementById('selectionInfo');
                if (statusDiv) {
                    statusDiv.textContent = `Sorteringsläge: ${getSortModeDescription(mode)}. Tryck H/V/G+V/G+H/G+T för layout.`;
                    statusDiv.classList.add('visible');
                    
                    // Auto-hide after 5 seconds
                    setTimeout(() => {
                        if (sortMode === mode) { // Only hide if we're still in same sort mode
                            statusDiv.classList.remove('visible');
                        }
                    }, 5000);
                }
            }
        }

        // Column view specific sort menu
        function showColumnViewSortMenu(event) {
            // Create sort menu
            const sortMenu = document.createElement('div');
            sortMenu.id = 'sortMenu';
            sortMenu.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: white; border: 2px solid #007acc; border-radius: 8px;
                padding: 15px; z-index: 10001; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            sortMenu.innerHTML = `
                <h3 style="margin: 0 0 15px 0; text-align: center; color: #007acc;">📊 Kolumnvy Sortering</h3>
                <p style="margin: 0 0 15px 0; text-align: center; font-size: 14px; color: #666;">
                    Välj sortering - appliceras automatiskt på alla kort
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button onclick="setColumnViewSort('alphabetical')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🔤 A → Z</button>
                    <button onclick="setColumnViewSort('reverse-alphabetical')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🔤 Z → A</button>
                    <button onclick="setColumnViewSort('creation')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">📅 Skapande: Äldst → Nyast</button>
                    <button onclick="setColumnViewSort('reverse-creation')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">📅 Skapande: Nyast → Äldst</button>
                    <button onclick="setColumnViewSort('tags')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🏷️ Tags</button>
                    <button onclick="setColumnViewSort('color')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🎨 Färg 1→6</button>
                    <button onclick="setColumnViewSort('tagged-date')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">📆 @datum Äldst → Nyast</button>
                    <button onclick="setColumnViewSort('reverse-tagged-date')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">📆 @datum Nyast → Äldst</button>
                    <button onclick="setColumnViewSort('today-first')" style="padding: 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">🌅 Idag först</button>
                </div>
                <div style="text-align: center; margin-top: 15px;">
                    <button onclick="closeSortMenu()" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Avbryt</button>
                </div>
            `;
            
            document.body.appendChild(sortMenu);
        }

        // Convert board sort mode to column sort mode
        function setColumnViewSortFromBoardMode(boardMode) {
            let columnMode = 'creation'; // default
            
            switch(boardMode) {
                case 'alphabetic-asc':
                    columnMode = 'alphabetical';
                    break;
                case 'alphabetic-desc':
                    columnMode = 'reverse-alphabetical';
                    break;
                case 'date-asc':
                    columnMode = 'creation';
                    break;
                case 'date-desc':
                    columnMode = 'reverse-creation';
                    break;
                case 'tagCount':
                    columnMode = 'tags';
                    break;
                default:
                    columnMode = 'creation';
            }
            
            setColumnViewSort(columnMode);
        }
        
        function closeSortMenu() {
            const sortMenu = document.getElementById('sortMenu');
            if (sortMenu) {
                document.body.removeChild(sortMenu);
            }
        }
        
        function getSortModeDescription(mode) {
            switch(mode) {
                case 'textLength-asc': return 'Text kort → lång';
                case 'textLength-desc': return 'Text lång → kort';
                case 'alphabetic-asc': return 'Alfabetisk A → Z';
                case 'alphabetic-desc': return 'Alfabetisk Z → A';
                case 'color': return 'Färg 1 → 6';
                case 'date-asc': return 'Skapande: Äldst → nyast';
                case 'date-desc': return 'Skapande: Nyast → äldst';
                case 'temporal-asc': return 'Datum: Tidigare → senare';
                case 'temporal-desc': return 'Datum: Senare → tidigare';
                case 'today-first': return 'Idag först';
                case 'tagCount': return 'Färre → fler taggar';
                default: return 'Okänt';
            }
        }
        
        function sortNodes(nodes) {
            if (!sortMode) return nodes;
            
            return nodes.sort((a, b) => {
                switch(sortMode) {
                    case 'textLength-asc':
                        const aTextLength = (a.data('text') || '').length;
                        const bTextLength = (b.data('text') || '').length;
                        return aTextLength - bTextLength;
                        
                    case 'textLength-desc':
                        const aTextLengthDesc = (a.data('text') || '').length;
                        const bTextLengthDesc = (b.data('text') || '').length;
                        return bTextLengthDesc - aTextLengthDesc;
                        
                    case 'alphabetic-asc':
                        const aText = (a.data('text') || '').toLowerCase();
                        const bText = (b.data('text') || '').toLowerCase();
                        return aText.localeCompare(bText, 'sv');
                        
                    case 'alphabetic-desc':
                        const aTextDesc = (a.data('text') || '').toLowerCase();
                        const bTextDesc = (b.data('text') || '').toLowerCase();
                        return bTextDesc.localeCompare(aTextDesc, 'sv');
                        
                    case 'color':
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
                        
                    case 'date-asc':
                        const aDate = extractDateFromId(a.id());
                        const bDate = extractDateFromId(b.id());
                        return aDate - bDate;
                        
                    case 'date-desc':
                        const aDateDesc = extractDateFromId(a.id());
                        const bDateDesc = extractDateFromId(b.id());
                        return bDateDesc - aDateDesc;
                        
                    case 'temporal-asc':
                        const aTemporalDate = getEarliestDateFromContent(a);
                        const bTemporalDate = getEarliestDateFromContent(b);
                        return aTemporalDate - bTemporalDate;
                        
                    case 'temporal-desc':
                        const aTemporalDateDesc = getEarliestDateFromContent(a);
                        const bTemporalDateDesc = getEarliestDateFromContent(b);
                        return bTemporalDateDesc - aTemporalDateDesc;
                        
                    case 'tagCount':
                        const aTagCount = (a.data('tags') || []).length;
                        const bTagCount = (b.data('tags') || []).length;
                        return aTagCount - bTagCount;
                        
                    case 'today-first':
                        const aTodayScore = getTodayScore(a);
                        const bTodayScore = getTodayScore(b);
                        return bTodayScore - aTodayScore; // Higher score = today content = first
                        
                    default:
                        return 0;
                }
            });
        }
        
        // Get nodes sorted by arrow connections (topological sort)
        function getArrowBasedOrder(selectedNodes) {
            console.log('🔍 getArrowBasedOrder called with:', selectedNodes.length, 'nodes');
            
            // Get all edges connecting the selected nodes
            const nodeIds = new Set(selectedNodes.map(node => node.id()));
            console.log('📝 Selected node IDs:', Array.from(nodeIds));
            
            const allEdges = cy.edges();
            console.log('📊 Total edges in graph:', allEdges.length);
            
            const relevantEdges = allEdges.filter(edge => {
                const sourceId = edge.source().id();
                const targetId = edge.target().id();
                const isRelevant = nodeIds.has(sourceId) && nodeIds.has(targetId);
                if (isRelevant) {
                    console.log('✅ Found relevant edge:', sourceId, '→', targetId);
                }
                return isRelevant;
            });
            
            console.log('🔗 Relevant edges found:', relevantEdges.length);
            
            if (relevantEdges.length === 0) {
                console.log('❌ No arrows between selected nodes, returning original order');
                return selectedNodes; // No arrows, return original order
            }
            
            // Build adjacency list for topological sort
            const adjList = new Map();
            const inDegree = new Map();
            
            // Initialize all selected nodes
            selectedNodes.forEach(node => {
                const id = node.id();
                adjList.set(id, []);
                inDegree.set(id, 0);
            });
            
            // Build graph from edges
            relevantEdges.forEach(edge => {
                const sourceId = edge.source().id();
                const targetId = edge.target().id();
                
                console.log('🔧 Building edge:', sourceId, '→', targetId);
                adjList.get(sourceId).push(targetId);
                inDegree.set(targetId, inDegree.get(targetId) + 1);
            });
            
            console.log('📈 In-degrees:', Object.fromEntries(inDegree));
            
            // Kahn's algorithm for topological sorting
            const queue = [];
            const sortedOrder = [];
            
            // Find nodes with no incoming edges
            for (const [nodeId, degree] of inDegree) {
                if (degree === 0) {
                    console.log('🚀 Starting node (no incoming edges):', nodeId);
                    queue.push(nodeId);
                }
            }
            
            while (queue.length > 0) {
                const currentId = queue.shift();
                sortedOrder.push(currentId);
                console.log('✔️ Processing node:', currentId);
                
                // Process neighbors
                const neighbors = adjList.get(currentId) || [];
                neighbors.forEach(neighborId => {
                    inDegree.set(neighborId, inDegree.get(neighborId) - 1);
                    console.log('📉 Reduced in-degree for', neighborId, 'to', inDegree.get(neighborId));
                    if (inDegree.get(neighborId) === 0) {
                        console.log('🚀 Adding to queue:', neighborId);
                        queue.push(neighborId);
                    }
                });
            }
            
            // Handle cycles - add remaining nodes
            selectedNodes.forEach(node => {
                if (!sortedOrder.includes(node.id())) {
                    console.log('⚠️ Adding remaining node (possible cycle):', node.id());
                    sortedOrder.push(node.id());
                }
            });
            
            // Convert back to node objects in sorted order
            const nodeMap = new Map(selectedNodes.map(node => [node.id(), node]));
            const sortedNodes = sortedOrder.map(id => nodeMap.get(id)).filter(Boolean);
            
            console.log('🎯 Final sorted order:', sortedOrder);
            console.log('✅ Arrow-based sorting complete:', relevantEdges.length, 'edges found, sorted', sortedNodes.length, 'nodes');
            return sortedNodes;
        }

        function extractDateFromId(nodeId) {
            // Try to extract timestamp from ID like "20250810-143052"
            const match = nodeId.match(/(\d{8}-\d{6})/);
            if (match) {
                const dateStr = match[1];
                const year = parseInt(dateStr.substr(0, 4));
                const month = parseInt(dateStr.substr(4, 2)) - 1; // Month is 0-indexed
                const day = parseInt(dateStr.substr(6, 2));
                const hour = parseInt(dateStr.substr(9, 2));
                const minute = parseInt(dateStr.substr(11, 2));
                const second = parseInt(dateStr.substr(13, 2));
                return new Date(year, month, day, hour, minute, second).getTime();
            }
            
            // Fallback for older IDs - return very old date
            return new Date(2020, 0, 1).getTime();
        }

        // ========================================
        // DATE-BASED AUTO-MARKING SYSTEM
        // ========================================
        
        // Parse date from @YYMMDD format (e.g., @250816)
        function parseDateFromContent(content) {
            const datePatterns = [];
            
            // Pattern 1: @YYMMDD (e.g., @250816)
            const yymmddPattern = /@(\d{6})/g;
            let match;
            while ((match = yymmddPattern.exec(content)) !== null) {
                const dateStr = match[1];
                const year = 2000 + parseInt(dateStr.substr(0, 2));
                const month = parseInt(dateStr.substr(2, 2)) - 1; // Month is 0-indexed
                const day = parseInt(dateStr.substr(4, 2));
                
                // Validate date
                if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                    datePatterns.push({
                        type: 'date',
                        date: new Date(year, month, day),
                        match: match[0]
                    });
                }
            }
            
            // Pattern 2: @YYwWW (e.g., @25w33)
            const weekPattern = /@(\d{2})w(\d{1,2})/g;
            while ((match = weekPattern.exec(content)) !== null) {
                const year = 2000 + parseInt(match[1]);
                const week = parseInt(match[2]);
                
                // Calculate date from week number
                if (week >= 1 && week <= 53) {
                    const weekDate = getDateFromWeek(year, week);
                    datePatterns.push({
                        type: 'week',
                        date: weekDate,
                        week: week,
                        year: year,
                        match: match[0]
                    });
                }
            }
            
            return datePatterns;
        }
        
        // Get date from ISO week number
        function getDateFromWeek(year, week) {
            const januaryFirst = new Date(year, 0, 1);
            const daysToFirstMonday = (8 - januaryFirst.getDay()) % 7;
            const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
            const targetDate = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
            return targetDate;
        }
        
        // Get ISO week number from date
        function getWeekNumber(date) {
            const target = new Date(date.valueOf());
            const dayNr = (date.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = target.valueOf();
            target.setMonth(0, 1);
            if (target.getDay() !== 4) {
                target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
            }
            return 1 + Math.ceil((firstThursday - target) / 604800000);
        }
        
        // Check if node has todo tag in tags array
        function hasTodoTag(node) {
            const tags = node.data('tags') || [];
            return tags.some(tag => tag.toLowerCase() === 'todo');
        }

        function hasDoneTag(node) {
            const tags = node.data('tags') || [];
            return tags.some(tag => tag.toLowerCase() === 'done');
        }

        // Automatically assign gray color to cards with #done tags
        function applyAutoDoneColoring(node) {
            if (hasDoneTag(node)) {
                // Set gray color (card-color-7) for done tasks
                node.data('cardColor', 'card-color-7');
                
                // Update cytoscape styling immediately
                const colorValue = getCardColorValue('card-color-7', getCurrentTheme());
                node.style('background-color', colorValue);
                
                console.log(`Auto-colored card ${node.id()} gray for #done tag`);
            }
        }
        
        // Calculate temporal relevance and get marking intensity
        function getTemporalMarking(datePatterns, hasTodo, hasDone, today = new Date()) {
            if (!datePatterns || datePatterns.length === 0) {
                return null;
            }
            
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const currentWeek = getWeekNumber(today);
            const currentYear = today.getFullYear();
            
            let strongestMarking = null;
            
            datePatterns.forEach(pattern => {
                let marking = null;
                
                if (pattern.type === 'date') {
                    const targetDate = new Date(pattern.date.getFullYear(), pattern.date.getMonth(), pattern.date.getDate());
                    const daysDiff = Math.floor((targetDate - todayStart) / (24 * 60 * 60 * 1000));
                    
                    if (daysDiff === 0) {
                        // Today - strongest marking
                        marking = { intensity: 1.0, color: 'today', reason: 'Today' };
                    } else if (daysDiff === 1 && hasTodo) {
                        // Tomorrow + #todo - strong marking
                        marking = { intensity: 0.9, color: 'tomorrow-todo', reason: 'Tomorrow + #todo' };
                    } else if (daysDiff >= 2 && daysDiff <= 14) {
                        // 2-14 days future - gradual fade
                        const intensity = 0.8 - ((daysDiff - 2) / 12) * 0.6; // 0.8 -> 0.2
                        marking = { intensity, color: 'future', reason: `${daysDiff} days ahead` };
                    } else if (daysDiff < 0 && hasDone) {
                        // Past + #done - light green marking
                        marking = { intensity: 0.7, color: 'past-done', reason: 'Past + #done' };
                    } else if (daysDiff < 0 && hasTodo) {
                        // Past + #todo - black marking (highest intensity for past)
                        marking = { intensity: 0.85, color: 'past-todo', reason: 'Past + #todo' };
                    }
                } else if (pattern.type === 'week') {
                    if (pattern.year === currentYear && pattern.week === currentWeek) {
                        // Current week - strong marking
                        marking = { intensity: 0.8, color: 'current-week', reason: 'Current week' };
                    } else if (pattern.year === currentYear && pattern.week === currentWeek + 1) {
                        // Next week - milder but with #todo boost
                        const intensity = hasTodo ? 0.7 : 0.5;
                        marking = { intensity, color: 'next-week', reason: 'Next week' + (hasTodo ? ' + #todo' : '') };
                    }
                }
                
                // Keep strongest marking
                if (marking && (!strongestMarking || marking.intensity > strongestMarking.intensity)) {
                    strongestMarking = marking;
                }
            });
            
            return strongestMarking;
        }
        
        // Get border style for temporal marking (Cytoscape format)
        function getTemporalBorderStyle(marking) {
            if (!marking) return null;
            
            const baseWidth = Math.max(1, Math.ceil(marking.intensity * 1.5) + 0.5); // 1-2px width based on intensity
            
            const colorMap = {
                'today': '#ff4500', // Red-orange for today
                'tomorrow-todo': '#ff8c00', // Orange for tomorrow+todo
                'future': '#1e90ff', // Blue for future dates
                'past-todo': '#000000', // Black for past+todo
                'past-done': '#90EE90', // Light green for past+done
                'current-week': '#32cd32', // Lime green for current week
                'next-week': '#9370db' // Medium slate blue for next week
            };
            
            const color = colorMap[marking.color] || '#808080';
            
            return {
                'border-width': baseWidth,
                'border-color': color
            };
        }
        
        // Apply temporal markings to all cards
        function applyTemporalMarkings() {
            const today = new Date();
            console.log('🕒 Applying temporal markings for date:', today.toDateString());
            
            let markedCount = 0;
            
            cy.nodes().forEach(node => {
                const title = node.data('title') || '';
                const text = node.data('text') || '';
                const tags = node.data('tags') || [];
                const tagsString = tags.join(' ');
                const fullContent = title + ' ' + text + ' ' + tagsString;

                console.log(`Checking card "${title}": "${fullContent}"`);

                // Parse dates and check for todo/done
                const datePatterns = parseDateFromContent(fullContent);
                const hasTodo = hasTodoTag(node);
                const hasDone = hasDoneTag(node);
                
                console.log(`  - Date patterns found:`, datePatterns);
                console.log(`  - Has #todo:`, hasTodo);
                console.log(`  - Has #done:`, hasDone);
                
                // Get temporal marking
                const marking = getTemporalMarking(datePatterns, hasTodo, hasDone, today);
                console.log(`  - Temporal marking:`, marking);
                
                if (marking) {
                    // Apply border styling via node data and class
                    const borderStyle = getTemporalBorderStyle(marking);
                    if (borderStyle) {
                        console.log(`  - Applying border style:`, borderStyle);
                        
                        // Store temporal styling in node data
                        node.data('temporalBorderWidth', borderStyle['border-width']);
                        node.data('temporalBorderColor', borderStyle['border-color']);
                        
                        // Add temporal marking class to trigger stylesheet
                        node.addClass('temporal-marked');
                        
                        markedCount++;
                        console.log(`🎯 Marked card ${node.id()}: ${marking.reason} (intensity: ${marking.intensity.toFixed(2)}, color: ${borderStyle['border-color']}, width: ${borderStyle['border-width']})`);
                    }
                } else {
                    // Remove temporal marking
                    node.removeClass('temporal-marked');
                    node.removeData('temporalBorderWidth');
                    node.removeData('temporalBorderColor');
                }
            });
            
            // Force Cytoscape to update styling
            cy.style().update();
            
            console.log(`✅ Temporal marking complete: ${markedCount} cards marked`);
            return markedCount;
        }
        
        // Debug function to check hidden_tags - call this in console
        function debugHiddenTags() {
            console.log('=== HIDDEN TAGS DEBUG ===');
            cy.nodes().forEach(node => {
                const hiddenTags = node.data('hidden_tags') || [];
                const isCopy = node.data('isCopy');
                const copyOf = node.data('copyOf');
                const copyTimestamp = node.data('copyTimestamp');
                
                if (hiddenTags.length > 0 || isCopy) {
                    console.log(`Card ${node.id()}:`);
                    console.log(`  Title: "${node.data('title')}"`);
                    console.log(`  Hidden tags:`, hiddenTags);
                    console.log(`  isCopy:`, isCopy);
                    console.log(`  copyOf:`, copyOf);
                    console.log(`  copyTimestamp:`, copyTimestamp);
                    console.log('---');
                }
            });
            console.log('=== END DEBUG ===');
        }
        
        // Test copy search - call this in console 
        function testCopySearch() {
            console.log('🧪 Testing copy search functionality...');
            
            // Create test card
            const testNode = cy.add({
                data: {
                    id: 'test-copy-search',
                    title: 'Test Original',
                    text: 'This is a test card',
                    tags: ['test'],
                    hidden_tags: [],
                    searchMatch: false
                },
                position: { x: 100, y: 100 }
            });
            testNode.grabify();
            
            // Select and copy it
            testNode.select();
            copySelectedCards();
            
            // Create copy via arrangement
            arrangeCopiedCardsInRow();
            
            console.log('✅ Test setup complete. Now try searching for "copy_" in the search box');
            console.log('💡 Also try: debugHiddenTags() to see all hidden tags');
        }
        
        // Test function for temporal markings - call this in console
        function testTemporalMarkings() {
            // Create test cards with different date scenarios
            const testData = [
                { id: 'test-today', title: 'Today Test', text: 'Meeting @250816', x: 100, y: 100 },
                { id: 'test-tomorrow', title: 'Tomorrow Test', text: 'Task @250817 #todo', x: 300, y: 100 },
                { id: 'test-future', title: 'Future Test', text: 'Event @250820', x: 500, y: 100 },
                { id: 'test-week', title: 'Week Test', text: 'Week meeting @25w33', x: 700, y: 100 },
                { id: 'test-past', title: 'Past Test', text: 'Old task @250815 #todo', x: 900, y: 100 }
            ];
            
            // Add test cards
            testData.forEach(card => {
                // Remove if exists
                const existing = cy.getElementById(card.id);
                if (existing.length > 0) {
                    existing.remove();
                }
                
                const node = cy.add({
                    data: {
                        id: card.id,
                        title: card.title,
                        text: card.text,
                        tags: [],
                        searchMatch: false
                    },
                    position: { x: card.x, y: card.y }
                });
                
                // Apply auto-gray coloring for #done tags
                applyAutoDoneColoring(node);
                
                node.grabify();
            });
            
            // Apply temporal markings
            setTimeout(() => {
                applyTemporalMarkings();
            }, 500);
            
            console.log('🧪 Test cards created! Check console for marking details.');
        }
        
        // Get earliest date from card content for sorting
        function getEarliestDateFromContent(node) {
            const title = node.data('title') || '';
            const text = node.data('text') || '';
            const tags = node.data('tags') || [];
            const tagsString = tags.join(' ');
            const fullContent = title + ' ' + text + ' ' + tagsString;

            const datePatterns = parseDateFromContent(fullContent);
            
            if (!datePatterns || datePatterns.length === 0) {
                // No dates found - use card creation date as fallback
                return extractDateFromId(node.id());
            }
            
            // Find earliest date from content
            let earliestDate = null;
            datePatterns.forEach(pattern => {
                const dateTime = pattern.date.getTime();
                if (!earliestDate || dateTime < earliestDate) {
                    earliestDate = dateTime;
                }
            });
            
            return earliestDate || extractDateFromId(node.id());
        }
        
        // Get today score for sorting - higher score means more likely to be today's content
        function getTodayScore(node) {
            const title = node.data('title') || '';
            const text = node.data('text') || '';
            const tags = (node.data('tags') || []).join(' ');
            const fullContent = title + ' ' + text + ' ' + tags;
            
            const today = new Date();
            const todayYYMMDD = getTodayYYMMDD();
            const todayMonthDay = getTodayMonthDay();
            
            let score = 0;
            
            // Check for YYMMDD format (e.g., 250912)
            if (fullContent.includes(todayYYMMDD)) {
                score += 100;
            }
            
            // Check for full date format (e.g., "12 september" or "12/9")
            const todayDay = today.getDate();
            const todayMonth = today.getMonth() + 1;
            const monthNames = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                              'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
            const todayMonthName = monthNames[today.getMonth()];
            
            // Check for "12 september" format
            const dayMonthPattern = new RegExp(`\\b${todayDay}\\s+${todayMonthName}`, 'i');
            if (dayMonthPattern.test(fullContent)) {
                score += 100;
            }
            
            // Check for "12/9" or "12-9" format
            const numericPattern = new RegExp(`\\b${todayDay}[/-]${todayMonth}\\b`);
            if (numericPattern.test(fullContent)) {
                score += 100;
            }
            
            // Check for @YYMMDD format used by the date system
            if (fullContent.includes(`@${todayYYMMDD}`)) {
                score += 100;
            }
            
            // Check if card was created today by examining the card ID
            const cardCreationDate = getCardCreationDate(node.id());
            if (cardCreationDate && isSameDay(cardCreationDate, today)) {
                score += 50; // Lower score than explicit date mentions, but still prioritized
            }
            
            return score;
        }
        
        // Extract creation date from card ID (format: YYYYMMDD-HHMMSS)
        function getCardCreationDate(cardId) {
            try {
                // Handle timestamp-based IDs like "20250929-142030"
                const timestampMatch = cardId.match(/^(\d{8})-(\d{6})$/);
                if (timestampMatch) {
                    const dateStr = timestampMatch[1]; // YYYYMMDD
                    const timeStr = timestampMatch[2]; // HHMMSS
                    
                    const year = parseInt(dateStr.substr(0, 4));
                    const month = parseInt(dateStr.substr(4, 2)) - 1; // Month is 0-indexed
                    const day = parseInt(dateStr.substr(6, 2));
                    const hour = parseInt(timeStr.substr(0, 2));
                    const minute = parseInt(timeStr.substr(2, 2));
                    const second = parseInt(timeStr.substr(4, 2));
                    
                    return new Date(year, month, day, hour, minute, second);
                }
                
                // Handle other card ID formats if needed
                return null;
            } catch (error) {
                return null;
            }
        }
        
        // Check if two dates are on the same day
        function isSameDay(date1, date2) {
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        }
        
        // Helper function to get today in YYMMDD format
        function getTodayYYMMDD() {
            const today = new Date();
            const year = today.getFullYear().toString().slice(-2);
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            return year + month + day;
        }
        
        // Helper function to get today as month-day
        function getTodayMonthDay() {
            const today = new Date();
            return `${today.getDate()}/${today.getMonth() + 1}`;
        }
        
        // ========================================
        // MOBILE SEARCH SUPPORT
        // ========================================
        
        // Function to select search results (mobile-friendly alternative to Enter key)
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
            // Check if we should arrange copied cards instead
            if (copiedCards.length > 0) {
                arrangeCopiedCardsGridVerticalColumns();
                return;
            }
            
            const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
            if (selectedNodes.length < 2) return;
            
            saveState();
            
            const arrangePos = getArrangementPosition();
            const screenCenterX = arrangePos.x;
            const screenCenterY = arrangePos.y;
            
            // Sort nodes - check arrows first, then custom sorting, then original order
            let nodeArray;
            if (sortMode) {
                nodeArray = sortNodes(selectedNodes.toArray());
                console.log('Applied sorting:', sortMode);
                sortMode = null;
                // Hide status message
                const statusDiv = document.getElementById('selectionInfo');
                if (statusDiv) statusDiv.classList.remove('visible');
            } else {
                // Try arrow-based sorting first
                nodeArray = getArrowBasedOrder(selectedNodes.toArray());
            }
            
            // G+V: Column-focused arrangement with max gap between bottom-edge to top-edge
            const nodeCount = nodeArray.length;
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
                    const node = nodeArray[nodeIndex];
                    const cardHeight = getMeasuredTextHeight(node);
                    
                    // Card center is at currentTopY + half height
                    const cardCenterY = currentTopY + (cardHeight / 2);
                    
                    console.log(`🎯 G+V placing node ${nodeIndex} (${node.id()}) in col ${col}, position ${cardIndex}, top-aligned, gap: ${maxVerticalGap}px`);
                    
                    node.animate({
                        position: { x: colX, y: cardCenterY }
                    }, {
                        duration: 400,
                        easing: 'ease-out'
                    });
                    
                    // Move to next position: current card bottom + gap
                    currentTopY += cardHeight + maxVerticalGap;
                }
            }
            
            console.log(`G+V: Top-alignade kolumner - ${cols} kolumner, 80px vertikalt, 350px horisontellt`);
        }
        
        // G+H: Grid where rows are top-aligned and packed tightly (no row overlap)
        function arrangeSelectedGridHorizontalPacked() {
            // Check if we should arrange copied cards instead
            if (copiedCards.length > 0) {
                arrangeCopiedCardsGridHorizontalPacked();
                return;
            }
            
            const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
            if (selectedNodes.length < 2) return;
            
            // Save state for undo before arranging
            saveState();
            
            // Use mouse position or fallback to screen center
            const arrangePos = getArrangementPosition();
            const screenCenterX = arrangePos.x;
            const screenCenterY = arrangePos.y;
            
            const nodeCount = selectedNodes.length;
            const maxCols = 6;
            const cols = Math.min(maxCols, Math.ceil(Math.sqrt(nodeCount)));
            const rows = Math.ceil(nodeCount / cols);
            
            const horizontalSpacing = 360; // 60px gap between cards (360 - 300 = 60)
            const rowPadding = 95; // Adjusted to get actual 60px visual spacing
            
            const gridWidth = (cols - 1) * horizontalSpacing;
            const startX = screenCenterX - gridWidth / 2;
            
            // Sort nodes - check arrows first, then custom sorting, then original order
            let nodeArray;
            if (sortMode) {
                nodeArray = sortNodes(selectedNodes.toArray());
                console.log('Applied sorting:', sortMode);
                sortMode = null;
                // Hide status message
                const statusDiv = document.getElementById('selectionInfo');
                if (statusDiv) statusDiv.classList.remove('visible');
            } else {
                // Try arrow-based sorting first
                nodeArray = getArrowBasedOrder(selectedNodes.toArray());
            }
            
            // First pass: calculate the height of each row
            const rowHeights = [];
            for (let row = 0; row < rows; row++) {
                let maxRowHeight = 0;
                for (let col = 0; col < cols; col++) {
                    const nodeIndex = row * cols + col;
                    if (nodeIndex < nodeArray.length) {
                        const node = nodeArray[nodeIndex];
                        const cardHeight = getMeasuredTextHeight(node);
                        maxRowHeight = Math.max(maxRowHeight, cardHeight);
                    }
                }
                rowHeights.push(maxRowHeight);
            }
            
            // Calculate total height and start position - top of grid at mouse cursor
            const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0) + (rows - 1) * rowPadding;
            let currentY = screenCenterY; // Top of grid at mouse cursor
            
            // Second pass: position cards row by row with tight packing
            for (let row = 0; row < rows; row++) {
                const rowHeight = rowHeights[row];
                
                for (let col = 0; col < cols; col++) {
                    const nodeIndex = row * cols + col;
                    if (nodeIndex < nodeArray.length) {
                        const node = nodeArray[nodeIndex];
                        const newX = startX + col * horizontalSpacing;
                        
                        // Position card at top of its row space
                        const cardHeight = getMeasuredTextHeight(node);
                        const cardCenterY = currentY + (cardHeight / 2); // Top-aligned within row
                        
                        node.animate({
                            position: { x: newX, y: cardCenterY }
                        }, {
                            duration: 400,
                            easing: 'ease-out'
                        });
                    }
                }
                
                // Move to next row position
                currentY += rowHeight + rowPadding;
            }
            
            console.log(`G+H: Grid med packade rader - toppen vid muspekare - ${rows} rader × ${cols} kolumner för ${selectedNodes.length} kort`);
        }
        
        // G+T: Grid where all rows are top-aligned (all cards in same row at same height)
        // G+T (Grid Tight): Max 6 cards wide, 5% horizontal spacing, 40px overlap between cards vertically
        function arrangeSelectedGridTopAligned() {
            // Check if we should arrange copied cards instead
            if (copiedCards.length > 0) {
                arrangeCopiedCardsGridTopAligned();
                return;
            }
            
            const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
            if (selectedNodes.length < 2) return;
            
            saveState(); // Save for undo
            
            const arrangePos = getArrangementPosition();
            const screenCenterX = arrangePos.x;
            const screenCenterY = arrangePos.y;
            
            const nodeCount = selectedNodes.length;
            const maxCols = 6; // Max 6 cards wide
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
            
            // Sort nodes - check arrows first, then custom sorting, then original order
            const wasSorted = !!sortMode;
            let nodeArray;
            if (sortMode) {
                nodeArray = sortNodes(selectedNodes.toArray());
                console.log('Applied sorting:', sortMode);
                sortMode = null;
                // Hide status message
                const statusDiv = document.getElementById('selectionInfo');
                if (statusDiv) statusDiv.classList.remove('visible');
            } else {
                // Try arrow-based sorting first
                nodeArray = getArrowBasedOrder(selectedNodes.toArray());
            }
            
            // Row-by-row placement to respect arrow sorting order
            for (let row = 0; row < rows; row++) {
                let currentY = topRowY + row * overlapSpacing;
                
                // Go through each column in this row
                for (let col = 0; col < cols; col++) {
                    const nodeIndex = row * cols + col;
                    if (nodeIndex < nodeArray.length) {
                        const node = nodeArray[nodeIndex];
                        const colX = startX + col * (cardWidth + horizontalSpacing);
                        const cardHeight = getMeasuredTextHeight(node);
                        const cardCenterY = currentY + (cardHeight / 2);
                        
                        console.log(`🎯 G+T placing node ${nodeIndex} (${node.id()}) at col ${col}, row ${row}`);
                        
                        node.animate({
                            position: { x: colX, y: cardCenterY }
                        }, {
                            duration: 400,
                            easing: 'ease-out'
                        });
                    }
                }
            }
            
            // Z-LAYERING: Disabled for now - remove/re-add breaks original creation timestamps
            // TODO: Find Cytoscape method that changes render order without breaking node identity
            
            console.log(`G+T: Tight grid with 120px overlap - max ${maxCols} wide, ${rows} deep for ${selectedNodes.length} cards`);
        }
        
        // Change tracking for autosave
        let hasChanges = false;
        let autosaveInterval = null;
        
        // Mark that changes have been made
        function markChanged() {
            hasChanges = true;
        }
        
        // Save board to localStorage or file
        function saveBoard(filename = null, isAutosave = false) {
            const now = new Date();
            const boardData = {
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
                    // Preserve all metadata for advanced analysis
                    export_timestamp: node.data('export_timestamp') || null,
                    export_session: node.data('export_session') || null,
                    export_source: node.data('export_source') || null,
                    source_file: node.data('source_file') || null,
                    page_number: node.data('page_number') || null,
                    matched_terms: node.data('matched_terms') || null,
                    card_index: node.data('card_index') || null,
                    // Annotation-specific data
                    isAnnotation: node.data('isAnnotation') || false,
                    annotationType: node.data('annotationType') || null,
                    customWidth: node.data('customWidth') || null,
                    customHeight: node.data('customHeight') || null,
                    customZIndex: node.data('customZIndex') || null,
                    // Save annotation color from visual style
                    annotationColor: node.data('isAnnotation') ? node.style('background-color') : null,
                    // Save shape data for geometric figures
                    shape: node.data('shape') || null,
                    // Save custom font size for geometric shapes
                    customFontSize: node.data('customFontSize') || null,
                    // Save copy metadata for copy tracking
                    copyOf: node.data('copyOf') || null,
                    isCopy: node.data('isCopy') || false,
                    copyTimestamp: node.data('copyTimestamp') || null,
                    // IMAGE DATA - New addition for v2.0 backwards compatibility
                    type: node.data('type') || null, // 'image' for image nodes
                    imageData: node.data('imageData') || null, // Base64 image data
                    annotation: node.data('annotation') || null, // Image annotation text
                    searchableText: node.data('searchableText') || null, // Lowercased searchable text
                    originalFileName: node.data('originalFileName') || null // Original filename
                })),
                edges: cy.edges().map(edge => ({
                    id: edge.id(),
                    source: edge.source().id(),
                    target: edge.target().id(),
                    // Preserve all edge data
                    isAnnotation: edge.data('isAnnotation') || false,
                    annotationType: edge.data('annotationType') || null,
                    customColor: edge.data('customColor') || null,
                    // Save all visual styling
                    style: {
                        'line-color': edge.style('line-color'),
                        'target-arrow-color': edge.style('target-arrow-color'),
                        'target-arrow-shape': edge.style('target-arrow-shape'),
                        'source-arrow-color': edge.style('source-arrow-color'),
                        'source-arrow-shape': edge.style('source-arrow-shape'),
                        'width': edge.style('width'),
                        'curve-style': edge.style('curve-style'),
                        'control-point-step-size': edge.style('control-point-step-size'),
                        'opacity': edge.style('opacity')
                    }
                })),
                viewport: {
                    zoom: cy.zoom(),
                    pan: cy.pan()
                },
                // Save global arrow visibility state
                arrowsHidden: window.arrowsHidden || false,
                lastModified: now.getTime(), // Unix timestamp for comparison
                timestamp: now.toISOString(), // Human readable
                version: '2.0' // Updated for image support
            };
            
            if (filename) {
                // Save to file
                const blob = new Blob([JSON.stringify(boardData, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // Save to localStorage
                localStorage.setItem('spatial-notes-board', JSON.stringify(boardData));
            }
            
            // Reset change tracking
            hasChanges = false;
            
            // Show saved message
            const searchInfo = document.getElementById('searchInfo');
            if (isAutosave) {
                searchInfo.textContent = 'Auto-sparad ✓';
            } else {
                searchInfo.textContent = 'Sparad ✓';
            }
            searchInfo.classList.add('visible');
            setTimeout(() => {
                searchInfo.classList.remove('visible');
            }, 2000);
        }
        
        // Save with timestamp filename
        function saveWithTimestamp() {
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
            const filename = `board-name_${timestamp}.json`;
            saveBoard(filename);
        }
        
        // Save as dialog
        function saveAs() {
            const filename = prompt('Filnamn (utan .json):', 'my-board');
            if (filename) {
                saveBoard(filename.endsWith('.json') ? filename : filename + '.json');
            }
        }
        
        // Autosave function
        function performAutosave() {
            if (hasChanges) {
                const now = new Date();
                const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
                const filename = `board-name_autosave_${timestamp}.json`;
                saveBoard(filename, true);
            }
        }
        
        // Start autosave timer
        function startAutosave() {
            if (autosaveInterval) {
                clearInterval(autosaveInterval);
            }
            // Every 20 minutes (1200000 ms)
            autosaveInterval = setInterval(performAutosave, 20 * 60 * 1000);
        }
        
        
        // Load board data (internal function without UI alerts)
        function loadBoardFromData(boardData) {
            try {
                // Safety check: Ensure Cytoscape is fully initialized
                if (!cy || !cy.nodes || !cy.add || typeof cy.add !== 'function') {
                    throw new Error('Cytoscape är inte redo än. Vänta ett ögonblick och försök igen.');
                }
                
                // Clear existing nodes
                cy.nodes().remove();
                
                // Add saved cards
                boardData.cards.forEach(cardData => {
                    const newNode = cy.add({
                        data: {
                            id: cardData.id,
                            title: cardData.title,
                            text: cardData.text,
                            tags: cardData.tags || [],
                            hidden_tags: cardData.hidden_tags || [],
                            searchMatch: false,
                            isManualCard: cardData.isManualCard || false,
                            cardColor: cardData.cardColor || null,
                            // Preserve metadata if present
                            export_timestamp: cardData.export_timestamp || null,
                            export_session: cardData.export_session || null,
                            export_source: cardData.export_source || null,
                            source_file: cardData.source_file || null,
                            page_number: cardData.page_number || null,
                            matched_terms: cardData.matched_terms || null,
                            card_index: cardData.card_index || null,
                            // Annotation-specific data
                            isAnnotation: cardData.isAnnotation || false,
                            annotationType: cardData.annotationType || null,
                            customWidth: cardData.customWidth || null,
                            customHeight: cardData.customHeight || null,
                            customZIndex: cardData.customZIndex || null,
                            // Store annotation color for restoration
                            annotationColor: cardData.annotationColor || null,
                            // Store shape data for geometric figures
                            shape: cardData.shape || null,
                            // Store custom font size for geometric shapes
                            customFontSize: cardData.customFontSize || null,
                            // Restore copy metadata for copy tracking
                            copyOf: cardData.copyOf || null,
                            isCopy: cardData.isCopy || false,
                            copyTimestamp: cardData.copyTimestamp || null,
                            // IMAGE DATA - Backwards compatible restoration
                            type: cardData.type || null, // 'image' for image nodes
                            imageData: cardData.imageData || null, // Base64 image data
                            annotation: cardData.annotation || null, // Image annotation text
                            searchableText: cardData.searchableText || null, // Lowercased searchable text
                            originalFileName: cardData.originalFileName || null // Original filename
                        },
                        position: cardData.position
                    });
                    
                    // Restore pinned state
                    if (cardData.pinned) {
                        newNode.addClass('pinned');
                        newNode.data('pinned', true);
                        newNode.ungrabify(); // Prevent dragging pinned cards
                    } else {
                        newNode.grabify(); // Make sure non-pinned cards are draggable
                    }

                    // Restore annotation shape class and text label
                    if (cardData.isAnnotation && cardData.annotationType === 'shape') {
                        newNode.addClass('annotation-shape');
                        
                        // Make sure text shows as label for annotations
                        if (cardData.text) {
                            newNode.style('label', cardData.text);
                            console.log('✅ Restored annotation text:', cardData.text, 'for node:', cardData.id);
                        }
                    }
                    
                    // Restore custom size, layer and color for annotation nodes
                    if (cardData.isAnnotation && (cardData.customWidth || cardData.customHeight || cardData.customZIndex !== null || cardData.annotationColor)) {
                        const width = cardData.customWidth || 120;
                        const height = cardData.customHeight || 120;
                        const zIndex = cardData.customZIndex !== null ? cardData.customZIndex : -1;
                        
                        // Convert internal z-index to Cytoscape z-index
                        let cyZIndex = 1; // default
                        if (zIndex === -1) cyZIndex = 0; // Background
                        if (zIndex === 0) cyZIndex = 1;  // Normal
                        if (zIndex === 1) cyZIndex = 2;  // Foreground
                        
                        const styleUpdate = {
                            'width': width + 'px',
                            'height': height + 'px',
                            'z-index': cyZIndex
                        };
                        
                        // Restore annotation color if saved
                        if (cardData.annotationColor && cardData.annotationColor !== 'rgb(255,255,255)') {
                            styleUpdate['background-color'] = cardData.annotationColor;
                        }
                        
                        // Restore custom font size if saved
                        if (cardData.customFontSize) {
                            styleUpdate['font-size'] = cardData.customFontSize + 'px';
                        }
                        
                        newNode.style(styleUpdate);
                        console.log('✅ Restored annotation styling for', newNode.id(), 'color:', cardData.annotationColor, 'shape:', cardData.shape);
                    }
                    
                    // Restore card color
                    if (cardData.cardColor) {
                        newNode.style('background-color', getCardColorValue(cardData.cardColor, getCurrentTheme()));
                    }
                    
                    // IMAGE NODE RESTORATION - Special handling for image nodes
                    if (cardData.type === 'image' && cardData.imageData) {
                        console.log('🖼️ Restoring image node:', cardData.originalFileName);
                        
                        // Apply image-specific styling (height will be calculated by Cytoscape style function)
                        newNode.style({
                            'background-image': cardData.imageData,
                            'background-fit': 'cover',
                            'width': '300px' // Same as regular cards
                        });
                        
                        // Update label to show annotation indicator if present
                        // Don't show filename in title, keep title empty for clean image display
                        newNode.data('title', '');
                        
                        const filename = cardData.originalFileName || 'Image';
                        const hasAnnotation = (cardData.annotation || '').length > 0;
                        console.log(`✅ Restored image: ${filename} (${hasAnnotation ? 'with annotation' : 'no annotation'})`);
                    }
                    
                    newNode.grabify();
                });
                
                // Restore edges/arrows if they exist
                if (boardData.edges && Array.isArray(boardData.edges)) {
                    boardData.edges.forEach(edgeData => {
                        const newEdge = cy.add({
                            data: {
                                id: edgeData.id,
                                source: edgeData.source,
                                target: edgeData.target,
                                isAnnotation: edgeData.isAnnotation || false,
                                annotationType: edgeData.annotationType || null,
                                customColor: edgeData.customColor || null
                            }
                        });
                        
                        // Apply annotation classes for styling
                        if (edgeData.isAnnotation) {
                            newEdge.addClass('annotation-connection');
                        }
                        
                        // Restore all visual styling
                        if (edgeData.style) {
                            newEdge.style(edgeData.style);
                            // Ensure arrow-scale is applied (for older saved edges)
                            if (!edgeData.style['arrow-scale']) {
                                newEdge.style('arrow-scale', 1.8);
                            }
                            // Ensure curve-style is applied (for older saved edges)
                            if (!edgeData.style['curve-style']) {
                                newEdge.style('curve-style', 'bezier');
                            }
                            console.log('✅ Restored edge styling for', edgeData.id, 'arrow shape:', edgeData.style['target-arrow-shape']);
                        }
                    });
                    console.log('✅ Restored', boardData.edges.length, 'edges/arrows');
                }
                
                // Card IDs are now timestamp-based, no counter needed
                
                // Restore viewport (zoom and pan) if saved
                if (boardData.viewport) {
                    cy.zoom(boardData.viewport.zoom);
                    cy.pan(boardData.viewport.pan);
                }
                
                // Restore global arrow visibility state
                if (boardData.arrowsHidden !== undefined) {
                    window.arrowsHidden = boardData.arrowsHidden;
                    if (window.arrowsHidden) {
                        // Apply hidden state to all edges
                        cy.edges().style('opacity', 0);
                    }
                }
                
                // Removed annoying "Laddade X kort!" alert - user can see the cards loaded
                
                // Apply temporal markings after data is loaded
                setTimeout(() => {
                    applyTemporalMarkings();
                }, 200);
                
            } catch (error) {
                console.error('Error loading board data:', error);
                throw error;
            }
        }
        
        // Load board from file
        function loadBoard() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            const boardData = JSON.parse(e.target.result);
                            loadBoardFromData(boardData);
                            console.log(`File loaded: ${boardData.cards.length} cards and ${(boardData.edges || []).length} edges`);
                        } catch (error) {
                            alert('Fel vid laddning av fil: ' + error.message);
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        }
        
        // Check for newer files on startup
        function checkForNewerFiles() {
            // This is a placeholder - browser can't scan local files for security reasons
            // User will need to manually check their folder or we could implement a file timestamp cache
            console.log('Note: Manual file checking needed - browser cannot scan local folder');
        }
        
        // Startup conflict detection (simplified for browser limitations)
        function checkStartupConflicts() {
            const savedData = localStorage.getItem('spatial-notes-board');
            if (savedData) {
                try {
                    const boardData = JSON.parse(savedData);
                    if (boardData.lastModified) {
                        const lastModified = new Date(boardData.lastModified);
                        const hoursSinceModified = (Date.now() - boardData.lastModified) / (1000 * 60 * 60);
                        
                        if (hoursSinceModified < 24) { // Show warning if modified within 24 hours
                            const timeAgo = hoursSinceModified < 1 ? 
                                `${Math.round(hoursSinceModified * 60)} minuter sedan` : 
                                `${Math.round(hoursSinceModified)} timmar sedan`;
                            
                            console.log(`Varning: LocalStorage har data sparad ${timeAgo}. Kom ihåg att ladda senaste version från fil om du arbetat på annan dator.`);
                            
                            // Show subtle reminder in status
                            const searchInfo = document.getElementById('searchInfo');
                            searchInfo.textContent = `💡 LocalStorage från ${timeAgo}`;
                            searchInfo.classList.add('visible');
                            setTimeout(() => {
                                searchInfo.classList.remove('visible');
                            }, 5000);
                        }
                    }
                } catch (error) {
                    console.error('Error checking startup conflicts:', error);
                }
            }
        }
        
        // Save board as standalone HTML file
        function saveAsHTMLFile() {
            const currentCards = cy.nodes().map(node => ({
                id: node.id(),
                title: node.data('title') || '',
                text: node.data('text') || '',
                tags: node.data('tags') || [],
                position: node.position(),
                pinned: node.hasClass('pinned') || false
            }));
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = prompt('Namn på HTML-fil:', `spatial-notes-${timestamp}`) || `spatial-notes-${timestamp}`;
            
            // Check if running locally (file://) - fetch won't work due to CORS
            if (window.location.protocol === 'file:') {
                alert('HTML-export fungerar inte när filen körs lokalt (file://) pga CORS-säkerhet.\n\nFör att använda HTML-export:\n1. Kör filen på en webbserver\n2. Eller använd "💾 Spara" istället (sparar till localStorage)');
                return;
            }
            
            // Read current HTML as template
            fetch(window.location.href)
                .then(response => response.text())
                .then(currentHTML => {
                    // Replace the initialCards array with current cards
                    const cardArrayRegex = /const initialCards = \[[\s\S]*?\];/;
                    const newCardsArray = `const initialCards = ${JSON.stringify(currentCards, null, 12)};`;
                    
                    let newHTML = currentHTML.replace(cardArrayRegex, newCardsArray);
                    
                    // Update title
                    newHTML = newHTML.replace(/<title>.*?<\/title>/, `<title>Spatial Notes - ${filename}</title>`);
                    
                    // Add metadata comment
                    const metadataComment = `<!-- Saved from Spatial Notes on ${new Date().toLocaleString('sv-SE')} with ${currentCards.length} cards -->`;
                    newHTML = newHTML.replace('</head>', `    ${metadataComment}\n</head>`);
                    
                    // Create and download file
                    const blob = new Blob([newHTML], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename.endsWith('.html') ? filename : filename + '.html';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    // Show confirmation
                    const searchInfo = document.getElementById('searchInfo');
                    searchInfo.textContent = `HTML-fil sparad: ${a.download} (${currentCards.length} kort)`;
                    searchInfo.classList.add('visible');
                    setTimeout(() => {
                        searchInfo.classList.remove('visible');
                    }, 3000);
                })
                .catch(error => {
                    console.error('Error creating HTML file:', error);
                    alert('Fel vid skapande av HTML-fil: ' + error.message);
                });
        }
        
        // Export board to JSON file (WORKS LOCALLY - No CORS issues!)
        function exportToJSON() {
            try {
                const exportData = {
                    metadata: {
                        exportDate: new Date().toISOString(),
                        exportApp: 'Spatial Notes',
                        version: '2.0', // Updated for image support
                        totalCards: cy.nodes().length,
                        totalEdges: cy.edges().length,
                        totalImages: cy.nodes('[type="image"]').length
                    },
                    viewport: {
                        zoom: cy.zoom(),
                        pan: cy.pan()
                    },
                    cards: cy.nodes().map(node => ({
                        id: node.id(),
                        title: node.data('title') || '',
                        text: node.data('text') || '',
                        tags: node.data('tags') || [],
                        hidden_tags: node.data('hidden_tags') || [],
                        position: {
                            x: Math.round(node.position().x),
                            y: Math.round(node.position().y)
                        },
                        pinned: node.hasClass('pinned') || false,
                        isManualCard: node.data('isManualCard') || false,
                        cardColor: node.data('cardColor') || null,
                        // Preserve all metadata for advanced analysis
                        export_timestamp: node.data('export_timestamp') || null,
                        export_session: node.data('export_session') || null,
                        export_source: node.data('export_source') || null,
                        source_file: node.data('source_file') || null,
                        page_number: node.data('page_number') || null,
                        matched_terms: node.data('matched_terms') || null,
                        card_index: node.data('card_index') || null,
                        // Annotation-specific data (geometric shapes)
                        isAnnotation: node.data('isAnnotation') || false,
                        annotationType: node.data('annotationType') || null,
                        customWidth: node.data('customWidth') || null,
                        customHeight: node.data('customHeight') || null,
                        customZIndex: node.data('customZIndex') || null,
                        customFontSize: node.data('customFontSize') || null,
                        // Save annotation color from visual style
                        annotationColor: node.data('isAnnotation') ? node.style('background-color') : null,
                        // Save shape data for geometric figures
                        shape: node.data('shape') || null,
                        // IMAGE DATA - Essential for exporting images
                        type: node.data('type') || null, // 'image' for image nodes
                        imageData: node.data('imageData') || null, // Base64 image data
                        annotation: node.data('annotation') || null, // Image annotation text
                        searchableText: node.data('searchableText') || null, // Searchable text
                        originalFileName: node.data('originalFileName') || null // Original filename
                    })),
                    edges: cy.edges().map(edge => ({
                        id: edge.id(),
                        source: edge.source().id(),
                        target: edge.target().id(),
                        // Preserve all edge data
                        isAnnotation: edge.data('isAnnotation') || false,
                        annotationType: edge.data('annotationType') || null,
                        customColor: edge.data('customColor') || null,
                        // Save all visual styling
                        style: {
                            'line-color': edge.style('line-color'),
                            'target-arrow-color': edge.style('target-arrow-color'),
                            'target-arrow-shape': edge.style('target-arrow-shape'),
                            'source-arrow-color': edge.style('source-arrow-color'),
                            'source-arrow-shape': edge.style('source-arrow-shape'),
                            'width': edge.style('width'),
                            'curve-style': edge.style('curve-style'),
                            'control-point-step-size': edge.style('control-point-step-size'),
                            'opacity': edge.style('opacity')
                        }
                    })),
                    // Save global arrow visibility state
                    arrowsHidden: window.arrowsHidden || false
                };
                
                // Generate filename with timestamp
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = prompt('Namn på JSON-fil:', `spatial-notes-${timestamp}.json`) || `spatial-notes-${timestamp}.json`;
                
                if (!filename) return; // User cancelled
                
                // Ensure .json extension
                const finalFilename = filename.endsWith('.json') ? filename : filename + '.json';
                
                // Create and download JSON file
                const jsonString = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = finalFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // Show confirmation
                const searchInfo = document.getElementById('searchInfo');
                searchInfo.textContent = `📋 JSON-fil exporterad: ${finalFilename} (${exportData.cards.length} kort, ${exportData.edges.length} pilar)`;
                searchInfo.classList.add('visible');
                setTimeout(() => {
                    searchInfo.classList.remove('visible');
                }, 3000);
                
                console.log(`JSON export completed: ${finalFilename} with ${exportData.cards.length} cards and ${exportData.edges.length} edges`);
                
            } catch (error) {
                console.error('Error exporting JSON:', error);
                alert('Fel vid JSON-export: ' + error.message);
            }
        }
        
        // Import board from JSON file (WORKS LOCALLY!)
        function importFromJSON() {
            // Create hidden file input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json,application/json';
            fileInput.style.display = 'none';
            
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Add a small delay to ensure Cytoscape is fully ready
                    setTimeout(() => {
                        try {
                            const importData = JSON.parse(e.target.result);
                            
                            // Validate JSON structure
                            if (!importData.cards || !Array.isArray(importData.cards)) {
                                throw new Error('Ogiltig JSON-fil: Saknar kort-data');
                            }
                            
                            // Safety check: Ensure Cytoscape is fully initialized
                            if (!cy || !cy.add || typeof cy.add !== 'function') {
                                alert('⚠️ Systemet laddas fortfarande. Vänta 2-3 sekunder och försök igen.');
                                return;
                            }
                        
                        // Always add to existing cards (no replace option)
                        
                        // Add imported cards
                        let importedCount = 0;
                        
                        // Generate import date in YYMMDD format
                        const now = new Date();
                        const importDate = now.getFullYear().toString().substr(-2) + 
                                          String(now.getMonth() + 1).padStart(2, '0') + 
                                          String(now.getDate()).padStart(2, '0');
                        
                        // Create ID mapping for edges
                        const idMapping = new Map();
                        
                        console.log(`🚀 Starting optimized import of ${importData.cards.length} cards...`);
                        
                        // Use batch mode for optimal performance
                        cy.batch(() => {
                            importData.cards.forEach(cardData => {
                            // Save original ID for origin tag
                            const originalId = cardData.id;
                            
                            // Always generate new unique ID for all imported cards
                            const timestamp = Date.now();
                            const random = Math.random().toString(36).substr(2, 9);
                            const newId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}-${random}`;
                            
                            cardData.id = newId;
                            
                            // Store ID mapping for edge updates
                            idMapping.set(originalId, newId);
                            
                            // Create hidden tags for import tracking
                            const hiddenTags = cardData.hidden_tags || [];
                            hiddenTags.push(`origin_${originalId}`);
                            hiddenTags.push(`import_${importDate}`);
                            
                            const newNode = cy.add({
                                data: {
                                    id: cardData.id,
                                    title: cardData.title || '',
                                    text: cardData.text || '',
                                    tags: cardData.tags || [],
                                    hidden_tags: hiddenTags,
                                    searchMatch: false,
                                    isManualCard: cardData.isManualCard || false,
                                    cardColor: cardData.cardColor || null,
                                    // Restore metadata
                                    export_timestamp: cardData.export_timestamp || null,
                                    export_session: cardData.export_session || null,
                                    export_source: cardData.export_source || null,
                                    source_file: cardData.source_file || null,
                                    page_number: cardData.page_number || null,
                                    matched_terms: cardData.matched_terms || null,
                                    card_index: cardData.card_index || null,
                                    // Annotation-specific data
                                    isAnnotation: cardData.isAnnotation || false,
                                    annotationType: cardData.annotationType || null,
                                    customWidth: cardData.customWidth || null,
                                    customHeight: cardData.customHeight || null,
                                    customZIndex: cardData.customZIndex || null,
                                    customFontSize: cardData.customFontSize || null,
                                    // Store annotation color for restoration
                                    annotationColor: cardData.annotationColor || null,
                                    // Store shape data for geometric figures
                                    shape: cardData.shape || null,
                                    // IMAGE DATA - Import compatibility for v2.0
                                    type: cardData.type || null,
                                    imageData: cardData.imageData || null,
                                    annotation: cardData.annotation || null,
                                    searchableText: cardData.searchableText || null,
                                    originalFileName: cardData.originalFileName || null
                                },
                                position: cardData.position || { x: Math.random() * 800 + 100, y: Math.random() * 600 + 100 }
                            });
                            
                            // Restore pinned state
                            if (cardData.pinned) {
                                newNode.addClass('pinned');
                                newNode.data('pinned', true);
                                newNode.ungrabify(); // Prevent dragging pinned cards
                            } else {
                                newNode.grabify(); // Make sure non-pinned cards are draggable
                            }

                            // Restore annotation shape class and text label
                            if (cardData.isAnnotation && cardData.annotationType === 'shape') {
                                newNode.addClass('annotation-shape');
                                
                                // Make sure text shows as label for annotations
                                if (cardData.text) {
                                    newNode.style('label', cardData.text);
                                }
                            }
                            
                            // Restore custom size, layer, color and font size for annotation nodes
                            if (cardData.isAnnotation && (cardData.customWidth || cardData.customHeight || cardData.customZIndex !== null || cardData.annotationColor || cardData.customFontSize)) {
                                const width = cardData.customWidth || 120;
                                const height = cardData.customHeight || 120;
                                const zIndex = cardData.customZIndex !== null ? cardData.customZIndex : -1;
                                
                                // Convert internal z-index to Cytoscape z-index
                                let cyZIndex = 1; // default
                                if (zIndex === -1) cyZIndex = 0; // Background
                                if (zIndex === 0) cyZIndex = 1;  // Normal
                                if (zIndex === 1) cyZIndex = 2;  // Foreground
                                
                                const styleUpdate = {
                                    'width': width + 'px',
                                    'height': height + 'px',
                                    'z-index': cyZIndex
                                };
                                
                                // Restore annotation color if saved
                                if (cardData.annotationColor && cardData.annotationColor !== 'rgb(255,255,255)') {
                                    styleUpdate['background-color'] = cardData.annotationColor;
                                }
                                
                                // Restore custom font size if saved
                                if (cardData.customFontSize) {
                                    styleUpdate['font-size'] = cardData.customFontSize + 'px';
                                }
                                
                                newNode.style(styleUpdate);
                            }
                            
                            // Restore card color
                            if (cardData.cardColor) {
                                newNode.style('background-color', getCardColorValue(cardData.cardColor, getCurrentTheme()));
                            }
                            
                            // IMAGE NODE RESTORATION - Import compatibility
                            if (cardData.type === 'image' && cardData.imageData) {
                                console.log('🖼️ Importing image node:', cardData.originalFileName);
                                
                                // Apply image-specific styling
                                newNode.style({
                                    'background-image': cardData.imageData,
                                    'background-fit': 'cover',
                                    'width': '300px'
                                });
                                
                                // Update title to show annotation indicator if present
                                // Don't show filename in title, keep title empty for clean image display
                                newNode.data('title', '');
                                
                                const filename = cardData.originalFileName || 'Imported Image';
                                const hasAnnotation = (cardData.annotation || '').length > 0;
                                console.log(`✅ Imported image: ${filename} (${hasAnnotation ? 'with annotation' : 'no annotation'})`);
                            }
                            
                            newNode.grabify();
                            importedCount++;
                        });
                        }); // End batch operation for cards
                        
                        console.log(`✅ Batch card import completed: ${importedCount} cards processed`);
                        
                        // Import edges/arrows if they exist  
                        let importedEdges = 0;
                        if (importData.edges && Array.isArray(importData.edges)) {
                            console.log(`🔗 Starting batch import of ${importData.edges.length} edges...`);
                            cy.batch(() => {
                                importData.edges.forEach(edgeData => {
                                // Map old IDs to new IDs
                                const newSourceId = idMapping.get(edgeData.source);
                                const newTargetId = idMapping.get(edgeData.target);
                                
                                // Only create edge if both source and target exist
                                if (newSourceId && newTargetId) {
                                    // Generate new edge ID
                                    const timestamp = Date.now();
                                    const random = Math.random().toString(36).substr(2, 9);
                                    const newEdgeId = `edge-${timestamp}-${random}`;
                                    
                                    const newEdge = cy.add({
                                        data: {
                                            id: newEdgeId,
                                            source: newSourceId,
                                            target: newTargetId,
                                            isAnnotation: edgeData.isAnnotation || false,
                                            annotationType: edgeData.annotationType || null,
                                            customColor: edgeData.customColor || null
                                        }
                                    });
                                
                                    // Apply annotation classes for styling
                                    if (edgeData.isAnnotation) {
                                        newEdge.addClass('annotation-connection');
                                    }
                                    
                                    // Restore all visual styling
                                    if (edgeData.style) {
                                        newEdge.style(edgeData.style);
                                    }
                                    
                                    importedEdges++;
                                } else {
                                    console.warn('Skipping edge - source or target not found:', edgeData.source, '->', edgeData.target);
                                }
                            });
                            }); // End batch operation for edges
                            console.log(`✅ Batch edge import completed: ${importedEdges} edges processed`);
                        }
                        
                        // Restore global arrow visibility state
                        if (importData.arrowsHidden !== undefined) {
                            window.arrowsHidden = importData.arrowsHidden;
                            if (window.arrowsHidden) {
                                // Apply hidden state to all edges
                                cy.edges().style('opacity', 0);
                            }
                        }
                        
                        // Card IDs are now timestamp-based, no counter needed
                        
                        // Restore viewport if available
                        if (importData.viewport) {
                            setTimeout(() => {
                                cy.zoom(importData.viewport.zoom);
                                cy.pan(importData.viewport.pan);
                            }, 100);
                        }
                        
                        // Show success message
                        let message = `📁 JSON-import lyckades: ${importedCount} kort`;
                        if (importedEdges > 0) {
                            message += `, ${importedEdges} pilar`;
                        }
                        message += ` importerade (alla fick nya ID:n + gömda taggar)`;
                        if (importData.metadata) {
                            message += `\nExportdatum: ${new Date(importData.metadata.exportDate).toLocaleString('sv-SE')}`;
                        }
                        
                        const searchInfo = document.getElementById('searchInfo');
                        searchInfo.textContent = message;
                        searchInfo.classList.add('visible');
                        setTimeout(() => {
                            searchInfo.classList.remove('visible');
                        }, 4000);
                        
                        console.log(`JSON import completed: ${importedCount} cards and ${importedEdges} edges imported`, importData.metadata);
                        
                        } catch (error) {
                            console.error('Error importing JSON:', error);
                            alert('Fel vid JSON-import: ' + error.message + '\n\nKontrollera att filen är en giltig Spatial Notes JSON-export.');
                        }
                    }, 100); // End of setTimeout
                };
                
                reader.readAsText(file);
            });
            
            // Trigger file picker
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        }
        
        // Import cards from PDF-Extractor localStorage
        function importFromExtractor() {
            try {
                // Debug: Show all localStorage keys
                console.log('All localStorage keys:', Object.keys(localStorage));
                
                // Try different possible keys that PDF-extractor might use
                // PDF-Extractor uses the same localStorage key as spatial notes
                const extractorData = localStorage.getItem('spatial-notes-board');
                console.log('Checking for PDF-Extractor data in spatial-notes-board key');
                
                if (!extractorData) {
                    // Show debug info
                    const allKeys = Object.keys(localStorage);
                    alert(`Ingen data från PDF-Extractor hittades!\n\nDebug info:\nLocalStorage nycklar: ${allKeys.join(', ')}\n\nKör PDF-extractor först och exportera kort till Spatial Notes.`);
                    return;
                }
                
                const importedCards = JSON.parse(extractorData);
                
                if (!Array.isArray(importedCards) || importedCards.length === 0) {
                    alert('PDF-Extractor data är tom eller ogiltig.');
                    return;
                }
                
                // Check if we have existing cards in spatial notes
                const hasExistingCards = cy.nodes().length > 0;
                const existingIds = new Set(cy.nodes().map(n => n.id()));
                
                // Filter out cards that already exist in spatial notes
                const newCards = importedCards.filter(card => !existingIds.has(card.id));
                
                if (newCards.length === 0) {
                    alert('Inga nya kort att importera från PDF-Extractor. Alla kort finns redan.');
                    return;
                }
                
                let replaceExisting = false;
                
                if (hasExistingCards) {
                    replaceExisting = confirm(
                        `PDF-Extractor har ${newCards.length} NYA kort att importera.\n` +
                        `Du har ${cy.nodes().length} befintliga kort.\n\n` +
                        `Klicka OK för att ERSÄTTA alla kort\n` +
                        `Klicka Avbryt för att LÄGGA TILL endast de nya korten`
                    );
                }
                
                // Use only new cards if not replacing
                if (!replaceExisting) {
                    importedCards = newCards;
                }
                
                // Clear existing cards if replacing
                if (replaceExisting) {
                    cy.nodes().remove();
                }
                
                // Add imported cards with smart positioning
                let importedCount = 0;
                let duplicateCount = 0;
                
                importedCards.forEach((cardData, index) => {
                    // Check for duplicate IDs if not replacing
                    if (!replaceExisting && cy.getElementById(cardData.id).length > 0) {
                        // Generate new unique ID for duplicate
                        cardData.id = cardData.id + '_imported_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                        duplicateCount++;
                    }
                    
                    // Smart positioning: arrange in grid if no position provided
                    let position = cardData.position;
                    if (!position || (position.x === 0 && position.y === 0)) {
                        const cols = Math.ceil(Math.sqrt(importedCards.length));
                        const col = index % cols;
                        const row = Math.floor(index / cols);
                        position = {
                            x: 200 + col * 320,
                            y: 200 + row * 200
                        };
                    }
                    
                    const newNode = cy.add({
                        data: {
                            id: cardData.id,
                            title: cardData.title || '',
                            text: cardData.text || '',
                            tags: cardData.tags || [],
                            hidden_tags: cardData.hidden_tags || [],
                            searchMatch: false,
                            // Preserve PDF-extractor metadata
                            export_timestamp: cardData.export_timestamp || null,
                            export_session: cardData.export_session || null,
                            export_source: cardData.export_source || 'pdf_extractor',
                            source_file: cardData.source_file || null,
                            page_number: cardData.page_number || null,
                            matched_terms: cardData.matched_terms || null,
                            card_index: cardData.card_index || null
                        },
                        position: position
                    });
                    
                    newNode.grabify();
                    importedCount++;
                });
                
                // Card IDs are now timestamp-based, no counter needed
                
                // Clear the PDF-extractor data so it doesn't import again
                // localStorage.removeItem('pdf-extractor-export'); // Don't clear, let user decide
                
                // Show success message
                let message = `📥 PDF-Extractor import lyckades: ${importedCount} kort importerade`;
                if (duplicateCount > 0) {
                    message += ` (${duplicateCount} dubbletter fick nya ID:n)`;
                }
                
                const searchInfo = document.getElementById('searchInfo');
                searchInfo.textContent = message;
                searchInfo.classList.add('visible');
                setTimeout(() => {
                    searchInfo.classList.remove('visible');
                }, 4000);
                
                console.log(`PDF-Extractor import completed: ${importedCount} cards imported`);
                
            } catch (error) {
                console.error('Error importing from PDF-Extractor:', error);
                alert('Fel vid import från PDF-Extractor: ' + error.message);
            }
        }

        // Map Zotero highlight colors to spatial-notes card colors
        function mapZoteroColorToCard(bgColorStyle) {
            // Extract hex color from style like "background-color: #ffd40080"
            const match = bgColorStyle.match(/#([0-9a-fA-F]{6})/);
            if (!match) return null;

            const hexColor = match[1].toLowerCase();

            // Map Zotero colors to spatial-notes card-color-X
            const colorMap = {
                'ffd400': 'card-color-4', // Gul
                'ff6666': 'card-color-3', // Röd
                '5fb236': 'card-color-1', // Grön
                '2ea8e5': 'card-color-6', // Blå/Cyan
                'a28ae5': 'card-color-5', // Lila
                'e56eee': 'card-color-5', // Magenta → Lila
                'f19837': 'card-color-2', // Orange
                'aaaaaa': 'card-color-7'  // Grå
            };

            return colorMap[hexColor] || null;
        }

        // Import notes from Zotero HTML export
        function importFromZoteroHTML(file) {
            const reader = new FileReader();

            reader.onload = function(e) {
                try {
                    const htmlContent = e.target.result;
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlContent, 'text/html');

                    // Find all highlight paragraphs
                    const highlightParagraphs = doc.querySelectorAll('p');

                    let importedCount = 0;
                    const timestamp = Date.now();
                    const session = `zotero_${timestamp}`;

                    highlightParagraphs.forEach((p, index) => {
                        // Find the highlight span with background color
                        const highlightSpan = p.querySelector('span.highlight span[style*="background-color"]');
                        if (!highlightSpan) return;

                        // Extract the quote text
                        const quoteText = highlightSpan.textContent.trim();
                        if (!quoteText) return;

                        // Extract color
                        const bgStyle = highlightSpan.getAttribute('style');
                        const cardColor = mapZoteroColorToCard(bgStyle);

                        // Extract citation if available
                        const citationSpan = p.querySelector('span.citation');
                        let citation = '';
                        if (citationSpan) {
                            citation = citationSpan.textContent.trim();
                        }

                        // Extract link/URL if available
                        const linkElement = p.querySelector('a');
                        let zoteroLink = '';
                        if (linkElement && linkElement.href) {
                            zoteroLink = linkElement.href;
                        }

                        // Create hidden tags for tracking
                        const hidden_tags = [
                            `zotero_import_${timestamp}`,
                            `source_${file.name.replace('.html', '')}`
                        ];

                        if (citation) {
                            hidden_tags.push(`citation_${citation.replace(/[^a-zA-Z0-9]/g, '_')}`);
                        }

                        // Add link as metadata (if exists)
                        if (zoteroLink) {
                            hidden_tags.push(`url_${zoteroLink}`);
                        }

                        // Grid positioning
                        const cols = Math.ceil(Math.sqrt(highlightParagraphs.length));
                        const col = index % cols;
                        const row = Math.floor(index / cols);
                        const position = {
                            x: 200 + col * 320,
                            y: 200 + row * 200
                        };

                        // Create card with full metadata
                        // Generate unique ID with index to avoid duplicates in batch import
                        const baseId = generateCardId();
                        const cardId = `${baseId}-z${index}`;

                        // Combine quote with citation for display
                        let cardText = quoteText;
                        if (citation) {
                            cardText = `${quoteText}\n\n${citation}`;
                        }

                        const nodeData = {
                            id: cardId,
                            title: '',
                            text: cardText,
                            tags: [],
                            hidden_tags: hidden_tags,
                            searchMatch: false,
                            // Import metadata (osynlig)
                            export_timestamp: new Date().toISOString(),
                            export_session: session,
                            export_source: 'zotero',
                            source_file: file.name,
                            page_number: null,
                            matched_terms: citation || null,
                            zotero_url: zoteroLink || null,  // Store Zotero link as metadata
                            card_index: index,
                            // Kort-status
                            isManualCard: false,
                            cardColor: cardColor,
                            // Kopia-tracking (ej tillämpligt vid import)
                            copyOf: null,
                            isCopy: false,
                            copyTimestamp: null
                        };

                        const newNode = cy.add({
                            group: 'nodes',
                            data: nodeData,
                            position: position
                        });

                        // Apply color styling if we have a color
                        if (cardColor) {
                            newNode.style('background-color', getCardColorValue(cardColor, getCurrentTheme()));
                        }

                        newNode.grabify();
                        importedCount++;
                    });

                    // Show success message
                    const searchInfo = document.getElementById('searchInfo');
                    if (searchInfo) {
                        searchInfo.textContent = `📚 Zotero import: ${importedCount} kort importerade från ${file.name}`;
                        searchInfo.classList.add('visible');
                        setTimeout(() => {
                            searchInfo.classList.remove('visible');
                        }, 4000);
                    }

                    console.log(`Zotero import completed: ${importedCount} cards imported from ${file.name}`);

                } catch (error) {
                    console.error('Error importing from Zotero:', error);
                    alert('Fel vid import från Zotero HTML: ' + error.message);
                }
            };

            reader.readAsText(file);
        }

        // Clear board completely
        function clusterSelectedCards() {
            // If we have copied cards, create and arrange them. Otherwise, arrange selected nodes.
            if (copiedCards.length > 0) {
                arrangeCopiedCardsInCluster();
                return;
            }
            
            const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
            if (selectedNodes.length < 2) return;
            
            // Save state for undo
            saveState();
            
            // Get center position (mouse or screen center)
            const arrangePos = getArrangementPosition();
            const centerX = arrangePos.x;
            const centerY = arrangePos.y;
            
            // Small cluster radius
            const radius = 50;
            
            // Arrange in tight circle
            selectedNodes.forEach((node, index) => {
                const angle = (index / selectedNodes.length) * 2 * Math.PI;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                node.animate({
                    position: { x: x, y: y }
                }, {
                    duration: 300,
                    easing: 'ease-out'
                });
            });
            
            console.log(`Q: Klustrade ${selectedNodes.length} kort`);
        }

        function executeCommand(command) {
            const selectedNodes = cy.$('node:selected');
            
            switch(command) {
                case 'H':
                    arrangeSelectedInRow();
                    break;
                case 'G+V':
                    arrangeSelectedGridVerticalColumns();
                    break;
                case 'G+H':
                    arrangeSelectedGridHorizontalPacked();
                    break;
                case 'G+T':
                    arrangeSelectedGridTopAligned();
                    break;
                case 'Q':
                    clusterSelectedCards();
                    break;
                case 'C':
                    copySelectedCards();
                    break;
                case 'T':
                    const selectedNodes = cy.$('node:selected');
                    if (selectedNodes.length > 0) {
                        const fakeEvent = {
                            clientX: window.innerWidth / 2,
                            clientY: window.innerHeight / 2
                        };
                        showColorPicker(fakeEvent, selectedNodes);
                    }
                    break;
                case 'V':
                    arrangeSelectedInColumn();
                    break;
                case 'Stack':
                case 'QQ':
                case 'Alt+S':
                    stackSelectedCards();
                    break;
                case 'Pin':
                    selectedNodes.forEach(node => {
                        pinCard(node);
                    });
                    break;
                case 'Unpin':
                    selectedNodes.forEach(node => {
                        unpinCard(node);
                    });
                    break;
                case 'Delete':
                    deleteSelectedCards();
                    break;
                case 'Ctrl+Z':
                    // Trigger undo
                    if (undoStack.length > 0) {
                        const currentState = {
                            cards: cy.nodes().map(node => ({
                                id: node.id(),
                                position: { x: node.position().x, y: node.position().y },
                                selected: node.selected()
                            }))
                        };
                        redoStack.push(currentState);
                        
                        const previousState = undoStack.pop();
                        restoreState(previousState);
                    }
                    break;
                case 'Ctrl+Y':
                    // Trigger redo
                    if (redoStack.length > 0) {
                        const currentState = {
                            cards: cy.nodes().map(node => ({
                                id: node.id(),
                                position: { x: node.position().x, y: node.position().y },
                                selected: node.selected()
                            }))
                        };
                        undoStack.push(currentState);
                        
                        const nextState = redoStack.pop();
                        restoreState(nextState);
                    }
                    break;
                case 'Ctrl+A':
                    cy.nodes().not('.pinned').select();
                    break;
                case 'Ctrl+S':
                    saveBoard();
                    break;
            }
        }

        function debugDumpPositions() {
            console.log('\n=== KORT POSITIONER DEBUG ===');
            cy.nodes().forEach(node => {
                const pos = node.position();
                const title = node.data('title') || 'Untitled';
                console.log(`${node.id()}: x: ${Math.round(pos.x)}, y: ${Math.round(pos.y)} - "${title}"`);
            });
            console.log('=== SLUT DEBUG ===\n');
            
            const searchInfo = document.getElementById('searchInfo');
            if (searchInfo) {
                searchInfo.textContent = 'Kort-positioner dumpade till console (F12)';
                searchInfo.classList.add('visible');
                setTimeout(() => {
                    searchInfo.classList.remove('visible');
                }, 3000);
            }
        }

        function toggleDarkTheme() {
            const body = document.body;
            const themeBtn = document.getElementById('themeBtn');

            let currentTheme = 'light';
            if (body.classList.contains('dark-theme')) {
                currentTheme = 'dark';
            } else if (body.classList.contains('sepia-theme')) {
                currentTheme = 'sepia';
            } else if (body.classList.contains('eink-theme')) {
                currentTheme = 'eink';
            }

            // Cycle through themes: light -> dark -> sepia -> eink -> light
            if (currentTheme === 'light') {
                body.classList.remove('eink-theme', 'sepia-theme');
                body.classList.add('dark-theme');
                themeBtn.innerHTML = '📜 Sepia';
                localStorage.setItem('theme', 'dark');
                applyCardTheme('dark');
            } else if (currentTheme === 'dark') {
                body.classList.remove('dark-theme', 'eink-theme');
                body.classList.add('sepia-theme');
                themeBtn.innerHTML = '📄 E-ink';
                localStorage.setItem('theme', 'sepia');
                applyCardTheme('sepia');
            } else if (currentTheme === 'sepia') {
                body.classList.remove('dark-theme', 'sepia-theme');
                body.classList.add('eink-theme');
                themeBtn.innerHTML = '☀️ Ljust';
                localStorage.setItem('theme', 'eink');
                applyCardTheme('eink');
            } else {
                body.classList.remove('dark-theme', 'sepia-theme', 'eink-theme');
                themeBtn.innerHTML = '🌙 Mörkt';
                localStorage.setItem('theme', 'light');
                applyCardTheme('light');
            }
        }
        
        // Get card color value based on theme
        function getCardColorValue(colorId, theme) {
            const colors = {
                light: {
                    1: '#d4f2d4', // Grön
                    2: '#ffe4b3', // Orange
                    3: '#ffc1cc', // Röd
                    4: '#fff7b3', // Gul
                    5: '#f3e5f5', // Lila
                    6: '#c7e7ff', // Blå
                    7: '#e0e0e0', // Grå
                    8: '#ffffff'  // Vit
                },
                dark: {
                    1: '#3d5a3d', // Mörk Grön
                    2: '#5a4d3a', // Mörk Orange
                    3: '#5a3c3a', // Mörk Röd
                    4: '#5a5a3a', // Mörk Gul
                    5: '#4a3d5a', // Mörk Lila
                    6: '#2e4a6f', // Mörk Blå
                    7: '#555555', // Mörk Grå
                    8: '#8a8a8a'  // Ljusgrå (vit blir för ljus i dark theme)
                },
                sepia: {
                    1: '#ded6c7', // Sepia Grön
                    2: '#e6d6c2', // Sepia Orange
                    3: '#ead6c7', // Sepia Röd
                    4: '#ebe2d6', // Sepia Gul
                    5: '#e2d6c7', // Sepia Lila
                    6: '#d6c7b3', // Sepia Blå
                    7: '#c0b8a8', // Sepia Grå
                    8: '#f5f2e8'  // Sepia Vit
                }
            };
            
            // Extract number from colorId (card-color-1 -> 1)
            const colorNumber = colorId.toString().replace('card-color-', '');
            
            return colors[theme] && colors[theme][colorNumber] ? colors[theme][colorNumber] : null;
        }

        function applyCardTheme(theme) {
            if (cy) {
                if (theme === 'dark') {
                    // Dark theme styling
                    cy.style()
                        .selector('node').style({
                            'background-color': function(node) {
                                const cardColor = node.data('cardColor');
                                if (cardColor) {
                                    // Color priority: if card has color, use it regardless of theme
                                    return getCardColorValue(cardColor, 'dark');
                                }
                                return '#2a2a2a';
                            },
                            'color': '#f0f0f0',
                            'border-color': '#555'
                        })
                        .selector('node:selected').style({
                            'border-color': '#66b3ff',  // Bright blue for visibility
                            'border-width': 5,
                            'box-shadow': '0 0 25px rgba(102, 179, 255, 0.8)'
                        })
                        .selector('node.search-match').style({
                            'background-color': '#4a3c00',  // Dark yellow background
                            'border-color': '#ffcc00',     // Bright yellow border
                            'border-width': 3,
                            'box-shadow': '0 0 15px rgba(255, 204, 0, 0.6)'
                        })
                        .selector('node.pinned').style({
                            'border-color': '#4caf50',  // Bright green
                            'border-width': 4,
                            'box-shadow': '0 0 15px rgba(76, 175, 80, 0.6)'
                        })
                        .selector('node.temporal-marked').style({
                            'border-width': function(node) {
                                return node.data('temporalBorderWidth') || 6;
                            },
                            'border-color': function(node) {
                                return node.data('temporalBorderColor') || '#ff4500';
                            }
                        })
                        .update();
                } else if (theme === 'sepia') {
                    // Sepia theme styling
                    cy.style()
                        .selector('node').style({
                            'background-color': function(node) {
                                const cardColor = node.data('cardColor');
                                if (cardColor) {
                                    return getCardColorValue(cardColor, 'sepia');
                                }
                                return '#f0e6d2';
                            },
                            'color': '#5d4e37',
                            'border-color': '#c8a882'
                        })
                        .selector('node:selected').style({
                            'border-color': '#8b7556',  // Dark brown for sepia
                            'border-width': 4,
                            'box-shadow': '0 0 20px rgba(139, 117, 86, 0.7)'
                        })
                        .selector('node.search-match').style({
                            'background-color': '#f4e8d0',  // Light sepia highlight
                            'border-color': '#d2691e',     // Chocolate border
                            'border-width': 2,
                            'box-shadow': '0 0 10px rgba(210, 105, 30, 0.5)'
                        })
                        .selector('node.pinned').style({
                            'border-color': '#8fbc8f',  // Dark sea green for sepia
                            'border-width': 4,
                            'box-shadow': '0 0 15px rgba(143, 188, 143, 0.6)'
                        })
                        .selector('node.temporal-marked').style({
                            'border-width': function(node) {
                                return node.data('temporalBorderWidth') || 6;
                            },
                            'border-color': function(node) {
                                return node.data('temporalBorderColor') || '#ff4500';
                            }
                        })
                        .update();
                } else if (theme === 'eink') {
                    // E-ink theme styling - no shadows, sharp contrast
                    cy.style()
                        .selector('node').style({
                            'background-color': function(node) {
                                const cardColor = node.data('cardColor');
                                if (cardColor) {
                                    // Keep card colors - user said it's OK
                                    return getCardColorValue(cardColor, 'light');
                                }
                                return '#ffffff';
                            },
                            'color': '#000000',
                            'border-color': '#000000',
                            'border-width': 2
                        })
                        .selector('node:selected').style({
                            'border-color': '#000000',
                            'border-width': 4,
                            'box-shadow': 'none'  // No shadows for e-ink
                        })
                        .selector('node.search-match').style({
                            'background-color': '#f0f0f0',
                            'border-color': '#000000',
                            'border-width': 3,
                            'box-shadow': 'none'  // No shadows for e-ink
                        })
                        .selector('node.pinned').style({
                            'border-color': '#000000',
                            'border-width': 4,
                            'box-shadow': 'none'  // No shadows for e-ink
                        })
                        .selector('node.temporal-marked').style({
                            'border-width': function(node) {
                                return node.data('temporalBorderWidth') || 4;
                            },
                            'border-color': '#000000'  // All black for e-ink
                        })
                        .update();
                } else {
                    // Light theme styling (default)
                    cy.style()
                        .selector('node').style({
                            'background-color': function(node) {
                                const cardColor = node.data('cardColor');
                                if (cardColor) {
                                    return getCardColorValue(cardColor, 'light');
                                }
                                return '#ffffff';
                            },
                            'color': '#333333',
                            'border-color': '#ddd'
                        })
                        .selector('node:selected').style({
                            'border-color': '#1565c0',
                            'border-width': 4,
                            'box-shadow': '0 0 20px rgba(21, 101, 192, 0.7)'
                        })
                        .selector('node.search-match').style({
                            'background-color': '#fff9c4',
                            'border-color': '#f57f17',
                            'border-width': 2,
                            'box-shadow': '0 0 10px rgba(245, 127, 23, 0.4)'
                        })
                        .selector('node.pinned').style({
                            'border-color': '#2e7d32',
                            'border-width': 4,
                            'box-shadow': '0 0 15px rgba(46, 125, 50, 0.6)'
                        })
                        .selector('node.temporal-marked').style({
                            'border-width': function(node) {
                                return node.data('temporalBorderWidth') || 6;
                            },
                            'border-color': function(node) {
                                return node.data('temporalBorderColor') || '#ff4500';
                            }
                        })
                        .update();
                }
            }
        }
        
        // Load saved theme on page load
        function loadSavedTheme() {
            const savedTheme = localStorage.getItem('theme') || localStorage.getItem('darkTheme'); // Backward compatibility
            const themeBtn = document.getElementById('themeBtn');

            // Handle backward compatibility
            let theme = 'light';
            if (savedTheme === 'dark' || savedTheme === 'true') {
                theme = 'dark';
            } else if (savedTheme === 'sepia') {
                theme = 'sepia';
            } else if (savedTheme === 'eink') {
                theme = 'eink';
            }

            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
                if (themeBtn) {
                    themeBtn.innerHTML = '📜 Sepia';
                }
                setTimeout(() => applyCardTheme('dark'), 100);
            } else if (theme === 'sepia') {
                document.body.classList.add('sepia-theme');
                if (themeBtn) {
                    themeBtn.innerHTML = '📄 E-ink';
                }
                setTimeout(() => applyCardTheme('sepia'), 100);
            } else if (theme === 'eink') {
                document.body.classList.add('eink-theme');
                if (themeBtn) {
                    themeBtn.innerHTML = '☀️ Ljust';
                }
                setTimeout(() => applyCardTheme('eink'), 100);
            } else {
                if (themeBtn) {
                    themeBtn.innerHTML = '🌙 Mörkt';
                }
                setTimeout(() => applyCardTheme('light'), 100);
            }
        }

        function clearBoard() {
            if (confirm('Är du säker på att du vill rensa hela brädan och localStorage?\n\nDetta kommer att:\n• Ta bort alla kort från brädan\n• Rensa sparad data i localStorage\n• Återställa till tom bräda\n\nDenna åtgärd kan inte ångras!')) {
                // Clear memoization cache
                heightCache.clear();
                // Clear all nodes from the board
                cy.nodes().remove();
                
                // Clear localStorage
                localStorage.removeItem('spatial-notes-board');
                
                // Card IDs are now timestamp-based, no counter to reset
                
                // Show confirmation
                const searchInfo = document.getElementById('searchInfo');
                searchInfo.textContent = 'Bräda och localStorage rensade! ✅';
                searchInfo.classList.add('visible');
                setTimeout(() => {
                    searchInfo.classList.remove('visible');
                }, 3000);
                
                console.log('Board and localStorage cleared completely');
            }
        }
        
        // Toggle metadata view for development and analysis
        let showMetadata = false;
        function toggleMetadataView() {
            showMetadata = !showMetadata;
            const btn = document.getElementById('metadataBtn');
            
            if (showMetadata) {
                btn.textContent = '🔍 Dölj Metadata';
                btn.style.backgroundColor = '#ff9800';
                
                // Show metadata in console and as overlays
                console.log('=== SPATIAL NOTES METADATA ===');
                cy.nodes().forEach(node => {
                    const metadata = {
                        id: node.id(),
                        export_timestamp: node.data('export_timestamp'),
                        export_session: node.data('export_session'),
                        export_source: node.data('export_source'),
                        source_file: node.data('source_file'),
                        page_number: node.data('page_number'),
                        matched_terms: node.data('matched_terms'),
                        zotero_url: node.data('zotero_url'),
                        card_index: node.data('card_index')
                    };
                    console.log(`${node.id()}:`, metadata);
                });
                
                // Add metadata styling
                cy.style().selector('node').style({
                    'border-color': function(node) {
                        const session = node.data('export_session');
                        if (!session) return '#ddd';
                        // Color-code by export session
                        const hash = session.split('').reduce((a, b) => {
                            a = ((a << 5) - a) + b.charCodeAt(0);
                            return a & a;
                        }, 0);
                        const color = `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
                        return color;
                    },
                    'border-width': 3
                }).update();
                
                // Show stats
                const stats = analyzeMetadata();
                alert(`Metadata aktiverad!\n\n${stats}\n\nKolla konsolen för detaljer.`);
                
            } else {
                btn.textContent = '🔍 Metadata';
                btn.style.backgroundColor = '#007acc';
                
                // Reset styling
                cy.style().selector('node').style({
                    'border-color': '#ddd',
                    'border-width': 2
                }).update();
                
                console.log('Metadata view disabled');
            }
        }
        
        function analyzeMetadata() {
            const nodes = cy.nodes();
            const sessions = new Set();
            const sources = new Set();
            let pdfCards = 0;
            let zoteroCards = 0;
            let zoteroCardsWithLinks = 0;
            let manualCards = 0;

            nodes.forEach(node => {
                const session = node.data('export_session');
                const source = node.data('export_source');
                const zoteroUrl = node.data('zotero_url');

                if (session) sessions.add(session);
                if (source) sources.add(source);

                if (source === 'pdf_extractor') {
                    pdfCards++;
                } else if (source === 'zotero') {
                    zoteroCards++;
                    if (zoteroUrl) zoteroCardsWithLinks++;
                } else {
                    manualCards++;
                }
            });

            let stats = `Totalt: ${nodes.length} kort\n` +
                       `PDF-kort: ${pdfCards}\n` +
                       `Zotero-kort: ${zoteroCards}`;

            if (zoteroCards > 0) {
                stats += ` (${zoteroCardsWithLinks} med länk)`;
            }

            stats += `\nManuella kort: ${manualCards}\n` +
                    `Export-sessioner: ${sessions.size}\n` +
                    `Källor: ${sources.size}`;

            return stats;
        }
        
        // ====================================================================================================
        // 📱 SIMPLIFIED TOOLBAR FUNCTIONS
        // ====================================================================================================
        
        let isSimplifiedToolbar = localStorage.getItem('spatial-notes-simplified-toolbar') === 'true';
        
        function toggleSimplifiedToolbar() {
            isSimplifiedToolbar = !isSimplifiedToolbar;
            localStorage.setItem('spatial-notes-simplified-toolbar', isSimplifiedToolbar);
            updateToolbarDisplay();

            // Update toggle button appearance
            const toggleBtn = document.getElementById('toolbarToggleBtn');
            if (toggleBtn) {
                if (isSimplifiedToolbar) {
                    toggleBtn.innerHTML = '⚙️ Full Toolbar';
                    toggleBtn.title = 'Visa full toolbar (Shift+T)';
                } else {
                    toggleBtn.innerHTML = '☰ Toolbar';
                    toggleBtn.title = 'Växla mellan förenklad och full toolbar (Shift+T)';
                }
            }

            const statusMessage = isSimplifiedToolbar ?
                'Förenklad toolbar aktiverad' :
                'Full toolbar aktiverad';

            // Show status message using existing searchInfo element
            const searchInfo = document.getElementById('searchInfo');
            if (searchInfo) {
                searchInfo.textContent = statusMessage;
                searchInfo.classList.add('visible');
                setTimeout(() => {
                    searchInfo.classList.remove('visible');
                }, 3000);
            }
        }
        
        function updateToolbarDisplay() {
            const toolbar = document.querySelector('.toolbar');
            const allElements = toolbar.children;

            // Update toggle button appearance
            const toggleBtn = document.getElementById('toolbarToggleBtn');
            if (toggleBtn) {
                if (isSimplifiedToolbar) {
                    toggleBtn.innerHTML = '⚙️ Full Toolbar';
                    toggleBtn.title = 'Visa full toolbar (Shift+T)';
                } else {
                    toggleBtn.innerHTML = '☰ Toolbar';
                    toggleBtn.title = 'Växla mellan förenklad och full toolbar (Shift+T)';
                }
            }

            if (isSimplifiedToolbar) {
                // Hide all elements
                Array.from(allElements).forEach(el => {
                    if (!el.classList.contains('simplified-keep')) {
                        el.style.display = 'none';
                    }
                });

                // Show simplified elements
                showSimplifiedToolbar();
            } else {
                // Show all elements
                Array.from(allElements).forEach(el => {
                    el.style.display = '';
                });

                // Hide simplified elements
                hideSimplifiedToolbar();
            }
        }
        
        function showSimplifiedToolbar() {
            let simplifiedToolbar = document.getElementById('simplifiedToolbar');
            if (!simplifiedToolbar) {
                createSimplifiedToolbar();
            } else {
                simplifiedToolbar.style.display = 'flex';
            }
        }
        
        function hideSimplifiedToolbar() {
            const simplifiedToolbar = document.getElementById('simplifiedToolbar');
            if (simplifiedToolbar) {
                simplifiedToolbar.style.display = 'none';
            }
        }
        
        function createSimplifiedToolbar() {
            const toolbar = document.querySelector('.toolbar');
            
            const simplifiedDiv = document.createElement('div');
            simplifiedDiv.id = 'simplifiedToolbar';
            simplifiedDiv.className = 'simplified-keep';
            simplifiedDiv.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            `;
            
            // Multi-import button
            const importBtn = document.createElement('button');
            importBtn.innerHTML = '📋';
            importBtn.className = 'toolbar-btn';
            importBtn.title = 'Multi-import (M)';
            importBtn.style.cssText = 'padding: 8px 12px;';
            importBtn.onclick = showMultiCardPasteDialog;

            // Drive images picker button
            const driveImagesBtn = document.createElement('button');
            driveImagesBtn.innerHTML = '📁';
            driveImagesBtn.className = 'toolbar-btn';
            driveImagesBtn.title = 'Välj flera bilder från Drive';
            driveImagesBtn.style.cssText = 'padding: 8px 12px;';
            driveImagesBtn.onclick = openDriveImagePicker;

            // Smart search button
            const searchBtn = document.createElement('button');
            searchBtn.innerHTML = '🔍';
            searchBtn.className = 'toolbar-btn';
            searchBtn.title = 'Smart sökning med automatisk sortering';
            searchBtn.style.cssText = 'padding: 8px 12px;';
            searchBtn.onclick = showSmartSearchDialog;
            
            // Sort button
            const sortBtn = document.createElement('button');
            sortBtn.innerHTML = '📊';
            sortBtn.className = 'toolbar-btn';
            sortBtn.title = 'Sortera kort';
            sortBtn.style.cssText = 'padding: 8px 12px;';
            sortBtn.onclick = (event) => showSortMenu(event);

            // Toggle to full toolbar button
            const expandBtn = document.createElement('button');
            expandBtn.innerHTML = '⚙️ Meny';
            expandBtn.className = 'toolbar-btn';
            expandBtn.title = 'Visa hela menyn (Shift+T)';
            expandBtn.style.cssText = 'padding: 8px 12px; margin-left: auto;';  // Push to right
            expandBtn.onclick = toggleSimplifiedToolbar;

            simplifiedDiv.appendChild(importBtn);
            simplifiedDiv.appendChild(driveImagesBtn);
            simplifiedDiv.appendChild(searchBtn);
            simplifiedDiv.appendChild(sortBtn);
            simplifiedDiv.appendChild(expandBtn);

            toolbar.appendChild(simplifiedDiv);
        }
        
