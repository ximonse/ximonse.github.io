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
