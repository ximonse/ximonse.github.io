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
    if (!apiKey && typeof GOOGLE_AI_API_KEY !== 'undefined') {
        // Use hardcoded Gemini API key as fallback
        apiKey = GOOGLE_AI_API_KEY;
        console.log('Using hardcoded Gemini API key');
    }
    if (!apiKey) {
        apiKey = await showGoogleAIAPIKeyDialog();
    }
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
function handleImageFiles(files, qualityPreset = null) {
    // If no quality preset provided, ask the user
    if (qualityPreset === null) {
        showQualityDialog((selectedQuality) => {
            // Process files with selected quality
            Array.from(files).forEach(file => {
                if (file && file.type.startsWith('image/')) {
                    processImage(file, selectedQuality).then(imageData => {
                        createImageNode(imageData, file.name);
                    }).catch(err => {
                        console.error('Image processing failed:', err);
                    });
                } else if (file && file.type === 'application/pdf') {
                    processPdfFile(file, selectedQuality).catch(err => {
                        console.error('PDF processing failed:', err);
                    });
                }
            });
        });
    } else {
        // Quality preset already provided, process directly
        Array.from(files).forEach(file => {
            if (file && file.type.startsWith('image/')) {
                processImage(file, qualityPreset).then(imageData => {
                    createImageNode(imageData, file.name);
                }).catch(err => {
                    console.error('Image processing failed:', err);
                });
            } else if (file && file.type === 'application/pdf') {
                processPdfFile(file, qualityPreset).catch(err => {
                    console.error('PDF processing failed:', err);
                });
            }
        });
    }
}

// Show quality selection dialog
function showQualityDialog(callback) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        -webkit-tap-highlight-color: transparent;
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        max-width: 420px;
        width: 85%;
        max-height: 90vh;
        overflow-y: auto;
    `;

    dialog.innerHTML = `
        <h3 style="margin: 0 0 20px 0; font-size: 20px; color: #333; font-weight: 600; text-align: center;">
            Välj bildkvalitet
        </h3>
        <div>
            <button id="quality-low" style="
                width: 100%;
                padding: 18px;
                margin-bottom: 12px;
                border: 2px solid #ddd;
                border-radius: 8px;
                background: white;
                cursor: pointer;
                font-size: 15px;
                text-align: left;
                touch-action: manipulation;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                transition: all 0.2s ease;
            ">
                <div style="font-weight: 600; margin-bottom: 4px;">🔹 Låg kvalitet</div>
                <div style="color: #666; font-size: 13px; line-height: 1.4;">
                    Mindre filstorlek, snabbare laddning<br>
                    (700px bredd, 70% kvalitet)
                </div>
            </button>
            <button id="quality-normal" style="
                width: 100%;
                padding: 18px;
                border: 2px solid #4CAF50;
                border-radius: 8px;
                background: #f0f8f0;
                cursor: pointer;
                font-size: 15px;
                text-align: left;
                touch-action: manipulation;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                transition: all 0.2s ease;
            ">
                <div style="font-weight: 600; margin-bottom: 4px;">✨ Normal kvalitet</div>
                <div style="color: #666; font-size: 13px; line-height: 1.4;">
                    Bättre kvalitet, större filstorlek<br>
                    (1200px bredd, 85% kvalitet)
                </div>
            </button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Add active state styling for buttons
    const addButtonEffects = (button) => {
        button.addEventListener('touchstart', () => {
            button.style.transform = 'scale(0.98)';
            button.style.opacity = '0.8';
        });
        button.addEventListener('touchend', () => {
            button.style.transform = 'scale(1)';
            button.style.opacity = '1';
        });
        button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.98)';
        });
        button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)';
        });
    };

    const lowBtn = dialog.querySelector('#quality-low');
    const normalBtn = dialog.querySelector('#quality-normal');

    addButtonEffects(lowBtn);
    addButtonEffects(normalBtn);

    // Handle button clicks
    const handleChoice = (quality) => {
        document.body.removeChild(overlay);
        callback(quality);
    };

    lowBtn.onclick = (e) => {
        e.preventDefault();
        handleChoice('low');
    };
    normalBtn.onclick = (e) => {
        e.preventDefault();
        handleChoice('normal');
    };

    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };

    // Prevent scrolling background
    document.body.style.overflow = 'hidden';

    // Restore scrolling when dialog closes
    const originalRemove = overlay.remove.bind(overlay);
    overlay.remove = function() {
        document.body.style.overflow = '';
        originalRemove();
    };
}

// Process image to 800px width with S-curve + strong light-gray whitening for handwritten notes (~35-90 KB)
// Helper function to apply convolution filter (for sharpening)
function applyConvolutionFilter(pixels, width, height, kernel) {
    const output = new Uint8ClampedArray(pixels.length);
    const kernelSize = 3;
    const half = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;

            for (let ky = 0; ky < kernelSize; ky++) {
                for (let kx = 0; kx < kernelSize; kx++) {
                    const pixelY = Math.min(height - 1, Math.max(0, y + ky - half));
                    const pixelX = Math.min(width - 1, Math.max(0, x + kx - half));
                    const pixelIndex = (pixelY * width + pixelX) * 4;
                    const kernelValue = kernel[ky * kernelSize + kx];

                    r += pixels[pixelIndex] * kernelValue;
                    g += pixels[pixelIndex + 1] * kernelValue;
                    b += pixels[pixelIndex + 2] * kernelValue;
                }
            }

            const outputIndex = (y * width + x) * 4;
            output[outputIndex] = Math.min(255, Math.max(0, r));
            output[outputIndex + 1] = Math.min(255, Math.max(0, g));
            output[outputIndex + 2] = Math.min(255, Math.max(0, b));
            output[outputIndex + 3] = pixels[outputIndex + 3]; // Preserve alpha
        }
    }

    return output;
}

function processImage(file, qualityPreset = 'low') {
    return new Promise((resolve, reject) => {
        // Quality settings based on preset
        const qualitySettings = {
            low: {
                maxWidth: 700,
                webpQuality: 0.70,
                jpegQuality: 0.70,
                pngSizeThreshold: 350000
            },
            normal: {
                maxWidth: 1200,
                webpQuality: 0.85,
                jpegQuality: 0.85,
                pngSizeThreshold: 600000
            }
        };

        const settings = qualitySettings[qualityPreset] || qualitySettings.low;

        // Extract basic file metadata
        const fileMetadata = {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileLastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
        };

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = async () => {
            // Try to extract EXIF data if available
            let exifData = null;
            if (typeof EXIF !== 'undefined' && EXIF.getData) {
                try {
                    await new Promise((resolveExif) => {
                        EXIF.getData(img, function() {
                            const allTags = EXIF.getAllTags(this);
                            if (Object.keys(allTags).length > 0) {
                                exifData = {
                                    dateTime: EXIF.getTag(this, 'DateTime') || EXIF.getTag(this, 'DateTimeOriginal') || null,
                                    dateTimeOriginal: EXIF.getTag(this, 'DateTimeOriginal') || null,
                                    make: EXIF.getTag(this, 'Make') || null,
                                    model: EXIF.getTag(this, 'Model') || null,
                                    gpsLatitude: EXIF.getTag(this, 'GPSLatitude') || null,
                                    gpsLongitude: EXIF.getTag(this, 'GPSLongitude') || null,
                                    gpsLatitudeRef: EXIF.getTag(this, 'GPSLatitudeRef') || null,
                                    gpsLongitudeRef: EXIF.getTag(this, 'GPSLongitudeRef') || null,
                                    orientation: EXIF.getTag(this, 'Orientation') || null
                                };
                                console.log('📷 EXIF data extracted:', exifData);
                            }
                            resolveExif();
                        });
                    });
                } catch (exifError) {
                    console.warn('EXIF extraction failed:', exifError);
                }
            }
            // Scale to configured width for sharper text, maintain aspect ratio
            const ratio = settings.maxWidth / img.width;
            canvas.width = settings.maxWidth;
            canvas.height = Math.round(img.height * ratio);

            // Use high-quality image smoothing for better text clarity
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

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

            // Apply subtle sharpening for text clarity
            const sharpenedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const sharpenKernel = [
                0, -0.5, 0,
                -0.5, 3, -0.5,
                0, -0.5, 0
            ];
            const sharpenedPixels = applyConvolutionFilter(imageData.data, canvas.width, canvas.height, sharpenKernel);
            sharpenedData.data.set(sharpenedPixels);
            ctx.putImageData(sharpenedData, 0, 0);

            // Try WebP for best quality/size ratio, fallback to PNG, then JPEG
            let base64;
            let format = 'unknown';
            
            try {
                // Try WebP first (best compression + quality)
                base64 = canvas.toDataURL('image/webp', settings.webpQuality);
                if (base64.startsWith('data:image/webp')) {
                    format = `WebP ${Math.round(settings.webpQuality * 100)}%`;
                } else {
                    throw new Error('WebP not supported');
                }
            } catch {
                try {
                    // Fallback to PNG for sharp text
                    base64 = canvas.toDataURL('image/png');
                    format = 'PNG (lossless)';

                    // If PNG too large, use JPEG with quality from settings
                    if (base64.length > settings.pngSizeThreshold) {
                        base64 = canvas.toDataURL('image/jpeg', settings.jpegQuality);
                        format = `JPEG ${Math.round(settings.jpegQuality * 100)}%`;
                    }
                } catch {
                    // Final fallback
                    base64 = canvas.toDataURL('image/jpeg', settings.jpegQuality);
                    format = `JPEG ${Math.round(settings.jpegQuality * 100)}%`;
                }
            }
            
            console.log(`📷 Using ${format} (${Math.round(base64.length/1024)} KB)`);

            resolve({
                data: base64,
                width: canvas.width,
                height: canvas.height,
                originalName: file.name,
                metadata: {
                    ...fileMetadata,
                    exif: exifData
                }
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

    // Build visible text from metadata
    let visibleText = '';

    const nodeData = {
        id: nodeId,
        type: 'image', // New node type
        imageData: imageData.data,
        imageWidth: imageData.width,  // Store original dimensions
        imageHeight: imageData.height, // Store original dimensions
        displayWidth: displayWidth,    // Display width (can be changed by user)
        displayHeight: displayHeight,  // Display height (maintains aspect ratio)
        calculatedHeight: calculatedHeight, // Pre-calculated height for arrangement
        annotation: '', // Will be set after metadata processing
        searchableText: '',
        originalFileName: filename,
        title: '', // No visible title for images
        text: '', // Keep consistent with existing structure
        tags: [],
        isManualCard: true // Integrate with existing categorization
    };

    // Add file metadata if available
    if (imageData.metadata) {
        if (imageData.metadata.fileName) nodeData.fileName = imageData.metadata.fileName;
        if (imageData.metadata.fileSize) nodeData.fileSize = imageData.metadata.fileSize;
        if (imageData.metadata.fileType) nodeData.fileType = imageData.metadata.fileType;
        if (imageData.metadata.fileLastModified) nodeData.fileLastModified = imageData.metadata.fileLastModified;

        // Add EXIF metadata if available (for images)
        if (imageData.metadata.exif) {
            const exif = imageData.metadata.exif;
            if (exif.dateTime) {
                nodeData.exifDateTime = exif.dateTime;
                visibleText += `📅 ${exif.dateTime}\n`;
            }
            if (exif.dateTimeOriginal) {
                nodeData.exifDateTimeOriginal = exif.dateTimeOriginal;
                if (!exif.dateTime) { // Only add if dateTime wasn't already added
                    visibleText += `📅 ${exif.dateTimeOriginal}\n`;
                }
            }
            if (exif.make) nodeData.exifMake = exif.make;
            if (exif.model) nodeData.exifModel = exif.model;
            if (exif.orientation) nodeData.exifOrientation = exif.orientation;

            // Convert GPS coordinates if available
            if (exif.gpsLatitude && exif.gpsLongitude) {
                nodeData.gpsLatitude = convertGPSToDecimal(exif.gpsLatitude, exif.gpsLatitudeRef);
                nodeData.gpsLongitude = convertGPSToDecimal(exif.gpsLongitude, exif.gpsLongitudeRef);
                visibleText += `📍 ${nodeData.gpsLatitude.toFixed(6)}, ${nodeData.gpsLongitude.toFixed(6)}\n`;
                console.log(`📍 GPS coordinates: ${nodeData.gpsLatitude}, ${nodeData.gpsLongitude}`);
            }
        }

        // Add PDF metadata if available (for PDFs)
        if (imageData.metadata.pdf) {
            const pdf = imageData.metadata.pdf;

            // Add title to visible text
            if (pdf.title) {
                nodeData.pdfTitle = pdf.title;
                visibleText += `📄 ${pdf.title}\n`;
            }

            // Add author to visible text
            if (pdf.author) {
                nodeData.pdfAuthor = pdf.author;
                visibleText += `✍️ ${pdf.author}\n`;
            }

            // Extract and display year from creation date
            if (pdf.creationDate) {
                nodeData.pdfCreationDate = pdf.creationDate;
                // PDF dates are in format: D:20240819143000+02'00' or similar
                const yearMatch = pdf.creationDate.match(/D:(\d{4})/);
                if (yearMatch) {
                    visibleText += `📅 ${yearMatch[1]}\n`;
                }
            }

            if (pdf.subject) nodeData.pdfSubject = pdf.subject;
            if (pdf.keywords) nodeData.pdfKeywords = pdf.keywords;
            if (pdf.creator) nodeData.pdfCreator = pdf.creator;
            if (pdf.producer) nodeData.pdfProducer = pdf.producer;
            if (pdf.modificationDate) nodeData.pdfModificationDate = pdf.modificationDate;
            if (pdf.pdfVersion) nodeData.pdfVersion = pdf.pdfVersion;
        }

        // Add page information if from PDF
        if (imageData.metadata.pageNumber) {
            nodeData.pageNumber = imageData.metadata.pageNumber;
            nodeData.totalPages = imageData.metadata.totalPages;
        }
    }

    // Set the visible text as annotation and searchable text
    if (visibleText.trim()) {
        nodeData.annotation = visibleText.trim();
        nodeData.searchableText = visibleText.toLowerCase();
    }

    cy.add({
        group: 'nodes',
        data: nodeData,
        position: position
    });

    console.log(`📷 Created image node: ${filename} (${Math.round(imageData.data.length/1024)} KB) - ${imageData.width}x${imageData.height} → ${displayWidth}x${displayHeight}`);
    if (imageData.metadata) {
        console.log(`📋 Metadata attached:`, imageData.metadata);
    }
}

// Helper function to convert GPS coordinates from EXIF format to decimal
function convertGPSToDecimal(gpsArray, ref) {
    if (!gpsArray || gpsArray.length !== 3) return null;

    const degrees = gpsArray[0];
    const minutes = gpsArray[1];
    const seconds = gpsArray[2];

    let decimal = degrees + (minutes / 60) + (seconds / 3600);

    // Apply direction (S and W are negative)
    if (ref === 'S' || ref === 'W') {
        decimal = -decimal;
    }

    return decimal;
}

// Process PDF file and convert all pages to image nodes
async function processPdfFile(file, qualityPreset = 'low') {
    // Quality settings based on preset
    const qualitySettings = {
        low: {
            scale: 2.0,
            finalWidth: 800,
            webpQuality: 0.70
        },
        normal: {
            scale: 3.0,
            finalWidth: 1400,
            webpQuality: 0.85
        }
    };

    const settings = qualitySettings[qualityPreset] || qualitySettings.low;

    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const searchInfo = document.getElementById('searchInfo');
    if (searchInfo) {
        searchInfo.textContent = `📄 Bearbetar PDF: ${file.name}...`;
        searchInfo.classList.add('visible');
    }

    try {
        // Extract basic file metadata
        const fileMetadata = {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileLastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
        };

        // Load the PDF file
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        const numPages = pdf.numPages;

        // Extract PDF metadata
        let pdfMetadata = null;
        try {
            const metadata = await pdf.getMetadata();
            if (metadata && metadata.info) {
                pdfMetadata = {
                    title: metadata.info.Title || null,
                    author: metadata.info.Author || null,
                    subject: metadata.info.Subject || null,
                    keywords: metadata.info.Keywords || null,
                    creator: metadata.info.Creator || null,
                    producer: metadata.info.Producer || null,
                    creationDate: metadata.info.CreationDate || null,
                    modificationDate: metadata.info.ModDate || null,
                    pdfVersion: metadata.info.PDFFormatVersion || null
                };
                console.log('📄 PDF metadata extracted:', pdfMetadata);
            }
        } catch (metaError) {
            console.warn('PDF metadata extraction failed:', metaError);
        }

        if (searchInfo) {
            searchInfo.textContent = `📄 Konverterar ${numPages} sidor från ${file.name}...`;
            searchInfo.classList.add('visible');
        }

        // Process each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            // Get viewport with scale for good quality
            const viewport = page.getViewport({scale: settings.scale});

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

            // Scale down to configured width
            const finalCanvas = document.createElement('canvas');
            const finalCtx = finalCanvas.getContext('2d');
            const ratio = settings.finalWidth / canvas.width;
            finalCanvas.width = settings.finalWidth;
            finalCanvas.height = Math.round(canvas.height * ratio);

            finalCtx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);

            // Convert to base64 (WebP or PNG)
            let base64;
            let format = 'unknown';

            try {
                // Use quality from settings
                base64 = finalCanvas.toDataURL('image/webp', settings.webpQuality);
                if (base64.startsWith('data:image/webp')) {
                    format = `WebP ${Math.round(settings.webpQuality * 100)}%`;
                } else {
                    throw new Error('WebP not supported');
                }
            } catch {
                base64 = finalCanvas.toDataURL('image/png');
                format = 'PNG';
            }

            // Create image node for this page with full metadata
            const imageData = {
                data: base64,
                width: finalCanvas.width,
                height: finalCanvas.height,
                originalName: `${file.name} - Sida ${pageNum}`,
                metadata: {
                    ...fileMetadata,
                    pdf: pdfMetadata,
                    pageNumber: pageNum,
                    totalPages: numPages
                }
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
        const rawText = response.candidates[0].content.parts[0].text;
        console.log('DEBUG: Gemini API raw text:', rawText);

        // Parse JSON response from Gemini
        let parsedData;
        try {
            // Try to extract JSON if wrapped in markdown code blocks
            const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/```\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1] : rawText;
            parsedData = JSON.parse(jsonText.trim());
        } catch (parseError) {
            console.warn('Failed to parse JSON, falling back to raw text:', parseError);
            // Fallback: use raw text
            parsedData = {
                text: rawText,
                metadata: {},
                hashtags: []
            };
        }

        console.log('DEBUG: Parsed OCR data:', parsedData);

        // Build visible text: transcription OR description + hashtags
        const hashtagText = parsedData.hashtags && parsedData.hashtags.length > 0
            ? '\n\n' + parsedData.hashtags.map(tag => tag.startsWith('#') ? tag : '#' + tag).join(' ')
            : '';

        // Use text if available, otherwise use description (for images without text)
        let mainContent = parsedData.text || '';
        if (!mainContent && parsedData.description) {
            mainContent = parsedData.description;
        }
        const visibleText = mainContent + hashtagText;

        // Save visible text as annotation
        node.data('annotation', visibleText);
        node.data('searchableText', visibleText.toLowerCase());

        // Save description separately if present
        if (parsedData.description) {
            node.data('imageDescription', parsedData.description);
        }

        // Save extracted metadata to node.data() (hidden from view, stored in JSON)
        if (parsedData.metadata) {
            if (parsedData.metadata.extractedDate) {
                node.data('extractedDate', parsedData.metadata.extractedDate);
            }
            if (parsedData.metadata.extractedTime) {
                node.data('extractedTime', parsedData.metadata.extractedTime);
            }
            if (parsedData.metadata.extractedDateTime) {
                node.data('extractedDateTime', parsedData.metadata.extractedDateTime);
            }
            if (parsedData.metadata.extractedPeople && parsedData.metadata.extractedPeople.length > 0) {
                node.data('extractedPeople', parsedData.metadata.extractedPeople);
            }
            if (parsedData.metadata.extractedPlaces && parsedData.metadata.extractedPlaces.length > 0) {
                node.data('extractedPlaces', parsedData.metadata.extractedPlaces);
            }
        }

        // Save hashtags separately for easy filtering
        if (parsedData.hashtags && parsedData.hashtags.length > 0) {
            node.data('extractedHashtags', parsedData.hashtags);
        }

        // TODO: Later we'll also add file metadata here:
        // node.data('fileName', fileName);
        // node.data('fileCreatedDate', exifDate);
        // node.data('gpsLatitude', exifGPS.lat);
        // node.data('gpsLongitude', exifGPS.lon);
        // node.data('pdfAuthor', pdfMetadata.author);
        // etc.

        if (statusDiv) {
            statusDiv.textContent = '✅ Image read successfully!';
            setTimeout(() => {
                statusDiv.classList.remove('visible');
            }, 3000);
        }

        // Refresh the card to show the new text
        cy.style().update();
        console.log('DEBUG: Card updated with parsed OCR data and metadata.');

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
                    { text: `Transkribera texten från bilden exakt som den är skriven och extrahera metadata.

OM BILDEN INTE HAR NÅGON TEXT: Beskriv kort vad bilden visar (1-2 meningar).

VIKTIGT: Svara ENDAST med en JSON-struktur enligt detta format:

{
  "text": "[transkriberad text här, eller tom sträng om ingen text]",
  "description": "[kort bildbeskrivning om ingen text finns, annars null]",
  "metadata": {
    "extractedDate": "YYYY-MM-DD eller null",
    "extractedTime": "HH:MM eller null",
    "extractedDateTime": "YYYY-MM-DDTHH:MM eller null (kombinera datum+tid)",
    "extractedPeople": ["person1", "person2"] eller [],
    "extractedPlaces": ["plats1", "plats2"] eller []
  },
  "hashtags": ["tag1", "tag2", "tag3"]
}

HASHTAG-REGLER:
1. Datumtaggar: Om datum hittas, skapa #YYMMDD (ex: #250819 för 2025-08-19)
2. Veckotaggar: Om datum känt, skapa #YYvVV (ex: #25v44 för vecka 44, 2025)
3. Kategoritaggar: #möte #anteckning #todo #faktura #kontrakt #brev #kvitto #foto etc
4. Namntaggar: Personer som nämns, normaliserade (ex: #smith #jones)
5. Platstaggar: Platser som nämns (ex: #stockholm #kontoret)

METADATA-INSTRUKTIONER:
- extractedDate: Extrahera datum från SYNLIG text i bilden (YYYY-MM-DD format)
- extractedTime: Extrahera tid från SYNLIG text (HH:MM format)
- extractedDateTime: Om både datum OCH tid finns, kombinera till ISO-format (YYYY-MM-DDTHH:MM)
- extractedPeople: Lista alla personnamn som nämns i texten
- extractedPlaces: Lista alla platser/adresser som nämns

BESKRIVNING-INSTRUKTIONER:
- Om bilden INTE har någon läsbar text: Beskriv kort vad som visas (ex: "En solnedgång över havet", "En katt på en soffa")
- Om bilden HAR text: Sätt description till null
- Håll beskrivningen kort och koncis (max 2 meningar)

OBS: Vi kommer senare även lägga till EXIF-metadata från filen (GPS, filskapare, originaldatum etc), så håll strukturen ren.` },
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

// ============================================================================
// Global exports - Make functions available to other scripts
// ============================================================================
window.showQualityDialog = showQualityDialog;
window.handleImageFiles = handleImageFiles;