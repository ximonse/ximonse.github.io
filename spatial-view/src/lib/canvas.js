/**
 * Canvas module using Konva.js
 */

import Konva from 'konva';
import { getAllCards, updateCard, createCard, deleteCard } from './storage.js';
import { processImage } from '../utils/image-processing.js';

let stage = null;
let layer = null;
let isPanning = false;
let cardGroups = new Map(); // Map cardId -> Konva.Group

/**
 * Initialize Konva canvas
 */
export async function initCanvas() {
  const container = document.getElementById('canvas-container');
  
  if (!container) {
    console.error('Canvas container not found');
    return;
  }
  
  // Create stage
  stage = new Konva.Stage({
    container: 'canvas-container',
    width: container.clientWidth,
    height: container.clientHeight,
    draggable: false
  });
  
  // Create main layer
  layer = new Konva.Layer();
  stage.add(layer);
  
  // Load cards from storage
  await loadCards();
  
  // Setup event listeners
  setupCanvasEvents();

  // Setup image drag-and-drop
  setupImageDragDrop();

  console.log('Konva canvas initialized');
}

/**
 * Load cards from storage and render
 */
async function loadCards() {
  const cards = await getAllCards();
  
  for (const card of cards) {
    renderCard(card);
  }
  
  layer.batchDraw();
}

/**
 * Render a single card on canvas
 */
function renderCard(cardData) {
  const group = new Konva.Group({
    x: cardData.position?.x || 100,
    y: cardData.position?.y || 100,
    draggable: true
  });

  if (cardData.image) {
    // Image card
    renderImageCard(group, cardData);
  } else {
    // Text card
    renderTextCard(group, cardData);
  }

  // Store card ID on group
  group.setAttr('cardId', cardData.id);

  // Click to select (for deletion)
  const background = group.findOne('Rect');
  group.on('click', function() {
    const isSelected = this.hasName('selected');

    if (isSelected) {
      this.removeName('selected');
      background.stroke('#e0e0e0');
      background.strokeWidth(1);
    } else {
      this.addName('selected');
      background.stroke('#2196F3');
      background.strokeWidth(3);
    }

    layer.batchDraw();
  });

  layer.add(group);
  cardGroups.set(cardData.id, group);
}

/**
 * Render text card
 */
function renderTextCard(group, cardData) {
  // Background
  const background = new Konva.Rect({
    width: 200,
    height: 150,
    fill: '#ffffff',
    stroke: '#e0e0e0',
    strokeWidth: 1,
    cornerRadius: 8,
    shadowColor: 'black',
    shadowBlur: 10,
    shadowOpacity: 0.1,
    shadowOffset: { x: 0, y: 2 }
  });

  // Text
  const text = new Konva.Text({
    text: cardData.text || '',
    x: 16,
    y: 16,
    width: 168,
    fontSize: 16,
    fontFamily: 'sans-serif',
    fill: '#1a1a1a',
    wrap: 'word'
  });

  group.add(background);
  group.add(text);
}

/**
 * Render image card
 */
function renderImageCard(group, cardData) {
  const imageObj = new Image();
  const imageData = cardData.image;

  imageObj.onload = function() {
    // Calculate card dimensions (maintain aspect ratio)
    const maxWidth = 300;
    const maxHeight = 300;
    let width = imageObj.naturalWidth;
    let height = imageObj.naturalHeight;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = width * ratio;
      height = height * ratio;
    }

    // Background/border
    const background = new Konva.Rect({
      width: width,
      height: height,
      fill: '#ffffff',
      stroke: '#e0e0e0',
      strokeWidth: 1,
      cornerRadius: 8,
      shadowColor: 'black',
      shadowBlur: 10,
      shadowOpacity: 0.1,
      shadowOffset: { x: 0, y: 2 }
    });

    // Image
    const konvaImage = new Konva.Image({
      image: imageObj,
      width: width,
      height: height,
      cornerRadius: 8
    });

    // Text overlay if exists
    if (cardData.text) {
      const textBg = new Konva.Rect({
        y: height - 40,
        width: width,
        height: 40,
        fill: 'rgba(0, 0, 0, 0.7)',
        cornerRadius: [0, 0, 8, 8]
      });

      const text = new Konva.Text({
        text: cardData.text,
        y: height - 35,
        x: 10,
        width: width - 20,
        fontSize: 14,
        fontFamily: 'sans-serif',
        fill: '#ffffff',
        wrap: 'word',
        ellipsis: true
      });

      group.add(background);
      group.add(konvaImage);
      group.add(textBg);
      group.add(text);
    } else {
      group.add(background);
      group.add(konvaImage);
    }

    layer.batchDraw();
  };

  imageObj.src = imageData.base64;
}

/**
 * Create new card
 */
async function createNewCard(position) {
  const text = prompt('Skriv kortets text:');
  if (!text) return;

  const cardId = await createCard({
    text,
    tags: [],
    position
  });

  // Reload canvas to show new card
  await reloadCanvas();
}

/**
 * Open edit dialog for card
 */
async function openEditDialog(cardId) {
  const card = await getAllCards().then(cards => cards.find(c => c.id === cardId));
  if (!card) return;

  const newText = prompt('Redigera text:', card.text);
  if (newText === null) return; // Cancelled

  await updateCard(cardId, { text: newText });
  await reloadCanvas();
}

/**
 * Delete card
 */
async function handleDeleteCard(cardId) {
  if (!confirm('Vill du ta bort detta kort?')) return;

  await deleteCard(cardId);

  // Remove from canvas
  const group = cardGroups.get(cardId);
  if (group) {
    group.destroy();
    cardGroups.delete(cardId);
    layer.batchDraw();
  }
}

/**
 * Reload canvas from storage
 */
async function reloadCanvas() {
  // Clear existing cards
  cardGroups.forEach(group => group.destroy());
  cardGroups.clear();

  // Reload from storage
  await loadCards();
}

/**
 * Setup canvas events
 */
function setupCanvasEvents() {
  // Handle window resize
  window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    if (container && stage) {
      stage.width(container.clientWidth);
      stage.height(container.clientHeight);
    }
  });

  // Zoom with mouse wheel
  stage.on('wheel', (e) => {
    e.evt.preventDefault();

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const scaleBy = 1.05;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit zoom between 0.1x and 5x
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    stage.scale({ x: clampedScale, y: clampedScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    stage.position(newPos);
    stage.batchDraw();
  });

  // Pan with middle mouse or space+drag
  stage.on('mousedown', (e) => {
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.shiftKey)) {
      isPanning = true;
      stage.draggable(true);
      stage.container().style.cursor = 'grabbing';
    }
  });

  stage.on('mouseup', () => {
    isPanning = false;
    stage.draggable(false);
    stage.container().style.cursor = 'default';
  });

  // Save card position when dragged
  stage.on('dragend', (e) => {
    const target = e.target;
    if (target.getAttr('cardId')) {
      const cardId = target.getAttr('cardId');
      const position = { x: target.x(), y: target.y() };

      updateCard(cardId, { position });
    }
  });

  // Double-click to edit card
  stage.on('dblclick dbltap', (e) => {
    const target = e.target;
    if (target.parent && target.parent.getAttr('cardId')) {
      const cardId = target.parent.getAttr('cardId');
      openEditDialog(cardId);
    } else if (target === stage) {
      // Double-click on canvas to create new card
      const pointer = stage.getPointerPosition();
      const scale = stage.scaleX();
      const position = {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale
      };
      createNewCard(position);
    }
  });

  // Delete card with Delete key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selectedNodes = layer.find('.selected');
      selectedNodes.forEach(async (node) => {
        if (node.getAttr('cardId')) {
          const cardId = node.getAttr('cardId');
          await handleDeleteCard(cardId);
        }
      });
    }
  });
}

/**
 * Get stage instance
 */
export function getStage() {
  return stage;
}

/**
 * Get main layer
 */
export function getLayer() {
  return layer;
}

/**
 * Add new card (exported for external use)
 */
export async function addNewCard() {
  const pointer = stage.getPointerPosition() || { x: stage.width() / 2, y: stage.height() / 2 };
  const scale = stage.scaleX();
  const position = {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale
  };

  await createNewCard(position);
}

/**
 * Export canvas state as JSON
 */
export async function exportCanvas() {
  const cards = await getAllCards();
  const exportData = {
    type: 'full',
    version: '1.0',
    exportedAt: Date.now(),
    cards,
    viewport: {
      x: stage.x(),
      y: stage.y(),
      scale: stage.scaleX()
    }
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `spatial-view-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Import image and create card
 */
export async function importImage(quality = 'normal') {
  return new Promise((resolve, reject) => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    // Check if mobile device for camera option
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile) {
      input.capture = 'environment'; // Use rear camera
    }

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) {
        resolve([]);
        return;
      }

      try {
        const cardIds = [];

        for (const file of files) {
          // Process image
          const processed = await processImage(file, quality);

          // Calculate position (stagger multiple images)
          const pointer = stage.getPointerPosition() || { x: stage.width() / 2, y: stage.height() / 2 };
          const scale = stage.scaleX();
          const offset = cardIds.length * 50; // Stagger by 50px
          const position = {
            x: ((pointer.x - stage.x()) / scale) + offset,
            y: ((pointer.y - stage.y()) / scale) + offset
          };

          // Create card with image
          const cardId = await createCard({
            text: processed.metadata.fileName,
            tags: ['bild'],
            position,
            image: {
              base64: processed.base64,
              width: processed.metadata.width,
              height: processed.metadata.height,
              quality: processed.metadata.quality
            },
            metadata: processed.metadata
          });

          cardIds.push(cardId);
        }

        // Reload canvas to show new cards
        await reloadCanvas();

        resolve(cardIds);
      } catch (error) {
        console.error('Image import failed:', error);
        reject(error);
      }
    };

    input.click();
  });
}

/**
 * Setup drag-and-drop for images
 */
export function setupImageDragDrop() {
  const container = stage.container();

  // Prevent default drag behavior
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.style.border = '3px dashed #2196F3';
  });

  container.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.style.border = 'none';
  });

  // Handle drop
  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.style.border = 'none';

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));

    if (files.length === 0) return;

    try {
      const quality = 'normal'; // TODO: Add quality selector dialog

      for (const file of files) {
        const processed = await processImage(file, quality);

        // Get drop position
        const pointer = stage.getPointerPosition();
        const scale = stage.scaleX();
        const position = {
          x: (pointer.x - stage.x()) / scale,
          y: (pointer.y - stage.y()) / scale
        };

        await createCard({
          text: processed.metadata.fileName,
          tags: ['bild'],
          position,
          image: {
            base64: processed.base64,
            width: processed.metadata.width,
            height: processed.metadata.height,
            quality: processed.metadata.quality
          },
          metadata: processed.metadata
        });
      }

      await reloadCanvas();
    } catch (error) {
      console.error('Drag-drop import failed:', error);
      alert('Misslyckades att importera bild: ' + error.message);
    }
  });

  console.log('Drag-and-drop enabled for images');
}
