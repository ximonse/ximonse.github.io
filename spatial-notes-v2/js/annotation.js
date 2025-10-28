// ====================================================================================================
// 🔧 FALLBACK RESIZE FUNCTIONALITY
// ====================================================================================================

function setupFallbackResize() {
    console.log('🛠️ Setting up simple resize with Ctrl+click...');
    
    // Add Ctrl+click OR right-click resize for annotation nodes
    cy.on('cxttap', 'node', function(evt) {
        const node = evt.target;
        console.log('🖱️ Right-click on node:', node.id(), 'isAnnotation:', node.data('isAnnotation'), 'resizeMode:', resizeMode, 'classes:', node.classes());
        
        if (node.data('isAnnotation') && resizeMode) {
            console.log('🎯 Processing right-click resize for annotation node...');
            evt.stopPropagation();
            evt.preventDefault();
            
            const currentWidth = node.data('customWidth') || 120;
            const currentHeight = node.data('customHeight') || 120;
            
            console.log('📐 Current size:', currentWidth, 'x', currentHeight);
            
            // Simple resize: cycle through 4 sizes
            let newWidth, newHeight;
            
            if (currentWidth <= 80) {
                newWidth = 120;
                newHeight = 120;
            } else if (currentWidth <= 120) {
                newWidth = 160;
                newHeight = 160;
            } else if (currentWidth <= 160) {
                newWidth = 200;
                newHeight = 200;
            } else {
                newWidth = 80;
                newHeight = 80;
            }
            
            console.log('📏 Resizing to:', newWidth, 'x', newHeight);
            
            // Update the data properties and force style refresh
            node.data('customWidth', newWidth);
            node.data('customHeight', newHeight);
            
            // Force Cytoscape to recalculate styles by triggering style refresh
            node.removeStyle('width height');
            node.trigger('data');
            cy.style().update();
            
            console.log(`✅ Resized annotation ${node.id()} to ${newWidth}x${newHeight}`);
            return false;
        }
    });
    
    // Backup: Also try Ctrl+click 
    cy.on('click', 'node', function(evt) {
        const node = evt.target;
        console.log('🖱️ Node clicked:', node.id(), 'isAnnotation:', node.data('isAnnotation'), 'resizeMode:', resizeMode, 'ctrlKey:', evt.originalEvent?.ctrlKey);
        
        if (node.data('isAnnotation') && resizeMode && evt.originalEvent?.ctrlKey) {
            console.log('🎯 Processing Ctrl+click resize for annotation node...');
            evt.stopPropagation();
            evt.preventDefault();
            
            const currentWidth = node.data('customWidth') || 120;
            const currentHeight = node.data('customHeight') || 120;
            
            console.log('📐 Current size:', currentWidth, 'x', currentHeight);
            
            // Simple resize: cycle through 4 sizes
            let newWidth, newHeight;
            
            if (currentWidth <= 80) {
                newWidth = 120;
                newHeight = 120;
            } else if (currentWidth <= 120) {
                newWidth = 160;
                newHeight = 160;
            } else if (currentWidth <= 160) {
                newWidth = 200;
                newHeight = 200;
            } else {
                newWidth = 80;
                newHeight = 80;
            }
            
            console.log('📏 Resizing to:', newWidth, 'x', newHeight);
            
            // Update the data properties and force style refresh
            node.data('customWidth', newWidth);
            node.data('customHeight', newHeight);
            
            // Force Cytoscape to recalculate styles by triggering style refresh
            node.removeStyle('width height');
            node.trigger('data');
            cy.style().update();
            
            console.log(`✅ Resized annotation ${node.id()} to ${newWidth}x${newHeight}`);
            return false; // Prevent further event handling
        }
    });
    
    console.log('✅ Fallback resize setup complete - Ctrl+click annotations in resize mode');
}

// ====================================================================================================
// 🎨 ANNOTATION SYSTEM FUNCTIONS
// ====================================================================================================

// Toggle annotation toolbar visibility
function toggleAnnotationToolbar() {
    annotationToolbarVisible = !annotationToolbarVisible;
    const toolbar = document.getElementById('annotationToolbar');
    const toggleBtn = document.getElementById('annotationToggleBtn');
    
    if (annotationToolbarVisible) {
        toolbar.classList.add('active');
        toggleBtn.style.background = '#28a745';
        console.log('🎨 Annotation toolbar activated');
    } else {
        toolbar.classList.remove('active');
        toggleBtn.style.background = '';
        setAnnotationMode('select');
        console.log('📐 Annotation toolbar deactivated');
    }
}

// Set annotation mode and update UI
function setAnnotationMode(mode) {
    annotationMode = mode;
    connectionStartNode = null;
    
    // Update tool buttons
    document.querySelectorAll('.annotation-tool').forEach(tool => {
        tool.classList.remove('active');
    });
    
    const activeTool = document.querySelector(`[data-tool="${mode}"]`);
    if (activeTool) {
        activeTool.classList.add('active');
    }
    
    console.log('🎯 Annotation mode set to:', mode);
}

// Set annotation color
function setAnnotationColor(color) {
    annotationColor = color;
    console.log('🎨 Annotation color set to:', color);
}

// Toggle resize mode for annotations
function toggleResizeMode() {
    resizeMode = !resizeMode;
    
    console.log('↗️ Resize mode:', resizeMode ? 'enabled' : 'disabled');
    
    // Show user-friendly status message
    if (window.showBriefMessage) {
        if (resizeMode) {
            window.showBriefMessage('↗️ Storleksändring aktiverad - Högerklicka på annotations för att ändra storlek');
        } else {
            window.showBriefMessage('📐 Storleksändring avstängd');
        }
    }
}

// Create geometric shape annotation
function createShapeAnnotation(shape, position) {
    const id = generateCardId();
    const shapes = {
        'rect': { shape: 'rectangle', label: '', width: 120, height: 120 },
        'circle': { shape: 'ellipse', label: '', width: 120, height: 120 },
        'triangle': { shape: 'triangle', label: '', width: 120, height: 120 },
        'diamond': { shape: 'diamond', label: '', width: 120, height: 120 },
        'star': { shape: 'star', label: '', width: 120, height: 120 },
        'hexagon': { shape: 'hexagon', label: '', width: 120, height: 120 }
    };

    const shapeInfo = shapes[shape] || shapes.rect;

    cy.add({
        data: {
            id: id,
            label: shapeInfo.label,
            text: shapeInfo.label, // Also store in 'text' for consistency
            isAnnotation: true,
            annotationType: 'shape',
            shape: shape,
            customWidth: shapeInfo.width,
            customHeight: shapeInfo.height,
            customZIndex: 0, // Normal layer
            annotationColor: annotationColor // Store color in data for saving
        },
        position: position,
        classes: 'annotation-shape'
    });

    // Apply color immediately
    const node = cy.getElementById(id);
    node.style('background-color', annotationColor);

    console.log(`🔷 Created ${shape} annotation at`, position, 'with size', shapeInfo.width, 'x', shapeInfo.height);
    return node;
}

// Create text annotation
function createTextAnnotation(size, position) {
    const id = generateCardId();
    const sizes = {
        'text-small': { fontSize: 20, label: 'Text', width: 100, height: 50 },  // S: 100x50, font 20
        'text-medium': { fontSize: 30, label: 'Text', width: 200, height: 75 }, // M: 200x75, font 30
        'text-large': { fontSize: 50, label: 'Text', width: 300, height: 100 }  // L: 300x100, font 50
    };

    const sizeInfo = sizes[size] || sizes['text-medium'];

    cy.add({
        data: {
            id: id,
            label: sizeInfo.label,
            text: sizeInfo.label, // Also store in 'text' for consistency
            isAnnotation: true,
            annotationType: 'text',
            textSize: size,
            customWidth: sizeInfo.width,
            customHeight: sizeInfo.height,
            customFontSize: sizeInfo.fontSize,
            customZIndex: 0, // Normal layer
            annotationColor: annotationColor, // Store color in data for saving
            hidden_tags: [] // Empty array for potential tagging later
        },
        position: position,
        classes: 'annotation-text'
    });

    const node = cy.getElementById(id);
    node.style({
        'font-size': sizeInfo.fontSize + 'px',
        'background-color': annotationColor,
        'shape': 'rectangle'
    });

    console.log(`📝 Created ${size} text annotation at`, position, 'with size', sizeInfo.width, 'x', sizeInfo.height, 'font', sizeInfo.fontSize);
    return node;
}

// Create connection (arrow or line) between nodes
function createConnection(sourceNode, targetNode, type) {
    const id = generateCardId();
    const isArrow = type === 'arrow';
    
    cy.add({
        data: {
            id: id,
            source: sourceNode.id(),
            target: targetNode.id(),
            isAnnotation: true,
            annotationType: 'connection',
            connectionType: type
        },
        classes: 'annotation-connection'
    });
    
    const edge = cy.getElementById(id);
    edge.style({
        'line-color': annotationColor,
        'target-arrow-color': annotationColor,
        'target-arrow-shape': isArrow ? 'triangle' : 'none',
        'curve-style': 'bezier',
        'width': 5,
        'arrow-scale': 1.8
    });
    
    console.log(`🔗 Created ${type} connection between`, sourceNode.id(), 'and', targetNode.id());
    return edge;
}

// Edit annotation text function
function editAnnotationText(node) {
    const currentText = node.data('label') || 'Text';
    
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
        max-width: 400px; width: 90%; max-height: 80vh;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        box-sizing: border-box;
    `;
    
    const currentHiddenTags = node.data('hidden_tags') || [];
    const hiddenTagsStr = currentHiddenTags.join(', ');

    dialog.innerHTML = `
        <h3 style="margin-top: 0; color: #333; font-size: 18px;">Redigera annotation</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Text:</label>
            <textarea id="editAnnotationText"
                style="width: 100%; height: 120px; font-family: inherit; font-size: 14px;
                       border: 1px solid #ccc; border-radius: 4px; padding: 8px;
                       box-sizing: border-box; resize: vertical;">${currentText}</textarea>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Osynliga taggar (kommaseparerade):</label>
            <input type="text" id="editAnnotationTags"
                style="width: 100%; font-family: inherit; font-size: 14px;
                       border: 1px solid #ccc; border-radius: 4px; padding: 8px;
                       box-sizing: border-box;"
                placeholder="t.ex: viktigt, todo, projekt-x"
                value="${hiddenTagsStr}">
            <small style="color: #666; font-size: 12px;">Används för sökning utan att visas på kortet</small>
        </div>
        <div style="text-align: right;">
            <button id="cancelAnnotationEdit" style="margin-right: 10px; padding: 8px 16px;
                   background: #ccc; border: none; border-radius: 4px; cursor: pointer;">Avbryt</button>
            <button id="saveAnnotationEdit" style="padding: 8px 16px;
                   background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Spara</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus on text area and select all
    const textArea = document.getElementById('editAnnotationText');
    textArea.focus();
    textArea.select();
    
    // Event listeners
    document.getElementById('saveAnnotationEdit').addEventListener('click', function() {
        const newText = textArea.value.trim();
        const tagsInput = document.getElementById('editAnnotationTags');
        const tagsText = tagsInput.value.trim();

        if (newText) {
            node.data('label', newText);
            node.data('text', newText); // Also save in 'text' for consistency and save/load
            node.style('label', newText); // Update visual label
            console.log('✅ Updated annotation text to:', newText);

            // AUTO-EXPANDERING: Expand ALL textboxes if text is too wide
            const textSize = node.data('textSize');
            const fontSize = node.data('customFontSize') || 18;

            // Get minimum width based on size (S=100, M=200, L=300)
            let minWidth = 100;
            if (textSize === 'text-medium') minWidth = 200;
            if (textSize === 'text-large') minWidth = 300;

            if (newText.length > 0) {
                // Create temporary element to measure text width
                const measurer = document.createElement('span');
                measurer.style.cssText = `
                    position: absolute; visibility: hidden; white-space: nowrap;
                    font-size: ${fontSize}px; font-family: inherit; padding: 10px;
                `;
                measurer.textContent = newText;
                document.body.appendChild(measurer);

                const textWidth = measurer.offsetWidth;
                document.body.removeChild(measurer);

                // If text is wider than minimum, expand the box
                if (textWidth > minWidth) {
                    const newWidth = Math.min(textWidth + 20, 1200); // Max 1200px
                    node.data('customWidth', newWidth);
                    node.style('width', newWidth + 'px');
                    console.log(`📏 Auto-expanded textbox from ${minWidth}px to ${newWidth}px`);
                } else {
                    // Reset to minimum if text is shorter
                    node.data('customWidth', minWidth);
                    node.style('width', minWidth + 'px');
                }
            }
        }

        // Save hidden tags
        if (tagsText.length > 0) {
            const tags = tagsText.split(',').map(t => t.trim()).filter(t => t.length > 0);
            node.data('hidden_tags', tags);
            console.log('✅ Updated hidden tags:', tags);
        } else {
            node.data('hidden_tags', []);
        }

        // Save immediately to prevent data loss from autosave/Drive sync
        saveBoard();

        document.body.removeChild(overlay);
    });
    
    document.getElementById('cancelAnnotationEdit').addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    // Close on ESC key
    overlay.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
        }
    });
    
    // Close on overlay click (outside dialog)
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

// MINIMAL UNDO/REDO SYSTEM - Define early so functions can use it
let undoStack = [];
let redoStack = [];
const MAX_UNDO_STEPS = 20;

// Generate unique timestamp-based ID for new cards
