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

// Undo/redo stacks
let undoStack = [];
let redoStack = [];
const MAX_UNDO_STACK = 50;

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

  const cardData = {
    text,
    tags: [],
    position
  };

  const cardId = await createCard(cardData);

  // Add to undo stack
  pushUndo({
    type: 'create',
    cardId,
    card: cardData
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
  if (newText === card.text) return; // No change

  // Add to undo stack
  pushUndo({
    type: 'update',
    cardId,
    oldData: { text: card.text },
    newData: { text: newText }
  });

  await updateCard(cardId, { text: newText });
  await reloadCanvas();
}

/**
 * Delete card
 */
async function handleDeleteCard(cardId) {
  // Get card data before deletion (for undo)
  const cards = await getAllCards();
  const card = cards.find(c => c.id === cardId);

  if (card) {
    // Add to undo stack
    pushUndo({
      type: 'delete',
      card: { ...card }
    });
  }

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
 * Undo/redo functions
 */
function pushUndo(action) {
  undoStack.push(action);
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }
  redoStack = []; // Clear redo stack on new action
}

async function undo() {
  if (undoStack.length === 0) {
    console.log('Nothing to undo');
    return;
  }

  const action = undoStack.pop();
  redoStack.push(action);

  if (action.type === 'delete') {
    // Restore deleted card
    const cardId = await createCard(action.card);
    await reloadCanvas();
    console.log('Undo: Restored deleted card');
  } else if (action.type === 'create') {
    // Delete created card
    await deleteCard(action.cardId);
    await reloadCanvas();
    console.log('Undo: Deleted created card');
  } else if (action.type === 'update') {
    // Restore old values
    await updateCard(action.cardId, action.oldData);
    await reloadCanvas();
    console.log('Undo: Restored old card data');
  }
}

async function redo() {
  if (redoStack.length === 0) {
    console.log('Nothing to redo');
    return;
  }

  const action = redoStack.pop();
  undoStack.push(action);

  if (action.type === 'delete') {
    // Re-delete card
    await deleteCard(action.card.id);
    await reloadCanvas();
    console.log('Redo: Re-deleted card');
  } else if (action.type === 'create') {
    // Re-create card
    const cardId = await createCard(action.card);
    await reloadCanvas();
    console.log('Redo: Re-created card');
  } else if (action.type === 'update') {
    // Re-apply new values
    await updateCard(action.cardId, action.newData);
    await reloadCanvas();
    console.log('Redo: Re-applied new card data');
  }
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

  // Global keyboard shortcuts
  window.addEventListener('keydown', async (e) => {
    // Ignore if typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Ctrl+Z - Undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      await undo();
      return;
    }

    // Ctrl+Y - Redo
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      await redo();
      return;
    }

    // S - Save (export)
    if (e.key === 's' && !e.ctrlKey) {
      e.preventDefault();
      await exportCanvas();
      console.log('Canvas exported');
      return;
    }

    // N - New text card
    if (e.key === 'n') {
      e.preventDefault();
      const pointer = stage.getPointerPosition() || { x: stage.width() / 2, y: stage.height() / 2 };
      const scale = stage.scaleX();
      const position = {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale
      };
      await createNewCard(position);
      return;
    }

    // I - Import image
    if (e.key === 'i') {
      e.preventDefault();
      await importImage();
      return;
    }

    // F - Focus search
    if (e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

    // C - Command palette
    if (e.key === 'c') {
      e.preventDefault();
      showCommandPalette();
      return;
    }

    // Delete/Backspace - Delete selected cards
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const selectedNodes = layer.find('.selected');
      for (const node of selectedNodes) {
        if (node.getAttr('cardId')) {
          const cardId = node.getAttr('cardId');
          await handleDeleteCard(cardId);
        }
      }
      return;
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
export async function importImage() {
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

      // Show quality selector dialog AFTER files are chosen
      const quality = await showQualityDialog(files.length);
      if (!quality) {
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
 * Show command palette
 */
function showCommandPalette() {
  const commands = [
    { key: 'N', icon: '📝', name: 'Nytt text-kort', desc: 'Skapa nytt text-kort vid muspekare', action: async () => {
      const pointer = stage.getPointerPosition() || { x: stage.width() / 2, y: stage.height() / 2 };
      const scale = stage.scaleX();
      const position = {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale
      };
      await createNewCard(position);
    }},
    { key: 'I', icon: '🖼️', name: 'Importera bild', desc: 'Öppna filväljare för att importera bilder', action: async () => {
      await importImage();
    }},
    { key: 'F', icon: '🔍', name: 'Sök kort', desc: 'Fokusera sökfältet', action: () => {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }},
    { key: 'S', icon: '💾', name: 'Spara/Exportera', desc: 'Exportera canvas till JSON-fil', action: async () => {
      await exportCanvas();
    }},
    { key: 'Delete', icon: '🗑️', name: 'Ta bort kort', desc: 'Ta bort markerade kort', action: async () => {
      const selectedNodes = layer.find('.selected');
      for (const node of selectedNodes) {
        if (node.getAttr('cardId')) {
          const cardId = node.getAttr('cardId');
          await handleDeleteCard(cardId);
        }
      }
    }},
    { key: 'Ctrl+Z', icon: '↶', name: 'Ångra', desc: 'Ångra senaste ändring', action: async () => {
      await undo();
    }},
    { key: 'Ctrl+Y', icon: '↷', name: 'Gör om', desc: 'Gör om ångrad ändring', action: async () => {
      await redo();
    }},
    { key: 'Scroll', icon: '🔍', name: 'Zooma', desc: 'Zooma in/ut med mushjulet', action: null },
    { key: 'Shift+Drag', icon: '✋', name: 'Panorera', desc: 'Panorera canvas genom att hålla Shift och dra', action: null },
    { key: 'Double-click', icon: '✏️', name: 'Redigera kort', desc: 'Dubbelklicka på kort för att redigera', action: null },
    { key: 'Drag', icon: '🔄', name: 'Flytta kort', desc: 'Dra kort för att flytta dem', action: null },
  ];

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 10000;
    padding-top: 80px;
    overflow-y: auto;
  `;

  // Create command palette
  const palette = document.createElement('div');
  palette.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 600px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-height: 80vh;
    overflow-y: auto;
  `;

  palette.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 24px; color: #1a1a1a;">
        ⌘ Command Palette
      </h2>
      <span style="color: #999; font-size: 14px;">Tryck ESC för att stänga</span>
    </div>

    <div id="command-list" style="display: flex; flex-direction: column; gap: 8px;">
      ${commands.map((cmd, idx) => `
        <div class="command-item" data-index="${idx}" style="
          padding: 16px;
          background: ${cmd.action ? '#f5f5f5' : '#fafafa'};
          border-radius: 8px;
          cursor: ${cmd.action ? 'pointer' : 'default'};
          transition: all 0.15s;
          border: 2px solid transparent;
          display: flex;
          align-items: center;
          gap: 16px;
        ">
          <div style="font-size: 24px; flex-shrink: 0;">
            ${cmd.icon}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 16px; color: #1a1a1a; margin-bottom: 2px;">
              ${cmd.name}
            </div>
            <div style="font-size: 13px; color: #666;">
              ${cmd.desc}
            </div>
          </div>
          <div style="
            background: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #666;
            font-family: monospace;
            white-space: nowrap;
            flex-shrink: 0;
          ">
            ${cmd.key}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  overlay.appendChild(palette);
  document.body.appendChild(overlay);

  // Add hover and click effects
  const commandItems = palette.querySelectorAll('.command-item');
  commandItems.forEach((item, idx) => {
    const cmd = commands[idx];

    if (cmd.action) {
      item.addEventListener('mouseenter', () => {
        item.style.background = '#e3f2fd';
        item.style.borderColor = '#2196F3';
        item.style.transform = 'scale(1.01)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.background = '#f5f5f5';
        item.style.borderColor = 'transparent';
        item.style.transform = 'scale(1)';
      });

      item.addEventListener('click', async () => {
        cleanup();
        await cmd.action();
      });
    }
  });

  // Cleanup function
  const cleanup = () => {
    document.body.removeChild(overlay);
  };

  // ESC to close
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      cleanup();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  // Click overlay to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cleanup();
      document.removeEventListener('keydown', handleEsc);
    }
  });
}

/**
 * Show quality selector dialog
 */
function showQualityDialog(fileCount) {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 32px;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    dialog.innerHTML = `
      <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #1a1a1a;">
        Välj kvalitet
      </h2>
      <p style="margin: 0 0 24px 0; color: #666; font-size: 16px;">
        ${fileCount} ${fileCount === 1 ? 'bild vald' : 'bilder valda'}
      </p>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button id="quality-normal" style="
          padding: 20px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: transform 0.1s;
        ">
          <div style="font-size: 18px; margin-bottom: 4px;">📸 Rimlig för stor skärm</div>
          <div style="font-size: 14px; opacity: 0.9;">1200px, hög kvalitet (rekommenderad)</div>
        </button>

        <button id="quality-low" style="
          padding: 20px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: transform 0.1s;
        ">
          <div style="font-size: 18px; margin-bottom: 4px;">✍️ Anpassad för anteckningar</div>
          <div style="font-size: 14px; opacity: 0.9;">700px, optimerad för vit bakgrund</div>
        </button>

        <button id="quality-cancel" style="
          padding: 12px;
          background: transparent;
          color: #666;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        ">
          Avbryt
        </button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Add hover effects
    const buttons = dialog.querySelectorAll('button[id^="quality-"]');
    buttons.forEach(btn => {
      if (btn.id !== 'quality-cancel') {
        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'scale(1.02)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'scale(1)';
        });
      }
    });

    // Handle button clicks
    const cleanup = (quality) => {
      document.body.removeChild(overlay);
      resolve(quality);
    };

    dialog.querySelector('#quality-normal').addEventListener('click', () => cleanup('normal'));
    dialog.querySelector('#quality-low').addEventListener('click', () => cleanup('low'));
    dialog.querySelector('#quality-cancel').addEventListener('click', () => cleanup(null));

    // ESC to cancel
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        cleanup(null);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
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
      // Show quality selector dialog
      const quality = await showQualityDialog(files.length);
      if (!quality) return;

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
