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
                'rect': { shape: 'rectangle', label: '' },
                'circle': { shape: 'ellipse', label: '' },
                'triangle': { shape: 'triangle', label: '' },
                'diamond': { shape: 'diamond', label: '' },
                'star': { shape: 'star', label: '' },
                'hexagon': { shape: 'hexagon', label: '' }
            };
            
            const shapeInfo = shapes[shape] || shapes.rect;
            
            cy.add({
                data: {
                    id: id,
                    label: shapeInfo.label,
                    isAnnotation: true,
                    annotationType: 'shape',
                    shape: shape
                },
                position: position,
                classes: 'annotation-shape'
            });
            
            // Apply color immediately
            const node = cy.getElementById(id);
            node.style('background-color', annotationColor);
            
            console.log(`🔷 Created ${shape} annotation at`, position);
            return node;
        }
        
        // Create text annotation
        function createTextAnnotation(size, position) {
            const id = generateCardId();
            const sizes = {
                'text-small': { fontSize: '16px', label: 'Liten text' },
                'text-medium': { fontSize: '22px', label: 'Medium text' },
                'text-large': { fontSize: '28px', label: 'Stor text' }
            };
            
            const sizeInfo = sizes[size] || sizes['text-medium'];
            
            cy.add({
                data: {
                    id: id,
                    label: sizeInfo.label,
                    isAnnotation: true,
                    annotationType: 'text',
                    textSize: size
                },
                position: position,
                classes: 'annotation-text'
            });
            
            const node = cy.getElementById(id);
            node.style({
                'font-size': sizeInfo.fontSize,
                'background-color': annotationColor,
                'shape': 'rectangle'
            });
            
            console.log(`📝 Created ${size} text annotation at`, position);
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
            
            dialog.innerHTML = `
                <h3 style="margin-top: 0; color: #333; font-size: 18px;">Redigera annotation text</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Text:</label>
                    <textarea id="editAnnotationText" 
                        style="width: 100%; height: 120px; font-family: inherit; font-size: 14px; 
                               border: 1px solid #ccc; border-radius: 4px; padding: 8px;
                               box-sizing: border-box; resize: vertical;">${currentText}</textarea>
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
                if (newText) {
                    node.data('label', newText);
                    console.log('✅ Updated annotation text to:', newText);
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
