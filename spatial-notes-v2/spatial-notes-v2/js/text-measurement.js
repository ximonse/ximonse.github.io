function initTextRuler() {
textRuler = document.getElementById('text-ruler');
}
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
