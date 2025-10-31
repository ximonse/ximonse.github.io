// ====================================================================================================
// 🕒 TEMPORAL SORTING & DATE EXTRACTION
// ====================================================================================================

// Apply visual markings for dates found in card text
function applyTemporalMarkings() {
    cy.nodes().forEach(node => {
        const text = node.data('text') || '';
        const title = node.data('title') || '';
        const fullText = `${title}
${text}`;

        // Regex to find dates like @YYYY-MM-DD, @YYYY-MM, @YYYY
        const dateRegex = /@(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/g;
        let match;
        let dates = [];

        while ((match = dateRegex.exec(fullText)) !== null) {
            dates.push(match[0]);
        }

        if (dates.length > 0) {
            node.data('temporal_dates', dates);
            // Add a class for potential styling
            node.addClass('has-temporal-date');
        } else {
            node.removeData('temporal_dates');
            node.removeClass('has-temporal-date');
        }
    });
    console.log('🕒 Temporal markings applied to all cards.');
}

// ====================================================================================================
// 🃏 CARD ARRANGEMENT & SORTING LOGIC
// ====================================================================================================

let currentSortMode = 'manual'; // Default sort mode

// Get the appropriate sort function based on the current mode
function getSortFunction(mode) {
    const [sortKey, direction] = mode.split('-');
    const dir = (direction === 'desc') ? -1 : 1;

    switch (sortKey) {
        case 'textLength':
            return (a, b) => ( (a.data('text') || '').length - (b.data('text') || '').length ) * dir;
        case 'alphabetic':
            return (a, b) => (a.data('title') || a.data('text') || '').localeCompare(b.data('title') || b.data('text') || '') * dir;
        case 'color':
            return (a, b) => ( (a.data('cardColor') || '').localeCompare(b.data('cardColor') || '') ) * dir;
        case 'date':
            return (a, b) => ( (a.id() || '').localeCompare(b.id() || '') ) * dir;
        case 'temporal':
            // Sort by the first found @YYYY-MM-DD tag
            return (a, b) => {
                const dateA = a.data('temporal_dates') ? a.data('temporal_dates')[0] : '@9999';
                const dateB = b.data('temporal_dates') ? b.data('temporal_dates')[0] : '@9999';
                return dateA.localeCompare(dateB) * dir;
            };
        case 'today-first':
             return (a, b) => {
                const now = new Date();
                const todayStr = now.toISOString().slice(0, 10);
                const dateA = a.data('temporal_dates') ? a.data('temporal_dates')[0] : '';
                const dateB = b.data('temporal_dates') ? b.data('temporal_dates')[0] : '';
                const isAToday = dateA.includes(todayStr);
                const isBToday = dateB.includes(todayStr);
                if (isAToday && !isBToday) return -1;
                if (!isAToday && isBToday) return 1;
                return (a.id() || '').localeCompare(b.id() || ''); // Fallback to creation order
            };
        case 'tagCount':
            return (a, b) => ( (a.data('tags') || []).length - (b.data('tags') || []).length ) * dir;
        default:
            return null; // No sorting
    }
}

// Set the current sort mode
function setSortMode(mode) {
    currentSortMode = mode;
    console.log(`Sort mode set to: ${mode}`);
    closeSortMenu();
    sortSelectedCards(); // Immediately apply sort
}

// Sort the currently selected cards based on the current sort mode
function sortSelectedCards() {
    const sortFunction = getSortFunction(currentSortMode);
    if (!sortFunction) return;

    let selectedNodes = cy.$('node:selected').filter(node => !node.hasClass('pinned'));
    
    // If no nodes are selected, try using search matches instead
    if (selectedNodes.length === 0) {
        selectedNodes = cy.$('node.search-match').filter(node => !node.hasClass('pinned'));
    }

    if (selectedNodes.length < 2) return;

    // Sort the nodes
    const sortedNodes = selectedNodes.sort(sortFunction);

    // Store the sorted nodes in a global or temporary variable for arrangement functions to use
    copiedCards = sortedNodes.map(node => node.id());
    
    console.log(`Sorted ${copiedCards.length} cards. Ready for arrangement (H, V, G+V, etc).`);
    
    // Provide feedback to the user
    const searchInfo = document.getElementById('searchInfo');
    if (searchInfo) {
        searchInfo.textContent = `Sorterade ${copiedCards.length} kort. Tryck H, V, G+V, etc. för att arrangera.`;
        searchInfo.classList.add('visible');
        setTimeout(() => {
            searchInfo.classList.remove('visible');
        }, 4000);
    }
}

// Arrange selected cards in a loose cluster (like a pile of photos)
function clusterSelectedCards() {
    const selectedNodes = cy.$('node:selected').filter(node => !node.hasClass('pinned'));
    if (selectedNodes.length === 0) return;

    const center = getArrangementPosition();

    cy.batch(() => {
        selectedNodes.forEach(node => {
            const randomX = center.x + (Math.random() - 0.5) * 150;
            const randomY = center.y + (Math.random() - 0.5) * 150;
            node.position({ x: randomX, y: randomY });
        });
    });
}

// Arrange selected cards in a neat stack
function stackSelectedCards() {
    const selectedNodes = cy.$('node:selected').filter(node => !node.hasClass('pinned'));
    if (selectedNodes.length === 0) return;

    const center = getArrangementPosition();

    cy.batch(() => {
        selectedNodes.forEach(node => {
            node.position({ x: center.x, y: center.y });
        });
    });
}

// Arrange selected cards in a vertical column
function arrangeSelectedInColumn() {
    const nodesToArrange = copiedCards.length > 0 ? cy.nodes().filter(n => copiedCards.includes(n.id())) : cy.$('node:selected').filter(node => !node.hasClass('pinned'));
    if (nodesToArrange.length === 0) return;

    const center = getArrangementPosition();
    let currentY = center.y;

    cy.batch(() => {
        nodesToArrange.forEach(node => {
            const nodeHeight = getMeasuredTextHeight(node);
            node.position({ x: center.x, y: currentY });
            currentY += nodeHeight + 40; // Add spacing
        });
    });
    copiedCards = []; // Clear after arrangement
}

// Arrange selected cards in a horizontal row
function arrangeSelectedInRow() {
    const nodesToArrange = copiedCards.length > 0 ? cy.nodes().filter(n => copiedCards.includes(n.id())) : cy.$('node:selected').filter(node => !node.hasClass('pinned'));
    if (nodesToArrange.length === 0) return;

    const center = getArrangementPosition();
    let currentX = center.x;

    cy.batch(() => {
        nodesToArrange.forEach(node => {
            const nodeWidth = 300; // All cards have same width
            node.position({ x: currentX, y: center.y });
            currentX += nodeWidth + 40; // Add spacing
        });
    });
    copiedCards = []; // Clear after arrangement
}

// Arrange in vertical columns (grid)
function arrangeSelectedGridVerticalColumns() {
    const nodesToArrange = copiedCards.length > 0 ? cy.nodes().filter(n => copiedCards.includes(n.id())) : cy.$('node:selected').filter(node => !node.hasClass('pinned'));
    if (nodesToArrange.length === 0) return;

    const center = getArrangementPosition();
    const numNodes = nodesToArrange.length;
    const numCols = Math.ceil(Math.sqrt(numNodes));
    const colWidth = 350;
    const rowHeight = 250;
    let currentX = center.x;
    let currentY = center.y;
    let colCount = 0;

    cy.batch(() => {
        nodesToArrange.forEach(node => {
            node.position({ x: currentX, y: currentY });
            currentY += rowHeight;
            colCount++;
            if (colCount >= numCols) {
                colCount = 0;
                currentY = center.y;
                currentX += colWidth;
            }
        });
    });
    copiedCards = []; // Clear after arrangement
}

// Arrange in a packed horizontal grid
function arrangeSelectedGridHorizontalPacked() {
    const nodesToArrange = copiedCards.length > 0 ? cy.nodes().filter(n => copiedCards.includes(n.id())) : cy.$('node:selected').filter(node => !node.hasClass('pinned'));
    if (nodesToArrange.length === 0) return;

    const center = getArrangementPosition();
    const numNodes = nodesToArrange.length;
    const numCols = Math.ceil(Math.sqrt(numNodes));
    const colWidth = 350;
    const rowHeight = 250;
    let currentX = center.x;
    let currentY = center.y;
    let colCount = 0;

    cy.batch(() => {
        nodesToArrange.forEach(node => {
            node.position({ x: currentX, y: currentY });
            currentX += colWidth;
            colCount++;
            if (colCount >= numCols) {
                colCount = 0;
                currentX = center.x;
                currentY += rowHeight;
            }
        });
    });
    copiedCards = []; // Clear after arrangement
}

// Arrange in a top-aligned horizontal grid
function arrangeSelectedGridTopAligned() {
    const nodesToArrange = copiedCards.length > 0 ? cy.nodes().filter(n => copiedCards.includes(n.id())) : cy.$('node:selected').filter(node => !node.hasClass('pinned'));
    if (nodesToArrange.length === 0) return;

    const center = getArrangementPosition();
    let currentX = center.x;

    cy.batch(() => {
        nodesToArrange.forEach(node => {
            const nodeWidth = 300;
            node.position({ x: currentX, y: center.y });
            currentX += nodeWidth + 40;
        });
    });
    copiedCards = []; // Clear after arrangement
}

// Arrange selected cards in a circular swarm
function arrangeCircularSwarm() {
    const selectedNodes = cy.$('node:selected').filter(node => !node.hasClass('pinned'));
    if (selectedNodes.length === 0) return;

    const center = getArrangementPosition();
    
    selectedNodes.layout({
        name: 'circle',
        center: center,
        radius: selectedNodes.length * 20,
        animate: true,
        animationDuration: 500
    }).run();
}

// Layout with connections (Organic layout)
function layoutWithConnections() {
    const selectedNodes = cy.$('node:selected');
    if (selectedNodes.length === 0) return;

    // Get the neighborhood of all selected nodes
    let neighborhood = selectedNodes.neighborhood();
    let nodesToLayout = selectedNodes.union(neighborhood);

    nodesToLayout.layout({
        name: 'cose',
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 100,
        nodeRepulsion: 400000,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
    }).run();
}