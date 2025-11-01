function showGoogleAIAPIKeyDialog() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        dialog.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #333;">✨ Gemini AI Assistent</h2>
            <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">
                För att använda bildigenkänning med Gemini behöver du en Google AI API-nyckel.
            </p>
            <p style="margin: 0 0 15px 0; color: #666; line-height: 1.6;">
                <strong>Så här skaffar du en nyckel:</strong><br>
                1. Gå till <a href="https://makersuite.google.com/app/apikey" target="_blank" style="color: #007bff;">Google AI Studio</a><br>
                2. Skapa ett konto eller logga in<br>
                3. Klicka på "Create API key"<br>
                4. Klistra in nyckeln här nedan
            </p>
            <p style="margin: 0 0 15px 0; color: #e67e22; font-size: 13px;">
                ⚠️ Din API-nyckel sparas endast lokalt i din webbläsare.
            </p>
            <input type="password" id="googleAiApiKeyInput" placeholder="Din Google AI API-nyckel..." style="
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-family: monospace;
                font-size: 14px;
                box-sizing: border-box;
                margin-bottom: 20px;
            ">
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelApiKey" style="
                    padding: 10px 20px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">Avbryt</button>
                <button id="saveApiKey" style="
                    padding: 10px 20px;
                    border: none;
                    background: #007bff;
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">Spara och fortsätt</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const input = document.getElementById('googleAiApiKeyInput');
        input.focus();

        const closeDialog = (key = null) => {
            overlay.remove();
            resolve(key);
        };

        document.getElementById('cancelApiKey').onclick = () => closeDialog();

        document.getElementById('saveApiKey').onclick = () => {
            const apiKey = input.value.trim();
            if (apiKey) {
                localStorage.setItem('googleAiApiKey', apiKey);
                closeDialog(apiKey);
            } else {
                alert('Vänligen ange en giltig API-nyckel.');
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('saveApiKey').click();
            }
        });

        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeDialog();
            }
        });
    });
}

async function getGoogleAIAPIKey() {
    let apiKey = localStorage.getItem('googleAiApiKey');
    if (apiKey) {
        return apiKey;
    }
    
    apiKey = await showGoogleAIAPIKeyDialog();
    return apiKey;
}

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

// Process uploaded images and PDFs
function handleImageFiles(files) {
    Array.from(files).forEach(file => {
        if (file && file.type.startsWith('image/')) {
            processImage(file).then(imageData => {
                createImageNode(imageData, file.name);
            }).catch(err => {
                console.error('Image processing failed:', err);
            });
        } else if (file && file.type === 'application/pdf') {
            processPdfFile(file).catch(err => {
                console.error('PDF processing failed:', err);
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

// Process PDF file and convert all pages to image nodes
async function processPdfFile(file) {
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const searchInfo = document.getElementById('searchInfo');
    if (searchInfo) {
        searchInfo.textContent = `📄 Bearbetar PDF: ${file.name}...`;
        searchInfo.classList.add('visible');
    }

    try {
        // Load the PDF file
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        const numPages = pdf.numPages;

        if (searchInfo) {
            searchInfo.textContent = `📄 Konverterar ${numPages} sidor från ${file.name}...`;
            searchInfo.classList.add('visible');
        }

        // Process each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            // Get viewport with scale for good quality (2x for retina)
            const viewport = page.getViewport({scale: 2.0});

            // Create canvas for rendering
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render PDF page to canvas
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            // Scale down to 800px width (same as images)
            const finalCanvas = document.createElement('canvas');
            const finalCtx = finalCanvas.getContext('2d');
            const ratio = 800 / canvas.width;
            finalCanvas.width = 800;
            finalCanvas.height = Math.round(canvas.height * ratio);

            finalCtx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);

            // Convert to base64 (WebP or PNG)
            let base64;
            let format = 'unknown';

            try {
                base64 = finalCanvas.toDataURL('image/webp', 0.95);
                if (base64.startsWith('data:image/webp')) {
                    format = 'WebP 95%';
                } else {
                    throw new Error('WebP not supported');
                }
            } catch {
                base64 = finalCanvas.toDataURL('image/png');
                format = 'PNG';
            }

            // Create image node for this page
            const imageData = {
                data: base64,
                width: finalCanvas.width,
                height: finalCanvas.height,
                originalName: `${file.name} - Sida ${pageNum}`
            };

            createImageNode(imageData, `${file.name} - Sida ${pageNum}/${numPages}`);

            console.log(`📄 Page ${pageNum}/${numPages} converted: ${format} (${Math.round(base64.length/1024)} KB)`);
        }

        if (searchInfo) {
            searchInfo.textContent = `✅ ${numPages} sidor importerade från ${file.name}`;
            searchInfo.classList.add('visible');
            setTimeout(() => {
                searchInfo.classList.remove('visible');
            }, 3000);
        }

    } catch (error) {
        console.error('PDF processing error:', error);
        if (searchInfo) {
            searchInfo.textContent = `❌ PDF-import misslyckades: ${error.message}`;
            searchInfo.classList.add('visible');
            setTimeout(() => {
                searchInfo.classList.remove('visible');
            }, 5000);
        }
        throw error;
    }
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

async function readImageWithGemini(node) {
    console.log('DEBUG: readImageWithGemini called for node:', node.id());
    const apiKey = await getGoogleAIAPIKey();
    if (!apiKey) {
        console.error('DEBUG: Google AI API key not found or user cancelled.');
        return;
    }
    console.log('DEBUG: API Key obtained.');

    const imageData = node.data('imageData');
    if (!imageData) {
        alert('No image data found on this card.');
        console.error('DEBUG: No image data found for node:', node.id());
        return;
    }
    console.log('DEBUG: Image data found.');

    // Show loading indicator
    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        statusDiv.textContent = '✨ Reading image with Gemini...';
        statusDiv.classList.add('visible');
    }

    try {
        console.log('DEBUG: Calling Gemini API...');
        const response = await callGeminiAPI(apiKey, imageData);
        console.log('DEBUG: Gemini API raw response:', response);
        
        if (!response || !response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0) {
            throw new Error('Invalid response structure from Gemini API.');
        }
        const text = response.candidates[0].content.parts[0].text;
        console.log('DEBUG: Gemini API extracted text:', text);

        node.data('annotation', text);
        node.data('searchableText', text.toLowerCase());

        if (statusDiv) {
            statusDiv.textContent = '✅ Image read successfully!';
            setTimeout(() => {
                statusDiv.classList.remove('visible');
            }, 3000);
        }

        // Refresh the card to show the new text
        cy.style().update();
        console.log('DEBUG: Card updated with Gemini text.');

    } catch (error) {
        console.error('DEBUG: Error in readImageWithGemini:', error);
        if (statusDiv) {
            statusDiv.textContent = `❌ Error: ${error.message}`;
            setTimeout(() => {
                statusDiv.classList.remove('visible');
            }, 5000);
        }
    }
}

async function callGeminiAPI(apiKey, imageData) {
    console.log('DEBUG: callGeminiAPI started.');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log('DEBUG: Gemini API URL:', url);

    const payload = {
        contents: [
            {
                parts: [
                    { text: "Transkribera texten från bilden. Efter texten, lägg till relevanta hashtags för att kategorisera bildens innehåll. Exempel: #indexkort #anteckning #todo #samtal #smith" },
                    {
                        inline_data: {
                            mime_type: "image/jpeg", // Assuming JPEG, adjust if needed
                            data: imageData.split(',')[1]
                        }
                    }
                ]
            }
        ]
    };
    console.log('DEBUG: Gemini API payload (truncated image data):', { ...payload, contents: [{ parts: [{ text: payload.contents[0].parts[0].text }, { inline_data: { mime_type: payload.contents[0].parts[1].inline_data.mime_type, data: '[TRUNCATED]' } }] }] });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        console.log('DEBUG: Fetch response received.', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('DEBUG: Gemini API error response data:', errorData);
            throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
        }

        const responseJson = await response.json();
        console.log('DEBUG: Gemini API successful response JSON:', responseJson);
        return responseJson;
    } catch (error) {
        console.error('DEBUG: Error during Gemini API fetch:', error);
        throw error;
    }
}

// Batch Gemini OCR for multiple images
async function batchGeminiOCR(nodes) {
    console.log('DEBUG: batchGeminiOCR called for', nodes.length, 'nodes');

    // Filter for only image nodes
    const imageNodes = nodes.filter(node => node.data('type') === 'image' && node.data('imageData'));

    if (imageNodes.length === 0) {
        alert('Inga bildkort valda.');
        return;
    }

    // Get API key once
    const apiKey = await getGoogleAIAPIKey();
    if (!apiKey) {
        console.error('DEBUG: Google AI API key not found or user cancelled.');
        return;
    }

    // Show status
    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        statusDiv.textContent = `✨ Läser ${imageNodes.length} bilder med Gemini...`;
        statusDiv.classList.add('visible');
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each image sequentially (to avoid rate limiting)
    for (let i = 0; i < imageNodes.length; i++) {
        const node = imageNodes[i];

        // Update status
        if (statusDiv) {
            statusDiv.textContent = `✨ Läser bild ${i + 1}/${imageNodes.length}...`;
        }

        try {
            const imageData = node.data('imageData');
            const response = await callGeminiAPI(apiKey, imageData);

            if (!response || !response.candidates || response.candidates.length === 0 ||
                !response.candidates[0].content || !response.candidates[0].content.parts ||
                response.candidates[0].content.parts.length === 0) {
                throw new Error('Ogiltigt svar från Gemini API.');
            }

            const text = response.candidates[0].content.parts[0].text;
            console.log(`DEBUG: Gemini OCR for image ${i + 1}:`, text);

            // Update node with extracted text
            node.data('annotation', text);
            node.data('searchableText', text.toLowerCase());

            successCount++;

            // Small delay to avoid rate limiting
            if (i < imageNodes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

        } catch (error) {
            console.error(`DEBUG: Error processing image ${i + 1}:`, error);
            errorCount++;
        }
    }

    // Show final status
    if (statusDiv) {
        if (errorCount === 0) {
            statusDiv.textContent = `✅ Läste ${successCount} bilder med Gemini!`;
        } else {
            statusDiv.textContent = `⚠️ Läste ${successCount} bilder, ${errorCount} fel`;
        }
        setTimeout(() => {
            statusDiv.classList.remove('visible');
        }, 3000);
    }

    // Refresh display
    cy.style().update();
    saveBoard();

    // Refresh column view if active
    if (typeof isColumnView !== 'undefined' && isColumnView && typeof renderColumnViewDebounced === 'function') {
        renderColumnViewDebounced();
    }
}