/**
 * Canvas module using Konva.js
 */

import Konva from 'konva';
import { getAllCards, updateCard, createCard, deleteCard } from './storage.js';
import { processImage } from '../utils/image-processing.js';
import {
  arrangeVertical,
  arrangeHorizontal,
  arrangeGrid,
  arrangeCluster,
  arrangeGridVertical,
  arrangeGridHorizontal,
  arrangeGridTopAligned
} from './arrangement.js';

let stage = null;
let layer = null;
let isPanning = false;
let cardGroups = new Map(); // Map cardId -> Konva.Group

// Selection rectangle
let selectionRectangle = null;
let selectionStartPos = null;
let isSelecting = false;

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

  // Create selection rectangle (hidden by default)
  selectionRectangle = new Konva.Rect({
    fill: 'rgba(33, 150, 243, 0.1)',
    stroke: '#2196F3',
    strokeWidth: 1,
    visible: false
  });
  layer.add(selectionRectangle);

  // Load cards from storage
  await loadCards();

  // Setup event listeners
  setupCanvasEvents();

  // Setup image drag-and-drop
  setupImageDragDrop();

  // Create floating buttons
  createFitAllButton();
  createAddButton();

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
  group.on('click', function() {
    const isSelected = this.hasName('selected');
    const background = this.findOne('Rect');

    if (isSelected) {
      this.removeName('selected');
      if (background) {
        background.stroke('#e0e0e0');
        background.strokeWidth(1);
      }
    } else {
      this.addName('selected');
      if (background) {
        background.stroke('#2196F3');
        background.strokeWidth(3);
      }
    }

    layer.batchDraw();
  });

  // Touch long-press to flip image cards
  if (cardData.image) {
    let touchTimer = null;
    let touchStartPos = null;

    group.on('touchstart', function(e) {
      const pos = this.position();
      touchStartPos = { x: pos.x, y: pos.y };

      touchTimer = setTimeout(async () => {
        // Check if card hasn't moved (not dragging)
        const currentPos = this.position();
        const moved = Math.abs(currentPos.x - touchStartPos.x) > 5 ||
                      Math.abs(currentPos.y - touchStartPos.y) > 5;

        if (!moved) {
          await flipCard(cardData.id);
          touchTimer = null;
        }
      }, 500); // 500ms long press
    });

    group.on('touchend touchcancel', function() {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });

    group.on('dragstart', function() {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });
  }

  // Group drag - move all selected cards together
  let dragStartPositions = null;

  group.on('dragstart', function() {
    const isSelected = this.hasName('selected');

    if (isSelected) {
      // Save positions of all selected cards
      dragStartPositions = new Map();
      const selectedNodes = layer.find('.selected');

      selectedNodes.forEach(node => {
        if (node !== this && node.getAttr('cardId')) {
          dragStartPositions.set(node, {
            x: node.x(),
            y: node.y()
          });
        }
      });
    }
  });

  group.on('dragmove', function() {
    if (dragStartPositions && dragStartPositions.size > 0) {
      // Calculate delta from this card's movement
      const currentPos = this.position();
      const startPos = { x: this.getAttr('startX'), y: this.getAttr('startY') };

      // Store start position on first move
      if (startPos.x === undefined) {
        this.setAttr('startX', currentPos.x);
        this.setAttr('startY', currentPos.y);
        return;
      }

      const delta = {
        x: currentPos.x - startPos.x,
        y: currentPos.y - startPos.y
      };

      // Move all other selected cards by the same delta
      dragStartPositions.forEach((originalPos, node) => {
        node.position({
          x: originalPos.x + delta.x,
          y: originalPos.y + delta.y
        });
      });

      layer.batchDraw();
    }
  });

  group.on('dragend', function() {
    if (dragStartPositions && dragStartPositions.size > 0) {
      // Update all moved cards in database
      dragStartPositions.forEach(async (originalPos, node) => {
        const cardId = node.getAttr('cardId');
        if (cardId) {
          const position = { x: node.x(), y: node.y() };
          await updateCard(cardId, { position });
        }
      });

      dragStartPositions = null;
    }

    // Clear start position attributes
    this.setAttr('startX', undefined);
    this.setAttr('startY', undefined);
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
  const isFlipped = cardData.flipped || false;

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

    // Store dimensions on group for flip
    group.setAttr('cardWidth', width);
    group.setAttr('cardHeight', height);

    if (isFlipped) {
      // Show back side (text)
      const background = new Konva.Rect({
        width: width,
        height: height,
        fill: '#fffacd',
        stroke: '#e0e0e0',
        strokeWidth: 1,
        cornerRadius: 8,
        shadowColor: 'black',
        shadowBlur: 10,
        shadowOpacity: 0.1,
        shadowOffset: { x: 0, y: 2 }
      });

      const text = new Konva.Text({
        text: cardData.backText || 'Dubbelklicka för att redigera baksidan...',
        x: 16,
        y: 16,
        width: width - 32,
        height: height - 32,
        fontSize: 14,
        fontFamily: 'sans-serif',
        fill: '#1a1a1a',
        wrap: 'word',
        align: 'left',
        verticalAlign: 'top'
      });

      group.add(background);
      group.add(text);
    } else {
      // Show front side (image)
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

      const konvaImage = new Konva.Image({
        image: imageObj,
        width: width,
        height: height,
        cornerRadius: 8
      });

      group.add(background);
      group.add(konvaImage);

      // Tooltip on hover (show filename)
      group.on('mouseenter', function() {
        document.body.style.cursor = 'pointer';

        // Show tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'card-tooltip';
        tooltip.style.cssText = `
          position: fixed;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          z-index: 10001;
          pointer-events: none;
          font-family: sans-serif;
        `;
        tooltip.textContent = cardData.text || 'Bild';
        document.body.appendChild(tooltip);

        // Update tooltip position on mouse move
        const updateTooltip = (e) => {
          tooltip.style.left = (e.clientX + 10) + 'px';
          tooltip.style.top = (e.clientY + 10) + 'px';
        };

        stage.on('mousemove', updateTooltip);
        group.setAttr('tooltipHandler', updateTooltip);
      });

      group.on('mouseleave', function() {
        document.body.style.cursor = 'default';

        // Remove tooltip
        const tooltip = document.getElementById('card-tooltip');
        if (tooltip) {
          document.body.removeChild(tooltip);
        }

        // Remove mousemove handler
        const handler = group.getAttr('tooltipHandler');
        if (handler) {
          stage.off('mousemove', handler);
        }
      });
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
 * Inline text editor using HTML textarea overlay
 */
function createInlineEditor(cardId, group, currentText, isImageBack = false) {
  const cardGroup = cardGroups.get(cardId);
  if (!cardGroup) return;

  // Get card position and dimensions
  const background = group.findOne('Rect');
  if (!background) return;

  const width = background.width();
  const height = background.height();

  // Get absolute position on screen accounting for stage transform
  const transform = group.getAbsoluteTransform();
  const topLeft = transform.point({ x: 0, y: 0 });

  // Get stage container position
  const container = stage.container();
  const containerRect = container.getBoundingClientRect();

  const screenX = containerRect.left + topLeft.x;
  const screenY = containerRect.top + topLeft.y;

  const scale = stage.scaleX();

  // Create textarea overlay
  const textarea = document.createElement('textarea');
  textarea.value = currentText || '';

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const padding = 16;

  textarea.style.cssText = `
    position: fixed;
    left: ${screenX + padding}px;
    top: ${screenY + padding}px;
    width: ${scaledWidth - padding * 2}px;
    height: ${scaledHeight - 60}px;
    padding: 8px;
    font-size: 16px;
    font-family: sans-serif;
    border: 2px solid #2196F3;
    border-radius: 6px;
    resize: none;
    z-index: 10000;
    background: ${isImageBack ? '#fffacd' : '#ffffff'};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  `;

  // Create save button
  const saveBtn = document.createElement('button');
  saveBtn.textContent = isImageBack ? 'Spara & Vänd tillbaka' : 'Spara';
  saveBtn.style.cssText = `
    position: fixed;
    left: ${screenX + padding}px;
    top: ${screenY + scaledHeight - 44}px;
    padding: 8px 16px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 10001;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  `;

  const cleanup = () => {
    if (textarea.parentNode) document.body.removeChild(textarea);
    if (saveBtn.parentNode) document.body.removeChild(saveBtn);
  };

  saveBtn.addEventListener('click', async () => {
    const newText = textarea.value;

    if (isImageBack) {
      // Save back text and flip card back
      pushUndo({
        type: 'update',
        cardId,
        oldData: { backText: currentText },
        newData: { backText: newText }
      });

      await updateCard(cardId, { backText: newText });
      await flipCard(cardId); // Flip back to front
    } else {
      // Save text card content
      if (newText !== currentText) {
        pushUndo({
          type: 'update',
          cardId,
          oldData: { text: currentText },
          newData: { text: newText }
        });

        await updateCard(cardId, { text: newText });
        await reloadCanvas();
      }
    }

    cleanup();
  });

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      cleanup();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Save on Ctrl+Enter
  textarea.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      saveBtn.click();
    }
  });

  document.body.appendChild(textarea);
  document.body.appendChild(saveBtn);
  textarea.focus();
  textarea.select();
}

/**
 * Open edit dialog for card
 */
async function openEditDialog(cardId) {
  const cards = await getAllCards();
  const card = cards.find(c => c.id === cardId);
  if (!card) return;

  const group = cardGroups.get(cardId);
  if (!group) return;

  if (card.image && card.flipped) {
    // Flipped image card: inline edit back text
    createInlineEditor(cardId, group, card.backText || '', true);
  } else {
    // Text card: inline edit
    createInlineEditor(cardId, group, card.text || '', false);
  }
}

/**
 * Flip image card
 */
async function flipCard(cardId) {
  const cards = await getAllCards();
  const card = cards.find(c => c.id === cardId);

  if (!card || !card.image) return;

  const newFlipped = !card.flipped;

  pushUndo({
    type: 'update',
    cardId,
    oldData: { flipped: card.flipped },
    newData: { flipped: newFlipped }
  });

  await updateCard(cardId, { flipped: newFlipped });
  await reloadCanvas();

  // If flipping to back side, open editor automatically
  if (newFlipped) {
    setTimeout(() => {
      const group = cardGroups.get(cardId);
      if (group) {
        createInlineEditor(cardId, group, card.backText || '', true);
      }
    }, 100); // Small delay to let canvas reload
  }
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
 * Update selection based on selection rectangle
 */
function updateSelection() {
  const selBox = selectionRectangle.getClientRect();

  layer.find('.selected').forEach(group => {
    const background = group.findOne('Rect');
    group.removeName('selected');
    if (background) {
      background.stroke('#e0e0e0');
      background.strokeWidth(1);
    }
  });

  const groups = layer.getChildren(node => node.getAttr('cardId'));
  groups.forEach(group => {
    const groupBox = group.getClientRect();

    // Check if rectangles intersect
    if (Konva.Util.haveIntersection(selBox, groupBox)) {
      const background = group.findOne('Rect');
      group.addName('selected');
      if (background) {
        background.stroke('#2196F3');
        background.strokeWidth(3);
      }
    }
  });
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

  // Zoom with mouse wheel (faster: 2x speed)
  stage.on('wheel', (e) => {
    e.evt.preventDefault();

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const scaleBy = 1.1; // Was 1.05, now 1.1 for 2x faster zoom
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

  // Pan with middle mouse or Ctrl+drag
  // Selection rectangle with left-click drag on stage
  stage.on('mousedown', (e) => {
    // Ctrl+drag or middle mouse = pan
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.ctrlKey)) {
      isPanning = true;
      stage.draggable(true);
      stage.container().style.cursor = 'grabbing';
      return;
    }

    // Left click on stage (not on card) = start selection
    if (e.target === stage && e.evt.button === 0) {
      isSelecting = true;
      const pos = stage.getPointerPosition();
      const scale = stage.scaleX();
      selectionStartPos = {
        x: (pos.x - stage.x()) / scale,
        y: (pos.y - stage.y()) / scale
      };
      selectionRectangle.width(0);
      selectionRectangle.height(0);
      selectionRectangle.visible(true);
    }
  });

  stage.on('mousemove', () => {
    if (!isSelecting) return;

    const pos = stage.getPointerPosition();
    const scale = stage.scaleX();
    const currentPos = {
      x: (pos.x - stage.x()) / scale,
      y: (pos.y - stage.y()) / scale
    };

    const x = Math.min(selectionStartPos.x, currentPos.x);
    const y = Math.min(selectionStartPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - selectionStartPos.x);
    const height = Math.abs(currentPos.y - selectionStartPos.y);

    selectionRectangle.setAttrs({
      x: x,
      y: y,
      width: width,
      height: height
    });

    // Update selection
    updateSelection();
    layer.batchDraw();
  });

  stage.on('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      stage.draggable(false);
      stage.container().style.cursor = 'default';
    }

    if (isSelecting) {
      isSelecting = false;
      selectionRectangle.visible(false);
      layer.batchDraw();
    }
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

  // Double-click to edit card or flip image card
  stage.on('dblclick dbltap', async (e) => {
    const target = e.target;
    if (target.parent && target.parent.getAttr('cardId')) {
      const cardId = target.parent.getAttr('cardId');

      // Get card data to check if it's an image card
      const cards = await getAllCards();
      const card = cards.find(c => c.id === cardId);

      if (!card) return;

      if (card.image) {
        // Image card: always flip on double-click (toggle)
        await flipCard(cardId);
      } else {
        // Text card: open edit dialog
        openEditDialog(cardId);
      }
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

    // Ctrl+A - Select all cards
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      const allCards = layer.getChildren(node => node.getAttr('cardId'));
      allCards.forEach(group => {
        const background = group.findOne('Rect');
        group.addName('selected');
        if (background) {
          background.stroke('#2196F3');
          background.strokeWidth(3);
        }
      });
      layer.batchDraw();
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

    // V - Vertical arrangement
    if (e.key === 'v' && !e.ctrlKey) {
      e.preventDefault();
      await applyArrangement(arrangeVertical, 'Vertical');
      return;
    }

    // H - Horizontal arrangement
    if (e.key === 'h' && !e.ctrlKey) {
      e.preventDefault();
      await applyArrangement(arrangeHorizontal, 'Horizontal');
      return;
    }

    // G - Grid arrangement (or combo with next key)
    if (e.key === 'g' && !e.ctrlKey) {
      e.preventDefault();
      console.log('G pressed, waiting for combo key...');

      // Wait for next key press within 500ms
      let nextKeyTimeout = null;
      const keyHandler = async (e2) => {
        // Ignore if typing
        if (e2.target.tagName === 'INPUT' || e2.target.tagName === 'TEXTAREA') {
          return;
        }

        clearTimeout(nextKeyTimeout);
        document.removeEventListener('keydown', keyHandler);

        if (e2.key === 'v') {
          // G+V = Grid Vertical Columns
          e2.preventDefault();
          console.log('G+V pressed');
          await applyArrangement(arrangeGridVertical, 'Grid Vertical');
        } else if (e2.key === 'h') {
          // G+H = Grid Horizontal Packed
          e2.preventDefault();
          console.log('G+H pressed');
          await applyArrangement(arrangeGridHorizontal, 'Grid Horizontal');
        } else if (e2.key === 't') {
          // G+T = Grid Top Aligned
          e2.preventDefault();
          console.log('G+T pressed');
          await applyArrangement(arrangeGridTopAligned, 'Grid Top-Aligned');
        } else {
          // Just G = simple grid
          console.log('G alone pressed');
          await applyArrangement(arrangeGrid, 'Grid');
        }
      };

      document.addEventListener('keydown', keyHandler);

      // Timeout: if no second key, just do simple grid
      nextKeyTimeout = setTimeout(async () => {
        document.removeEventListener('keydown', keyHandler);
        console.log('G timeout, applying simple grid');
        await applyArrangement(arrangeGrid, 'Grid');
      }, 500);

      return;
    }

    // Q - Cluster arrangement
    if (e.key === 'q' && !e.ctrlKey) {
      e.preventDefault();
      await applyArrangement(arrangeCluster, 'Cluster');
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

/**
 * Fit all cards in view
 */
export function fitAllCards() {
  const cards = layer.find('.selected').length > 0
    ? layer.find('.selected')
    : layer.getChildren();

  if (cards.length === 0) {
    console.log('No cards to fit');
    return;
  }

  // Calculate bounding box for all cards
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  cards.forEach(card => {
    const box = card.getClientRect();
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  });

  const width = maxX - minX;
  const height = maxY - minY;

  // Add padding (10%)
  const padding = 0.1;
  const paddedWidth = width * (1 + padding * 2);
  const paddedHeight = height * (1 + padding * 2);

  // Calculate scale to fit
  const scaleX = stage.width() / paddedWidth;
  const scaleY = stage.height() / paddedHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x

  // Calculate center position
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  // Set new scale and position
  stage.scale({ x: scale, y: scale });
  stage.position({
    x: stage.width() / 2 - centerX * scale,
    y: stage.height() / 2 - centerY * scale
  });

  stage.batchDraw();
  console.log('Fitted all cards in view');
}

/**
 * Search and highlight cards
 * @param {string} query - Search query
 */
export async function searchCards(query) {
  if (!layer) return;

  const allCards = await getAllCards();
  const allGroups = layer.getChildren(node => node.getAttr('cardId'));

  if (!query || query.trim() === '') {
    // Clear search - reset all cards
    allGroups.forEach(group => {
      group.opacity(1);
      const background = group.findOne('Rect');
      if (!group.hasName('selected')) {
        if (background) {
          background.stroke('#e0e0e0');
          background.strokeWidth(1);
        }
      }
    });
    layer.batchDraw();
    return;
  }

  const lowerQuery = query.toLowerCase();
  const matchingCards = new Set();

  // Find matching cards
  allCards.forEach(card => {
    const text = (card.text || '').toLowerCase();
    const backText = (card.backText || '').toLowerCase();

    if (text.includes(lowerQuery) || backText.includes(lowerQuery)) {
      matchingCards.add(card.id);
    }
  });

  // Apply visual effects
  allGroups.forEach(group => {
    const cardId = group.getAttr('cardId');
    const background = group.findOne('Rect');
    const isMatch = matchingCards.has(cardId);

    if (isMatch) {
      // Matching card: mark and full opacity
      group.opacity(1);
      group.addName('selected');
      if (background) {
        background.stroke('#2196F3');
        background.strokeWidth(3);
      }
    } else {
      // Non-matching card: fade and remove selection
      group.opacity(0.3);
      group.removeName('selected');
      if (background) {
        background.stroke('#e0e0e0');
        background.strokeWidth(1);
      }
    }
  });

  layer.batchDraw();
  console.log(`Search: found ${matchingCards.size} matches for "${query}"`);
}

/**
 * Create "Fit All" button
 */
function createFitAllButton() {
  const button = document.createElement('button');
  button.id = 'fit-all-button';
  button.innerHTML = '🔍';
  button.title = 'Visa alla kort';
  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  button.addEventListener('click', fitAllCards);

  document.body.appendChild(button);
  console.log('Fit All button created');
}

/**
 * Create floating add button
 */
function createAddButton() {
  const button = document.createElement('button');
  button.id = 'add-button';
  button.innerHTML = '+';
  button.title = 'Nytt kort (N) | Långpress: Importera bild (I) | Extra lång: Command (C)';
  button.style.cssText = `
    position: fixed;
    bottom: 96px;
    right: 24px;
    width: 56px;
    height: 56px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 32px;
    font-weight: 300;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  `;

  let pressStartTime = null;

  const onPressStart = () => {
    pressStartTime = Date.now();
    button.style.transform = 'scale(0.95)';
  };

  const onPressEnd = () => {
    const pressDuration = Date.now() - pressStartTime;
    button.style.transform = 'scale(1)';

    // Determine action based on press duration
    if (pressDuration >= 1500) {
      // Extra long press = Command palette
      showCommandPalette();
    } else if (pressDuration >= 500) {
      // Long press = Import image
      importImage();
    } else {
      // Short press = Create new card
      const pointer = stage.getPointerPosition();
      const scale = stage.scaleX();
      const position = pointer ? {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale
      } : { x: 100, y: 100 };
      createNewCard(position);
    }
  };

  let isPressed = false;

  button.addEventListener('mousedown', () => {
    isPressed = true;
    onPressStart();
  });

  button.addEventListener('mouseup', () => {
    if (isPressed) {
      isPressed = false;
      onPressEnd();
    }
  });

  button.addEventListener('mouseleave', () => {
    if (isPressed) {
      isPressed = false;
      button.style.transform = 'scale(1)';
    }
  });

  button.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isPressed = true;
    onPressStart();
  });

  button.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (isPressed) {
      isPressed = false;
      onPressEnd();
    }
  });

  button.addEventListener('mouseenter', () => {
    if (!isPressed) {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
    }
  });

  button.addEventListener('mouseleave', () => {
    if (!isPressed) {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    }
  });

  document.body.appendChild(button);
  console.log('Add button created');
}

/**
 * Apply arrangement to selected cards with animation
 */
async function applyArrangement(arrangeFn, arrangeName) {
  const selectedGroups = layer.find('.selected');
  if (selectedGroups.length === 0) {
    console.log('No cards selected for arrangement');
    return;
  }

  // Get mouse/center position
  const pointer = stage.getPointerPosition();
  const scale = stage.scaleX();
  const centerPos = pointer ? {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale
  } : {
    x: 0,
    y: 0
  };

  // Prepare card data for arrangement
  const cardsData = await Promise.all(
    selectedGroups.map(async group => {
      const cardId = group.getAttr('cardId');
      const cards = await getAllCards();
      const card = cards.find(c => c.id === cardId);
      const background = group.findOne('Rect');

      return {
        id: cardId,
        width: background ? background.width() : 200,
        height: background ? background.height() : 150,
        card: card
      };
    })
  );

  // Calculate new positions
  const newPositions = arrangeFn(cardsData, centerPos);

  // Animate cards to new positions
  newPositions.forEach(({ id, x, y }) => {
    const group = cardGroups.get(id);
    if (!group) return;

    // Animate with Konva
    group.to({
      x: x,
      y: y,
      duration: 0.3,
      easing: Konva.Easings.EaseOut
    });

    // Update database
    updateCard(id, { position: { x, y } });
  });

  layer.batchDraw();
  console.log(`Arranged ${newPositions.length} cards: ${arrangeName}`);
}

/**
 * Custom modal dialog (replaces prompt)
 */
function showTextInputDialog(title, defaultValue = '') {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      padding: 24px;
      width: 90%;
      max-width: 500px;
      animation: slideDown 0.2s ease-out;
    `;

    // Add animation keyframe
    if (!document.getElementById('dialog-animation-style')) {
      const style = document.createElement('style');
      style.id = 'dialog-animation-style';
      style.textContent = `
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Title
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
    `;

    // Input
    const input = document.createElement('textarea');
    input.value = defaultValue;
    input.style.cssText = `
      width: 100%;
      min-height: 100px;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      font-family: sans-serif;
      resize: vertical;
      margin-bottom: 16px;
      transition: border-color 0.2s;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = '#2196F3';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#e0e0e0';
    });

    // Buttons container
    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Avbryt';
    cancelBtn.style.cssText = `
      padding: 10px 20px;
      background: #f5f5f5;
      color: #666;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = '#e0e0e0';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = '#f5f5f5';
    });
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(null);
    });

    // OK button
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = `
      padding: 10px 20px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    `;
    okBtn.addEventListener('mouseenter', () => {
      okBtn.style.background = '#1976D2';
    });
    okBtn.addEventListener('mouseleave', () => {
      okBtn.style.background = '#2196F3';
    });
    okBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(input.value);
    });

    // Build dialog
    buttons.appendChild(cancelBtn);
    buttons.appendChild(okBtn);
    dialog.appendChild(titleEl);
    dialog.appendChild(input);
    dialog.appendChild(buttons);
    overlay.appendChild(dialog);

    // Handle escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', escapeHandler);
        resolve(null);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Handle enter key (submit)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        okBtn.click();
      }
    });

    // Show dialog
    document.body.appendChild(overlay);
    input.focus();
    input.select();
  });
}
