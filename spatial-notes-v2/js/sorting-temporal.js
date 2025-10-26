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
