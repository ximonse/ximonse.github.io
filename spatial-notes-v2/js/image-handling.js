// IMAGE HANDLING SYSTEM - Integration with existing architecture

// Detect if user is on mobile/tablet device
function isMobileDevice() {
    const result = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    console.log('DEBUG isMobileDevice:', result, 'userAgent:', navigator.userAgent, 'maxTouchPoints:', navigator.maxTouchPoints);
    return result;
}

// Direct image upload - use the three-choice function directly
function triggerImageUpload() {
    document.getElementById('hiddenGalleryInput').click();
}

// Show image source menu at specific position (for iPad/mobile)
function showImageSourceMenu(clientX, clientY) {
    // Remove any existing menu
    const existingMenu = document.getElementById('imageSourceMenu');
    if (existingMenu) {
        document.body.removeChild(existingMenu);
    }

    // Create menu
    const menu = document.createElement('div');
    menu.id = 'imageSourceMenu';
    menu.style.cssText = `
        position: fixed;
        left: ${Math.min(clientX, window.innerWidth - 200)}px;
        top: ${Math.min(clientY, window.innerHeight - 200)}px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: 10000;
        min-width: 180px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        padding: 8px 0;
    `;

    menu.innerHTML = `
        <div class="image-menu-item" data-action="clipboard" style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #eee;">
            📋 Klistra in
        </div>
        <div class="image-menu-item" data-action="camera" style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #eee;">
            📷 Ta foto
        </div>
        <div class="image-menu-item" data-action="gallery" style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #eee;">
            🖼️ Välj från galleri
        </div>
        <div class="image-menu-item" data-action="file" style="padding: 12px 16px; cursor: pointer;">
            📁 Välj fil
        </div>
    `;

    document.body.appendChild(menu);

    // Handle menu item clicks
    menu.querySelectorAll('.image-menu-item').forEach(item => {
        item.addEventListener('click', async () => {
            const action = item.dataset.action;
            if (action === 'clipboard') {
                // Paste from clipboard - call the existing paste function
                try {
                    await pasteClipboardContent(clientX, clientY);
                } catch (err) {
                    console.error('Clipboard paste failed:', err);
                    alert('Kunde inte klistra in från clipboard. Kontrollera behörigheter.');
                }
            } else if (action === 'camera') {
                document.getElementById('hiddenCameraInput').click();
            } else if (action === 'gallery') {
                document.getElementById('hiddenGalleryInput').click();
            } else if (action === 'file') {
                document.getElementById('hiddenGalleryInput').click();
            }
            document.body.removeChild(menu);
        });

        // Add hover effect
        item.addEventListener('mouseenter', function() {
            this.style.background = '#f0f0f0';
        });
        item.addEventListener('mouseleave', function() {
            this.style.background = 'white';
        });
    });

    // Close menu when clicking outside
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                }
                document.removeEventListener('click', closeHandler);
                document.removeEventListener('touchstart', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
        document.addEventListener('touchstart', closeHandler);
    }, 100);
}

// Process uploaded images
function handleImageFiles(files) {
    Array.from(files).forEach(file => {
        if (file && file.type.startsWith('image/')) {
            processImage(file).then(imageData => {
                createImageNode(imageData, file.name);
            }).catch(err => {
                console.error('Image processing failed:', err);
            });
        }
    });
}

// Process image to 800px width with S-curve + strong light-gray whitening for handwritten notes (~35-90 KB)
function processImage(file) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Scale to 800px width for better quality, maintain aspect ratio
            const ratio = 800 / img.width;
            canvas.width = 800;
            canvas.height = Math.round(img.height * ratio);
            
            // Draw image to canvas
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Enhance for handwritten notes - moderate contrast improvement
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                // Simple contrast enhancement without aggressive processing
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];
                
                // Calculate grayscale value for contrast enhancement
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                
                // Gentle contrast curve - improve readability without artifacts
                let enhanced;
                if (gray < 128) {
                    // Darken text slightly
                    enhanced = gray * 0.8;
                } else {
                    // Lighten background slightly
                    enhanced = gray + (255 - gray) * 0.3;
                }
                
                // Apply enhancement proportionally to preserve color balance
                const factor = enhanced / Math.max(gray, 1);
                
                data[i] = Math.min(255, Math.max(0, r * factor));
                data[i + 1] = Math.min(255, Math.max(0, g * factor));
                data[i + 2] = Math.min(255, Math.max(0, b * factor));
                // Alpha channel (data[i + 3]) remains unchanged
            }
            
            // Apply the enhanced image data back to canvas
            ctx.putImageData(imageData, 0, 0);
            
            // Try WebP for best quality/size ratio, fallback to PNG, then JPEG
            let base64;
            let format = 'unknown';
            
            try {
                // Try WebP first (best compression + quality)
                base64 = canvas.toDataURL('image/webp', 0.95);
                if (base64.startsWith('data:image/webp')) {
                    format = 'WebP 95%';
                } else {
                    throw new Error('WebP not supported');
                }
            } catch {
                try {
                    // Fallback to PNG
                    base64 = canvas.toDataURL('image/png');
                    format = 'PNG (lossless)';
                    
                    // If PNG too large, use max JPEG
                    if (base64.length > 300000) { // ~225KB in base64
                        base64 = canvas.toDataURL('image/jpeg', 1.0);
                        format = 'JPEG 100%';
                    }
                } catch {
                    // Final fallback
                    base64 = canvas.toDataURL('image/jpeg', 1.0);
                    format = 'JPEG 100%';
                }
            }
            
            console.log(`📷 Using ${format} (${Math.round(base64.length/1024)} KB)`);
            
            resolve({
                data: base64,
                width: canvas.width,
                height: canvas.height,
                originalName: file.name
            });
        };
        
        img.onerror = () => reject('Image loading failed');
        img.src = URL.createObjectURL(file);
    });
}

// Create image node integrated with existing system
function createImageNode(imageData, filename) {
    const position = getArrangementPosition();
    const nodeId = generateCardId();

    // Calculate proper aspect ratio height
    const displayWidth = 300;
    const ratio = imageData.height / imageData.width;
    const displayHeight = Math.round(displayWidth * ratio);
    const calculatedHeight = displayHeight; // Keep for backwards compatibility

    cy.add({
        group: 'nodes',
        data: {
            id: nodeId,
            type: 'image', // New node type
            imageData: imageData.data,
            imageWidth: imageData.width,  // Store original dimensions
            imageHeight: imageData.height, // Store original dimensions
            displayWidth: displayWidth,    // Display width (can be changed by user)
            displayHeight: displayHeight,  // Display height (maintains aspect ratio)
            calculatedHeight: calculatedHeight, // Pre-calculated height for arrangement
            annotation: '',
            searchableText: '',
            originalFileName: filename,
            title: '', // No visible title for images
            text: '', // Keep consistent with existing structure
            tags: [],
            isManualCard: true // Integrate with existing categorization
        },
        position: position
    });

    console.log(`📷 Created image node: ${filename} (${Math.round(imageData.data.length/1024)} KB) - ${imageData.width}x${imageData.height} → ${displayWidth}x${displayHeight}`);
}

// Handle paste events (Ctrl+V) for images
function handlePasteImage(event) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
        if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
                processImage(file).then(imageData => {
                    createImageNode(imageData, 'pasted-image-' + Date.now() + '.jpg');
                }).catch(err => {
                    console.error('Paste image processing failed:', err);
                });
            }
            break;
        }
    }
}

// Handle canvas long press - different behavior for mobile vs desktop
function handleCanvasLongPress(clientX, clientY) {
    if (isMobileDevice()) {
        // Mobile/tablet: Show image source menu at touch position
        showImageSourceMenu(clientX, clientY);
    } else {
        // Desktop: Paste clipboard content
        pasteClipboardContent(clientX, clientY);
    }
}

// Paste clipboard content (text or image) at specific position
async function pasteClipboardContent(clientX, clientY) {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (let item of clipboardItems) {
            // Check for image first
            for (let type of item.types) {
                if (type.startsWith('image/')) {
                    const blob = await item.getAsType(type);
                    const position = getCanvasPosition(clientX, clientY);
                    processImage(blob).then(imageData => {
                        createImageNodeAtPosition(imageData, 'pasted-' + Date.now() + '.jpg', position);
                    }).catch(err => {
                        console.error('Image paste processing failed:', err);
                    });
                    return;
                }
            }
        }
        
        // If no image, try text
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
            const position = getCanvasPosition(clientX, clientY);
            createTextNodeAtPosition(text.trim(), position);
        }
    } catch (err) {
        console.error('Kunde inte komma åt urklipp:', err);
    }
}

// Get canvas position from client coordinates
function getCanvasPosition(clientX, clientY) {
    const cyContainer = document.getElementById('cy');
    const rect = cyContainer.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    // Convert to Cytoscape coordinates
    const pan = cy.pan();
    const zoom = cy.zoom();
    
    return {
        x: (relativeX - pan.x) / zoom,
        y: (relativeY - pan.y) / zoom
    };
}

// Create text node at specific position
function createTextNodeAtPosition(text, position) {
    const cardId = generateCardId();
    cy.add({
        group: 'nodes',
        data: {
            id: cardId,
            label: text,
            isManualCard: true,
            tags: [],
            annotation: '',
            searchableText: text
        },
        position: position
    });
}

// Create image node at specific position
function createImageNodeAtPosition(imageData, filename, position) {
    const displayWidth = 300;
    const ratio = imageData.height / imageData.width;
    const displayHeight = Math.round(displayWidth * ratio);
    const calculatedHeight = displayHeight; // Keep for backwards compatibility
    const cardId = generateCardId();

    cy.add({
        group: 'nodes',
        data: {
            id: cardId,
            label: '📝',
            type: 'image',
            imageData: imageData.data,
            imageWidth: imageData.width,
            imageHeight: imageData.height,
            displayWidth: displayWidth,
            displayHeight: displayHeight,
            calculatedHeight: calculatedHeight,
            annotation: '',
            searchableText: '',
            originalFileName: filename,
            title: '',
            text: '',
            tags: [],
            isManualCard: true
        },
        position: position
    });
}


// Generate unique timestamp-based card ID
