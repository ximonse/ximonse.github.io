/**
 * Canvas module using Konva.js
 *
 * FILE ORGANIZATION:
 * This file is organized into clear sections for easier navigation.
 * Use Ctrl+F to jump to section markers like "// === RENDERING ==="
 *
 * SECTIONS:
 * 1. Global State & Configuration
 * 2. Rendering (cards, colors)
 * 3. Card Creation & Editing (inline editor, bulk editor, touch menus)
 * 4. Card Operations (flip, delete)
 * 5. Canvas Management (reload, undo/redo)
 * 6. Clipboard (copy/paste/duplicate)
 * 7. Selection & Interaction (events, drag, pan, zoom)
 * 8. Public API (exports)
 * 9. UI Dialogs (command palette, quality dialog, etc)
 * 10. Search (boolean search with wildcards, proximity, etc)
 * 11. Context Menu & Card Actions (lock, pin)
 * 12. UI Buttons & Theme
 * 13. Arrangements & Keyboard Handlers
 *
 * NOTE: This file is large (3700+ lines) due to tight coupling with global state.
 * Future refactoring: Consider CanvasManager class or dependency injection.
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

// ============================================================================
// SECTION 1: GLOBAL STATE & CONFIGURATION
// ============================================================================

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

// Clipboard for copy/paste
let clipboard = [];

// ============================================================================
// SECTION 2: RENDERING (Cards, Colors, Visual Elements)
// ============================================================================

/**
 * Get card color from cardColor property
 */
function getCardColor(cardColor) {
  const colorMap = {
    'card-color-1': '#d4f2d4', // Grön
    'card-color-2': '#ffe4b3', // Orange
    'card-color-3': '#ffc1cc', // Röd
    'card-color-4': '#fff7b3', // Gul
    'card-color-5': '#f3e5f5', // Lila
    'card-color-6': '#c7e7ff', // Blå
    'card-color-7': '#e0e0e0', // Grå
    'card-color-8': '#ffffff'  // Vit
  };

  return colorMap[cardColor] || '#ffffff'; // Default white
}

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
  createCommandPaletteButton();
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

  // Set locked state
  if (cardData.locked) {
    group.draggable(false);
    group.setAttr('locked', true);
  }

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

  // Right-click context menu
  group.on('contextmenu', function(e) {
    e.evt.preventDefault();
    showContextMenu(e.evt.clientX, e.evt.clientY, cardData.id, this);
  });

  // Touch handlers
  let touchTimer = null;
  let touchStartPos = null;
  let hasMoved = false;

  group.on('touchstart', function(e) {
    const pos = this.position();
    touchStartPos = { x: pos.x, y: pos.y };
    hasMoved = false;

    // Long press timer
    touchTimer = setTimeout(async () => {
      if (!hasMoved) {
        // Long press detected
        const selectedGroups = layer.find('.selected');

        if (selectedGroups.length > 1 && this.hasName('selected')) {
          // Multiple cards selected: show bulk menu
          await showTouchBulkMenu(e.evt.clientX || e.evt.touches[0].clientX,
                                  e.evt.clientY || e.evt.touches[0].clientY);
        } else {
          // Single card: open editor
          if (cardData.image && cardData.flipped) {
            createInlineEditor(cardData.id, this, cardData.backText || '', true);
          } else if (cardData.image) {
            // For image cards (front side), flip them
            await flipCard(cardData.id);
          } else {
            // For text cards, open editor
            createInlineEditor(cardData.id, this, cardData.text || '', false);
          }
        }
        touchTimer = null;
      }
    }, 600); // 600ms long press
  });

  group.on('touchmove', function() {
    const currentPos = this.position();
    const moved = Math.abs(currentPos.x - touchStartPos.x) > 5 ||
                  Math.abs(currentPos.y - touchStartPos.y) > 5;
    if (moved) {
      hasMoved = true;
    }
  });

  group.on('touchend touchcancel', function() {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
  });

  group.on('dragstart', function() {
    hasMoved = true;
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
  });

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

  group.on('dragend', async function() {
    if (dragStartPositions && dragStartPositions.size > 0) {
      // Update all moved cards in database and add to undo stack
      for (const [node, originalPos] of dragStartPositions) {
        const cardId = node.getAttr('cardId');
        if (cardId) {
          const newPosition = { x: node.x(), y: node.y() };

          // Add to undo stack
          pushUndo({
            type: 'update',
            cardId: cardId,
            oldData: { position: originalPos },
            newData: { position: newPosition }
          });

          await updateCard(cardId, { position: newPosition });
        }
      }

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
  // Get card color
  const cardColor = getCardColor(cardData.cardColor);

  // Check if e-ink theme is active
  const isEink = document.body.classList.contains('eink-theme');

  // Background
  const background = new Konva.Rect({
    width: 200,
    height: 150,
    fill: isEink ? '#ffffff' : cardColor,
    stroke: isEink ? '#000000' : '#e0e0e0',
    strokeWidth: isEink ? 2 : 1,
    cornerRadius: isEink ? 0 : 8,
    shadowColor: isEink ? 'transparent' : 'black',
    shadowBlur: isEink ? 0 : 10,
    shadowOpacity: isEink ? 0 : 0.1,
    shadowOffset: { x: 0, y: isEink ? 0 : 2 }
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
    // Check if e-ink theme is active
    const isEink = document.body.classList.contains('eink-theme');

    // Calculate card dimensions (maintain aspect ratio)
    // Standard width: 200px for aligned columns
    const maxWidth = 200;
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
        fill: isEink ? '#ffffff' : '#fffacd',
        stroke: isEink ? '#000000' : '#e0e0e0',
        strokeWidth: isEink ? 2 : 1,
        cornerRadius: isEink ? 0 : 8,
        shadowColor: isEink ? 'transparent' : 'black',
        shadowBlur: isEink ? 0 : 10,
        shadowOpacity: isEink ? 0 : 0.1,
        shadowOffset: { x: 0, y: isEink ? 0 : 2 }
      });

      const text = new Konva.Text({
        text: cardData.backText || 'Dubbelklicka för att redigera baksidan...',
        x: 16,
        y: 16,
        width: width - 32,
        height: height - 32,
        fontSize: 16,
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
        stroke: isEink ? '#000000' : '#e0e0e0',
        strokeWidth: isEink ? 2 : 1,
        cornerRadius: isEink ? 0 : 8,
        shadowColor: isEink ? 'transparent' : 'black',
        shadowBlur: isEink ? 0 : 10,
        shadowOpacity: isEink ? 0 : 0.1,
        shadowOffset: { x: 0, y: isEink ? 0 : 2 }
      });

      const konvaImage = new Konva.Image({
        image: imageObj,
        width: width,
        height: height,
        cornerRadius: isEink ? 0 : 8
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

// ============================================================================
// SECTION 3: CARD CREATION & EDITING (Dialogs, Inline Editor, Touch Menus)
// ============================================================================

/**
 * Create new card
 */
async function createNewCard(position) {
  // Create empty card first
  const cardData = {
    text: '',
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

  // Open editor on the new card
  const group = cardGroups.get(cardId);
  if (group) {
    await createInlineEditor(cardId, group, '', false);
  }
}

/**
 * Inline text editor using HTML textarea overlay
 */
async function createInlineEditor(cardId, group, currentText, isImageBack = false) {
  // Get card data
  const cards = await getAllCards();
  const card = cards.find(c => c.id === cardId);
  if (!card) return;

  const currentTags = card.tags || [];
  const currentColor = card.cardColor || '';

  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 24px;
    border-radius: 12px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  `;

  dialog.innerHTML = `
    <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 600;">
      ${isImageBack ? 'Redigera baksida' : 'Redigera kort'}
    </h3>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">Text:</label>
      <textarea id="editCardText"
        style="width: 100%; height: 200px; padding: 12px; font-size: 16px;
               border: 2px solid var(--border-color); border-radius: 8px;
               background: var(--bg-secondary); color: var(--text-primary);
               font-family: inherit; resize: vertical; box-sizing: border-box;"
      >${currentText || ''}</textarea>
    </div>

    ${!isImageBack ? `
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">Tags (kommaseparerade):</label>
      <input type="text" id="editCardTags" value="${currentTags.join(', ')}"
        style="width: 100%; padding: 12px; font-size: 16px;
               border: 2px solid var(--border-color); border-radius: 8px;
               background: var(--bg-secondary); color: var(--text-primary);
               box-sizing: border-box;">
    </div>

    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">Kortfärg:</label>
      <div id="editColorPicker" style="display: flex; gap: 10px; flex-wrap: wrap;">
        <div class="color-dot" data-color="" style="width: 36px; height: 36px; border-radius: 50%;
             background: var(--bg-secondary); border: 3px solid var(--border-color); cursor: pointer;
             display: flex; align-items: center; justify-content: center; font-size: 20px;"
             title="Ingen färg">⭘</div>
        <div class="color-dot" data-color="card-color-1" style="width: 36px; height: 36px; border-radius: 50%;
             background: #d4f2d4; border: 3px solid transparent; cursor: pointer;" title="Grön"></div>
        <div class="color-dot" data-color="card-color-2" style="width: 36px; height: 36px; border-radius: 50%;
             background: #ffe4b3; border: 3px solid transparent; cursor: pointer;" title="Orange"></div>
        <div class="color-dot" data-color="card-color-3" style="width: 36px; height: 36px; border-radius: 50%;
             background: #ffc1cc; border: 3px solid transparent; cursor: pointer;" title="Röd"></div>
        <div class="color-dot" data-color="card-color-4" style="width: 36px; height: 36px; border-radius: 50%;
             background: #fff7b3; border: 3px solid transparent; cursor: pointer;" title="Gul"></div>
        <div class="color-dot" data-color="card-color-5" style="width: 36px; height: 36px; border-radius: 50%;
             background: #f3e5f5; border: 3px solid transparent; cursor: pointer;" title="Lila"></div>
        <div class="color-dot" data-color="card-color-6" style="width: 36px; height: 36px; border-radius: 50%;
             background: #c7e7ff; border: 3px solid transparent; cursor: pointer;" title="Blå"></div>
        <div class="color-dot" data-color="card-color-7" style="width: 36px; height: 36px; border-radius: 50%;
             background: #e0e0e0; border: 3px solid transparent; cursor: pointer;" title="Grå"></div>
        <div class="color-dot" data-color="card-color-8" style="width: 36px; height: 36px; border-radius: 50%;
             background: #ffffff; border: 3px solid #ddd; cursor: pointer;" title="Vit"></div>
      </div>
    </div>
    ` : ''}

    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
      <button id="cancelEdit" style="padding: 12px 24px; background: var(--bg-secondary);
                                     color: var(--text-primary); border: 2px solid var(--border-color);
                                     border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer;">
        Avbryt
      </button>
      <button id="saveEdit" style="padding: 12px 24px; background: var(--accent-color);
                                    color: white; border: none; border-radius: 8px;
                                    font-size: 16px; font-weight: 600; cursor: pointer;">
        ${isImageBack ? 'Spara & Vänd tillbaka' : 'Spara'}
      </button>
    </div>

    <div style="margin-top: 16px; font-size: 13px; color: var(--text-secondary); text-align: center;">
      Tips: Ctrl+Enter = Spara, Esc = Avbryt
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Get elements
  const textarea = document.getElementById('editCardText');
  const tagsInput = document.getElementById('editCardTags');
  const saveBtn = document.getElementById('saveEdit');
  const cancelBtn = document.getElementById('cancelEdit');

  // Focus textarea
  textarea.focus();
  textarea.select();

  // Handle color selection (only for regular cards)
  let selectedColor = currentColor;
  if (!isImageBack) {
    const colorDots = document.querySelectorAll('#editColorPicker .color-dot');

    // Highlight current color
    colorDots.forEach(dot => {
      if (dot.dataset.color === currentColor) {
        dot.style.border = '3px solid var(--accent-color)';
      } else if (!currentColor && dot.dataset.color === '') {
        dot.style.border = '3px solid var(--accent-color)';
      }

      dot.addEventListener('click', function() {
        // Remove selection from all
        colorDots.forEach(d => {
          if (d.dataset.color === '') {
            d.style.border = '3px solid var(--border-color)';
          } else if (d.dataset.color === 'card-color-8') {
            d.style.border = '3px solid #ddd';
          } else {
            d.style.border = '3px solid transparent';
          }
        });

        // Select this one
        this.style.border = '3px solid var(--accent-color)';
        selectedColor = this.dataset.color;
      });
    });
  }

  const cleanup = () => {
    if (overlay.parentNode) {
      document.body.removeChild(overlay);
    }
    document.removeEventListener('keydown', escHandler);
  };

  // Save handler
  const save = async () => {
    const newText = textarea.value;

    if (isImageBack) {
      // Save back text and flip card
      pushUndo({
        type: 'update',
        cardId,
        oldData: { backText: currentText },
        newData: { backText: newText }
      });

      await updateCard(cardId, { backText: newText });
      await flipCard(cardId);
    } else {
      // Save regular card
      const newTags = tagsInput ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : currentTags;

      const updates = {
        text: newText,
        tags: newTags
      };

      // Add color if changed
      if (selectedColor !== currentColor) {
        updates.cardColor = selectedColor;
      }

      pushUndo({
        type: 'update',
        cardId,
        oldData: { text: currentText, tags: currentTags, cardColor: currentColor },
        newData: updates
      });

      await updateCard(cardId, updates);
      await reloadCanvas();
    }

    cleanup();
  };

  // Event listeners
  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cleanup);

  // Keyboard shortcuts
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      cleanup();
    }
  };
  document.addEventListener('keydown', escHandler);

  textarea.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });
}

/**
 * Bulk editor for multiple selected cards
 */
async function createBulkEditor(cardIds) {
  const cards = await getAllCards();
  const selectedCards = cards.filter(c => cardIds.includes(c.id));

  if (selectedCards.length === 0) return;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 24px;
    border-radius: 12px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  `;

  dialog.innerHTML = `
    <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 600;">
      Redigera ${selectedCards.length} kort
    </h3>

    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
      <p style="margin: 0; font-size: 14px;">
        Ändringar appliceras på alla ${selectedCards.length} markerade kort.
        Lämna fält tomma för att inte ändra dem.
      </p>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">
        Lägg till tags (kommaseparerade, läggs till befintliga):
      </label>
      <input type="text" id="bulkAddTags"
        placeholder="t.ex. urgent, projekt"
        style="width: 100%; padding: 12px; font-size: 16px;
               border: 2px solid var(--border-color); border-radius: 8px;
               background: var(--bg-secondary); color: var(--text-primary);
               box-sizing: border-box;">
    </div>

    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">Kortfärg:</label>
      <div id="bulkColorPicker" style="display: flex; gap: 10px; flex-wrap: wrap;">
        <div class="color-dot" data-color="none" style="width: 36px; height: 36px; border-radius: 50%;
             background: var(--bg-secondary); border: 3px solid var(--accent-color); cursor: pointer;
             display: flex; align-items: center; justify-content: center; font-size: 20px;"
             title="Ändra inte färg">×</div>
        <div class="color-dot" data-color="" style="width: 36px; height: 36px; border-radius: 50%;
             background: var(--bg-secondary); border: 3px solid var(--border-color); cursor: pointer;
             display: flex; align-items: center; justify-content: center; font-size: 20px;"
             title="Ingen färg">⭘</div>
        <div class="color-dot" data-color="card-color-1" style="width: 36px; height: 36px; border-radius: 50%;
             background: #d4f2d4; border: 3px solid transparent; cursor: pointer;" title="Grön"></div>
        <div class="color-dot" data-color="card-color-2" style="width: 36px; height: 36px; border-radius: 50%;
             background: #ffe4b3; border: 3px solid transparent; cursor: pointer;" title="Orange"></div>
        <div class="color-dot" data-color="card-color-3" style="width: 36px; height: 36px; border-radius: 50%;
             background: #ffc1cc; border: 3px solid transparent; cursor: pointer;" title="Röd"></div>
        <div class="color-dot" data-color="card-color-4" style="width: 36px; height: 36px; border-radius: 50%;
             background: #fff7b3; border: 3px solid transparent; cursor: pointer;" title="Gul"></div>
        <div class="color-dot" data-color="card-color-5" style="width: 36px; height: 36px; border-radius: 50%;
             background: #f3e5f5; border: 3px solid transparent; cursor: pointer;" title="Lila"></div>
        <div class="color-dot" data-color="card-color-6" style="width: 36px; height: 36px; border-radius: 50%;
             background: #c7e7ff; border: 3px solid transparent; cursor: pointer;" title="Blå"></div>
        <div class="color-dot" data-color="card-color-7" style="width: 36px; height: 36px; border-radius: 50%;
             background: #e0e0e0; border: 3px solid transparent; cursor: pointer;" title="Grå"></div>
        <div class="color-dot" data-color="card-color-8" style="width: 36px; height: 36px; border-radius: 50%;
             background: #ffffff; border: 3px solid #ddd; cursor: pointer;" title="Vit"></div>
      </div>
    </div>

    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
      <button id="bulkCancel" style="padding: 12px 24px; background: var(--bg-secondary);
                                     color: var(--text-primary); border: 2px solid var(--border-color);
                                     border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer;">
        Avbryt
      </button>
      <button id="bulkSave" style="padding: 12px 24px; background: var(--accent-color);
                                    color: white; border: none; border-radius: 8px;
                                    font-size: 16px; font-weight: 600; cursor: pointer;">
        Uppdatera alla
      </button>
    </div>

    <div style="margin-top: 16px; font-size: 13px; color: var(--text-secondary); text-align: center;">
      Tips: Ctrl+Enter = Spara, Esc = Avbryt
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Get elements
  const tagsInput = document.getElementById('bulkAddTags');
  const saveBtn = document.getElementById('bulkSave');
  const cancelBtn = document.getElementById('bulkCancel');

  // Handle color selection
  let selectedColor = 'none'; // Default: don't change
  const colorDots = document.querySelectorAll('#bulkColorPicker .color-dot');

  colorDots.forEach(dot => {
    dot.addEventListener('click', function() {
      // Remove selection from all
      colorDots.forEach(d => {
        if (d.dataset.color === 'none') {
          d.style.border = '3px solid transparent';
        } else if (d.dataset.color === '') {
          d.style.border = '3px solid var(--border-color)';
        } else if (d.dataset.color === 'card-color-8') {
          d.style.border = '3px solid #ddd';
        } else {
          d.style.border = '3px solid transparent';
        }
      });

      // Select this one
      this.style.border = '3px solid var(--accent-color)';
      selectedColor = this.dataset.color;
    });
  });

  const cleanup = () => {
    if (overlay.parentNode) {
      document.body.removeChild(overlay);
    }
    document.removeEventListener('keydown', escHandler);
  };

  // Save handler
  const save = async () => {
    const addTags = tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : [];

    // Build updates
    for (const card of selectedCards) {
      const updates = {};

      // Add tags (merge with existing)
      if (addTags.length > 0) {
        const existingTags = card.tags || [];
        const newTags = [...new Set([...existingTags, ...addTags])]; // Remove duplicates
        updates.tags = newTags;
      }

      // Update color (only if not 'none')
      if (selectedColor !== 'none') {
        updates.cardColor = selectedColor;
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await updateCard(card.id, updates);
      }
    }

    await reloadCanvas();
    cleanup();

    console.log(`Bulk updated ${selectedCards.length} cards`);
  };

  // Event listeners
  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cleanup);

  // Keyboard shortcuts
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      cleanup();
    }
  };
  document.addEventListener('keydown', escHandler);

  tagsInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });

  // Focus tags input
  tagsInput.focus();
}

/**
 * Show touch paste menu (for long-press on empty canvas)
 */
async function showTouchPasteMenu(x, y, position) {
  const menu = document.createElement('div');
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    min-width: 200px;
  `;

  menu.innerHTML = `
    <div id="touchMenuPasteImage" style="padding: 12px; cursor: pointer; border-radius: 8px; font-size: 16px;">
      📷 Klistra in bild
    </div>
    <div id="touchMenuNewCard" style="padding: 12px; cursor: pointer; border-radius: 8px; font-size: 16px;">
      📝 Nytt kort
    </div>
    <div id="touchMenuCancel" style="padding: 12px; cursor: pointer; border-radius: 8px; font-size: 16px; color: var(--text-secondary);">
      ✕ Avbryt
    </div>
  `;

  document.body.appendChild(menu);

  // Add hover effects
  const items = menu.querySelectorAll('div[id^="touchMenu"]');
  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.style.background = 'var(--bg-secondary)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });
  });

  const cleanup = () => {
    if (menu.parentNode) {
      document.body.removeChild(menu);
    }
  };

  // Paste image handler
  document.getElementById('touchMenuPasteImage').addEventListener('click', async () => {
    cleanup();
    await importImage(position);
  });

  // New card handler
  document.getElementById('touchMenuNewCard').addEventListener('click', async () => {
    cleanup();
    await createNewCard(position);
  });

  // Cancel handler
  document.getElementById('touchMenuCancel').addEventListener('click', () => {
    cleanup();
  });

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', cleanup, { once: true });
  }, 100);
}

/**
 * Show touch bulk menu (for long-press on selected cards)
 */
async function showTouchBulkMenu(x, y) {
  const selectedGroups = layer.find('.selected');
  const selectedIds = selectedGroups.map(g => g.getAttr('cardId')).filter(id => id);

  if (selectedIds.length === 0) return;

  const menu = document.createElement('div');
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    min-width: 220px;
  `;

  menu.innerHTML = `
    <div style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid var(--border-color); margin-bottom: 4px;">
      ${selectedIds.length} kort markerade
    </div>
    <div id="touchBulkEdit" style="padding: 12px; cursor: pointer; border-radius: 8px; font-size: 16px;">
      ✏️ Redigera alla
    </div>
    <div id="touchBulkColor" style="padding: 12px; cursor: pointer; border-radius: 8px; font-size: 16px;">
      🎨 Ändra färg
    </div>
    <div id="touchBulkTag" style="padding: 12px; cursor: pointer; border-radius: 8px; font-size: 16px;">
      🏷️ Lägg till taggar
    </div>
    <div id="touchBulkCancel" style="padding: 12px; cursor: pointer; border-radius: 8px; font-size: 16px; color: var(--text-secondary); border-top: 1px solid var(--border-color); margin-top: 4px;">
      ✕ Avbryt
    </div>
  `;

  document.body.appendChild(menu);

  // Add hover effects
  const items = menu.querySelectorAll('div[id^="touchBulk"]');
  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.style.background = 'var(--bg-secondary)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });
  });

  const cleanup = () => {
    if (menu.parentNode) {
      document.body.removeChild(menu);
    }
  };

  // Edit all handler
  document.getElementById('touchBulkEdit').addEventListener('click', async () => {
    cleanup();
    await createBulkEditor(selectedIds);
  });

  // Color picker handler
  document.getElementById('touchBulkColor').addEventListener('click', async () => {
    cleanup();
    await showQuickColorPicker(x, y, selectedIds);
  });

  // Add tags handler
  document.getElementById('touchBulkTag').addEventListener('click', async () => {
    cleanup();
    await showQuickTagAdder(x, y, selectedIds);
  });

  // Cancel handler
  document.getElementById('touchBulkCancel').addEventListener('click', () => {
    cleanup();
  });

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', cleanup, { once: true });
  }, 100);
}

/**
 * Quick color picker for bulk operations
 */
async function showQuickColorPicker(x, y, cardIds) {
  const picker = document.createElement('div');
  picker.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    max-width: 200px;
  `;

  const colors = [
    { id: '', label: '⭘', title: 'Ingen färg' },
    { id: 'card-color-1', color: '#d4f2d4', title: 'Grön' },
    { id: 'card-color-2', color: '#ffe4b3', title: 'Orange' },
    { id: 'card-color-3', color: '#ffc1cc', title: 'Röd' },
    { id: 'card-color-4', color: '#fff7b3', title: 'Gul' },
    { id: 'card-color-5', color: '#f3e5f5', title: 'Lila' },
    { id: 'card-color-6', color: '#c7e7ff', title: 'Blå' },
    { id: 'card-color-7', color: '#e0e0e0', title: 'Grå' },
    { id: 'card-color-8', color: '#ffffff', title: 'Vit' }
  ];

  colors.forEach(colorInfo => {
    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${colorInfo.color || 'var(--bg-secondary)'};
      border: 2px solid var(--border-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    `;
    if (!colorInfo.color) {
      dot.textContent = colorInfo.label;
    }
    dot.title = colorInfo.title;

    dot.addEventListener('click', async () => {
      const cards = await getAllCards();
      for (const cardId of cardIds) {
        await updateCard(cardId, { cardColor: colorInfo.id });
      }
      await reloadCanvas();
      cleanup();
    });

    picker.appendChild(dot);
  });

  document.body.appendChild(picker);

  const cleanup = () => {
    if (picker.parentNode) {
      document.body.removeChild(picker);
    }
  };

  setTimeout(() => {
    document.addEventListener('click', cleanup, { once: true });
  }, 100);
}

/**
 * Quick tag adder for bulk operations
 */
async function showQuickTagAdder(x, y, cardIds) {
  const adder = document.createElement('div');
  adder.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    min-width: 250px;
  `;

  adder.innerHTML = `
    <div style="margin-bottom: 12px; font-weight: 600;">Lägg till taggar</div>
    <input type="text" id="quickTagInput" placeholder="t.ex. urgent, projekt"
      style="width: 100%; padding: 10px; border: 2px solid var(--border-color);
             border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary);
             box-sizing: border-box; font-size: 16px; margin-bottom: 12px;">
    <div style="display: flex; gap: 8px;">
      <button id="quickTagCancel" style="flex: 1; padding: 10px; background: var(--bg-secondary);
              color: var(--text-primary); border: 2px solid var(--border-color); border-radius: 8px;
              cursor: pointer; font-size: 14px;">Avbryt</button>
      <button id="quickTagSave" style="flex: 1; padding: 10px; background: var(--accent-color);
              color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;
              font-weight: 600;">Lägg till</button>
    </div>
  `;

  document.body.appendChild(adder);

  const input = document.getElementById('quickTagInput');
  const saveBtn = document.getElementById('quickTagSave');
  const cancelBtn = document.getElementById('quickTagCancel');

  input.focus();

  const cleanup = () => {
    if (adder.parentNode) {
      document.body.removeChild(adder);
    }
  };

  const save = async () => {
    const newTags = input.value.split(',').map(t => t.trim()).filter(t => t);
    if (newTags.length === 0) {
      cleanup();
      return;
    }

    const cards = await getAllCards();
    for (const cardId of cardIds) {
      const card = cards.find(c => c.id === cardId);
      if (card) {
        const existingTags = card.tags || [];
        const mergedTags = [...new Set([...existingTags, ...newTags])];
        await updateCard(cardId, { tags: mergedTags });
      }
    }

    await reloadCanvas();
    cleanup();
  };

  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cleanup);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      cleanup();
    }
  });
}

/**
 * Open edit dialog for card (or bulk edit if multiple selected)
 */
async function openEditDialog(cardId) {
  // Check if multiple cards are selected
  const selectedGroups = layer.find('.selected');

  if (selectedGroups.length > 1) {
    // Bulk edit mode
    const selectedIds = selectedGroups.map(g => g.getAttr('cardId')).filter(id => id);
    await createBulkEditor(selectedIds);
  } else {
    // Single card edit
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
}

// ============================================================================
// SECTION 4: CARD OPERATIONS (Flip, Delete)
// ============================================================================

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

// ============================================================================
// SECTION 5: CANVAS MANAGEMENT (Reload, Undo/Redo)
// ============================================================================

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

// ============================================================================
// SECTION 6: CLIPBOARD (Copy/Paste/Duplicate)
// ============================================================================

/**
 * Duplicate/copy selected cards
 */
async function duplicateSelectedCards() {
  const selectedGroups = layer.find('.selected');

  if (selectedGroups.length === 0) {
    console.log('No cards selected to duplicate');
    return;
  }

  const { getCard, createCard } = await import('./storage.js');

  for (const group of selectedGroups) {
    const cardId = group.getAttr('cardId');
    if (!cardId) continue;

    // Get original card data
    const originalCard = await getCard(cardId);
    if (!originalCard) continue;

    // Create duplicate with offset position
    const { id, uniqueId, created, modified, metadata, ...cardData } = originalCard;

    const duplicateData = {
      ...cardData,
      position: {
        x: (originalCard.position?.x || 0) + 50,
        y: (originalCard.position?.y || 0) + 50
      }
    };

    // Create with copy metadata
    await createCard(duplicateData, {
      copied: true,
      copiedAt: new Date().toISOString(),
      copiedFrom: originalCard.uniqueId,
      originalCardId: cardId
    });
  }

  // Reload canvas
  await reloadCanvas();
  console.log(`Duplicated ${selectedGroups.length} cards`);
}

/**
 * Copy selected cards to clipboard
 */
async function copySelectedCards() {
  const selectedGroups = layer.find('.selected');

  if (selectedGroups.length === 0) {
    console.log('No cards selected to copy');
    return;
  }

  const { getCard } = await import('./storage.js');

  clipboard = [];

  for (const group of selectedGroups) {
    const cardId = group.getAttr('cardId');
    if (!cardId) continue;

    const card = await getCard(cardId);
    if (!card) continue;

    // Store card data in clipboard
    clipboard.push({
      ...card
    });
  }

  console.log(`Copied ${clipboard.length} cards to clipboard`);
}

/**
 * Paste cards from clipboard
 */
async function pasteCards() {
  if (clipboard.length === 0) {
    console.log('Clipboard is empty');
    return;
  }

  const { createCard } = await import('./storage.js');

  // Get paste position (center of viewport or mouse position)
  const pointer = stage.getPointerPosition() || {
    x: stage.width() / 2,
    y: stage.height() / 2
  };
  const scale = stage.scaleX();
  const pastePosition = {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale
  };

  // Calculate offset from first card's position
  const firstCard = clipboard[0];
  const offsetX = pastePosition.x - (firstCard.position?.x || 0);
  const offsetY = pastePosition.y - (firstCard.position?.y || 0);

  for (const cardData of clipboard) {
    const { id, uniqueId, created, modified, metadata, ...cleanData } = cardData;

    const pastedData = {
      ...cleanData,
      position: {
        x: (cardData.position?.x || 0) + offsetX,
        y: (cardData.position?.y || 0) + offsetY
      }
    };

    // Create with copy metadata
    await createCard(pastedData, {
      copied: true,
      copiedAt: new Date().toISOString(),
      copiedFrom: cardData.uniqueId,
      originalCardId: id
    });
  }

  await reloadCanvas();
  console.log(`Pasted ${clipboard.length} cards`);
}

/**
 * Paste cards from clipboard and apply arrangement
 */
async function pasteCardsWithArrangement(arrangementFunc, arrangementName) {
  if (clipboard.length === 0) {
    console.log('Clipboard is empty');
    return;
  }

  const { createCard } = await import('./storage.js');

  // Get paste position (center of viewport)
  const pointer = stage.getPointerPosition() || {
    x: stage.width() / 2,
    y: stage.height() / 2
  };
  const scale = stage.scaleX();
  const pastePosition = {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale
  };

  // Create cards first
  const newCardIds = [];
  for (const cardData of clipboard) {
    const { id, uniqueId, created, modified, metadata, ...cleanData } = cardData;

    const pastedData = {
      ...cleanData,
      position: pastePosition // Start at paste position
    };

    // Create with copy metadata
    const newId = await createCard(pastedData, {
      copied: true,
      copiedAt: new Date().toISOString(),
      copiedFrom: cardData.uniqueId,
      originalCardId: id
    });

    newCardIds.push(newId);
  }

  await reloadCanvas();

  // Select the newly pasted cards
  layer.find('.selected').forEach(group => {
    group.removeName('selected');
    const background = group.findOne('Rect');
    if (background) {
      background.stroke(null);
      background.strokeWidth(0);
    }
  });

  newCardIds.forEach(cardId => {
    const group = cardGroups.get(cardId);
    if (group) {
      group.addName('selected');
      const background = group.findOne('Rect');
      if (background) {
        background.stroke('#2196F3');
        background.strokeWidth(3);
      }
    }
  });

  layer.batchDraw();

  // Apply arrangement to the newly pasted cards
  await applyArrangement(arrangementFunc, arrangementName);

  console.log(`Pasted and arranged ${clipboard.length} cards using ${arrangementName}`);
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

// ============================================================================
// SECTION 7: SELECTION & INTERACTION (Events, Drag, Pan, Zoom)
// ============================================================================

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

  // Touch long-press on empty canvas to paste image
  let stageTouchTimer = null;
  let stageTouchStart = null;

  stage.on('touchstart', (e) => {
    if (e.target !== stage) return; // Only on empty canvas

    stageTouchStart = Date.now();

    stageTouchTimer = setTimeout(async () => {
      // Long press on empty canvas
      const pointer = stage.getPointerPosition();
      const scale = stage.scaleX();
      const position = {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale
      };

      // Show paste menu
      await showTouchPasteMenu(e.evt.touches ? e.evt.touches[0].clientX : e.evt.clientX,
                               e.evt.touches ? e.evt.touches[0].clientY : e.evt.clientY,
                               position);
      stageTouchTimer = null;
    }, 600); // 600ms long press
  });

  stage.on('touchmove', (e) => {
    if (stageTouchTimer && e.target === stage) {
      clearTimeout(stageTouchTimer);
      stageTouchTimer = null;
    }
  });

  stage.on('touchend touchcancel', (e) => {
    if (stageTouchTimer) {
      clearTimeout(stageTouchTimer);
      stageTouchTimer = null;
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

    // Ctrl+C - Copy selected cards
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      await copySelectedCards();
      return;
    }

    // Ctrl+V - Paste copied cards
    if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      await pasteCards();
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

    // K - Toggle view
    if (e.key === 'k') {
      e.preventDefault();
      toggleViewFromMenu();
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

    // Space - Command palette
    if (e.key === ' ') {
      e.preventDefault();
      showCommandPalette();
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
          // G+V = Paste and arrange in Grid Vertical (if clipboard has cards), otherwise arrange selected
          e2.preventDefault();
          console.log('G+V pressed');
          if (clipboard.length > 0) {
            await pasteCardsWithArrangement(arrangeGridVertical, 'Grid Vertical');
          } else {
            await applyArrangement(arrangeGridVertical, 'Grid Vertical');
          }
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

    // Q - Paste and arrange in cluster (if clipboard has cards), otherwise arrange selected
    if (e.key === 'q' && !e.ctrlKey) {
      e.preventDefault();
      if (clipboard.length > 0) {
        await pasteCardsWithArrangement(arrangeCluster, 'Cluster');
      } else {
        await applyArrangement(arrangeCluster, 'Cluster');
      }
      return;
    }

    // P - Toggle pin/unpin selected cards
    if (e.key === 'p' && !e.ctrlKey) {
      e.preventDefault();
      await togglePinSelectedCards();
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

// ============================================================================
// SECTION 8: PUBLIC API (Exported Functions)
// ============================================================================

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
 * Import canvas from JSON file
 */
export async function importCanvas() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Import cards
        const { createCard } = await import('./storage.js');

        if (data.cards && Array.isArray(data.cards)) {
          for (let i = 0; i < data.cards.length; i++) {
            const card = data.cards[i];
            // Create each card in storage (without the id to avoid conflicts)
            const { id, ...cardWithoutId } = card;

            // Add import metadata
            await createCard(cardWithoutId, {
              imported: true,
              importedAt: new Date().toISOString(),
              importedFrom: file.name,
              importBatchIndex: i
            });
          }

          // Reload canvas to show imported cards
          await reloadCanvas();

          // Restore viewport if available
          if (data.viewport) {
            stage.position({ x: data.viewport.x, y: data.viewport.y });
            stage.scale({ x: data.viewport.scale, y: data.viewport.scale });
            stage.batchDraw();
          }

          console.log(`Imported ${data.cards.length} cards`);
          alert(`Importerade ${data.cards.length} kort!`);
          resolve(data.cards.length);
        } else {
          throw new Error('Invalid JSON format');
        }
      } catch (error) {
        console.error('Import failed:', error);
        alert('Misslyckades att importera fil: ' + error.message);
        reject(error);
      }
    };

    input.click();
  });
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

// ============================================================================
// SECTION 9: UI DIALOGS (Command Palette, Quality Dialog, Text Input)
// ============================================================================

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
    { key: 'S', icon: '💾', name: 'Exportera', desc: 'Exportera canvas till JSON-fil', action: async () => {
      await exportCanvas();
    }},
    { key: 'L', icon: '📂', name: 'Importera JSON', desc: 'Importera kort från JSON-fil', action: async () => {
      await importCanvas();
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
    { key: 'Ctrl+C', icon: '📋', name: 'Kopiera kort', desc: 'Kopiera markerade kort till clipboard', action: async () => {
      await copySelectedCards();
    }},
    { key: 'Ctrl+V', icon: '📄', name: 'Klistra in kort', desc: 'Klistra in kopierade kort', action: async () => {
      await pasteCards();
    }},
    { key: 'P', icon: '📌', name: 'Pinna/Avpinna kort', desc: 'Pinna eller avpinna markerade kort (kan inte flyttas)', action: async () => {
      await togglePinSelectedCards();
    }},
    { key: 'V', icon: '↕️', name: 'Arrangera vertikalt', desc: 'Arrangera markerade kort i vertikal kolumn', action: async () => {
      await applyArrangement(arrangeVertical, 'Vertical');
    }},
    { key: 'H', icon: '↔️', name: 'Arrangera horisontellt', desc: 'Arrangera markerade kort i horisontell rad', action: async () => {
      await applyArrangement(arrangeHorizontal, 'Horizontal');
    }},
    { key: 'G', icon: '⊞', name: 'Arrangera grid', desc: 'Arrangera markerade kort i grid', action: async () => {
      await applyArrangement(arrangeGrid, 'Grid');
    }},
    { key: 'Q', icon: '◉', name: 'Arrangera cirkel', desc: 'Klistra in och arrangera i cirkel (om kopierade kort), annars arrangera markerade', action: async () => {
      if (clipboard.length > 0) {
        await pasteCardsWithArrangement(arrangeCluster, 'Cluster');
      } else {
        await applyArrangement(arrangeCluster, 'Cluster');
      }
    }},
    { key: 'G+V', icon: '⊞↕', name: 'Arrangera grid vertikalt', desc: 'Klistra in och arrangera vertikalt (om kopierade kort), annars arrangera markerade', action: async () => {
      if (clipboard.length > 0) {
        await pasteCardsWithArrangement(arrangeGridVertical, 'Grid Vertical');
      } else {
        await applyArrangement(arrangeGridVertical, 'Grid Vertical');
      }
    }},
    { key: 'G+H', icon: '⊞↔', name: 'Arrangera grid horisontellt', desc: 'Arrangera markerade kort i horisontella rader', action: async () => {
      await applyArrangement(arrangeGridHorizontal, 'Grid Horizontal');
    }},
    { key: 'G+T', icon: '⊞⤓', name: 'Arrangera grid överlappande', desc: 'Arrangera markerade kort överlappande (Kanban-stil)', action: async () => {
      await applyArrangement(arrangeGridTopAligned, 'Grid Top-Aligned');
    }},
    { key: '-', icon: '🎨', name: 'Byt tema', desc: 'Växla mellan ljust/mörkt/e-ink tema', action: () => {
      window.dispatchEvent(new CustomEvent('toggleTheme'));
    }},
    { key: '-', icon: '🔄', name: 'Byt vy', desc: 'Växla mellan bräd-vy och kolumn-vy', action: () => {
      window.dispatchEvent(new CustomEvent('toggleView'));
    }},
    { key: 'Ctrl+A', icon: '☑', name: 'Markera alla', desc: 'Markera alla kort på canvas', action: null },
    { key: 'Scroll', icon: '🔍', name: 'Zooma', desc: 'Zooma in/ut med mushjulet', action: null },
    { key: 'Ctrl+Drag', icon: '✋', name: 'Panorera', desc: 'Panorera canvas genom att hålla Ctrl och dra', action: null },
    { key: 'Double-click', icon: '✏️', name: 'Redigera kort', desc: 'Dubbelklicka på kort för att redigera', action: null },
    { key: 'Right-click', icon: '📋', name: 'Kontextmeny', desc: 'Högerklicka på kort för meny', action: null },
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
  // ALWAYS fit ALL cards (like v2's cy.fit(null, 50))
  const cards = layer.getChildren().filter(node => node.getAttr('cardId'));

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

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  // Add fixed padding (50px like v2)
  const padding = 50;
  const paddedWidth = contentWidth + padding * 2;
  const paddedHeight = contentHeight + padding * 2;

  // Calculate scale to fit
  const scaleX = stage.width() / paddedWidth;
  const scaleY = stage.height() / paddedHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x

  // Calculate center of content
  const contentCenterX = minX + contentWidth / 2;
  const contentCenterY = minY + contentHeight / 2;

  // Set new scale
  stage.scale({ x: scale, y: scale });

  // Center the content in the stage
  stage.position({
    x: stage.width() / 2 - contentCenterX * scale,
    y: stage.height() / 2 - contentCenterY * scale
  });

  stage.batchDraw();
  console.log('Fitted and centered all cards in view');
}

// ============================================================================
// SECTION 10: SEARCH (Boolean Search, Wildcards, Proximity)
// ============================================================================

/**
 * Check if term matches with wildcard support
 */
function matchWithWildcard(term, searchableText) {
  if (term.includes('*')) {
    // Convert wildcard to regex
    const regexPattern = term.replace(/\*/g, '.*');
    const regex = new RegExp('\\b' + regexPattern + '\\b', 'i');
    return regex.test(searchableText);
  }
  return searchableText.includes(term);
}

/**
 * Check proximity search (NEAR/x or N/x)
 */
function checkProximity(query, searchableText) {
  // Match patterns like "word1 near/5 word2" or "word1 n/5 word2"
  const proximityMatch = query.match(/(.+?)\s+(near|n)\/(\d+)\s+(.+)/i);
  if (!proximityMatch) return false;

  const term1 = proximityMatch[1].trim();
  const distance = parseInt(proximityMatch[3]);
  const term2 = proximityMatch[4].trim();

  // Split text into words
  const words = searchableText.split(/\s+/);

  // Find positions of both terms
  const positions1 = [];
  const positions2 = [];

  words.forEach((word, index) => {
    if (matchWithWildcard(term1, word)) positions1.push(index);
    if (matchWithWildcard(term2, word)) positions2.push(index);
  });

  // Check if any pair is within distance
  for (const pos1 of positions1) {
    for (const pos2 of positions2) {
      if (Math.abs(pos1 - pos2) <= distance) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluate boolean search query
 * Supports: OR, AND, NOT, "exact phrases", *, ( ), NEAR/x, N/x
 */
function evaluateBooleanQuery(query, searchableText) {
  // Handle different boolean operators
  console.log('[evaluateBooleanQuery] Query:', query, 'SearchableText:', searchableText.substring(0, 50));

  // Handle parentheses (highest precedence)
  if (query.includes('(')) {
    // Find matching parentheses and evaluate recursively
    const parenMatch = query.match(/\(([^()]+)\)/);
    if (parenMatch) {
      const innerQuery = parenMatch[1];
      const innerResult = evaluateBooleanQuery(innerQuery, searchableText);
      // Replace the parentheses group with result placeholder
      const replaced = query.replace(parenMatch[0], innerResult ? '__TRUE__' : '__FALSE__');
      return evaluateBooleanQuery(replaced, searchableText);
    }
  }

  // Handle result placeholders from parentheses
  if (query === '__TRUE__') return true;
  if (query === '__FALSE__') return false;

  // Handle proximity search (NEAR/x or N/x)
  if (/\s+(near|n)\/\d+\s+/i.test(query)) {
    return checkProximity(query, searchableText);
  }

  // Split by OR first (lowest precedence)
  if (query.includes(' or ')) {
    const orParts = query.split(' or ');
    console.log('[evaluateBooleanQuery] OR parts:', orParts);
    return orParts.some(part => evaluateBooleanQuery(part.trim(), searchableText));
  }

  // Handle NOT operations
  if (query.includes(' not ')) {
    const notIndex = query.indexOf(' not ');
    const beforeNot = query.substring(0, notIndex).trim();
    const afterNot = query.substring(notIndex + 5).trim(); // ' not '.length = 5

    // If there's something before NOT, it must match
    let beforeMatches = true;
    if (beforeNot) {
      beforeMatches = evaluateBooleanQuery(beforeNot, searchableText);
    }

    // The part after NOT must NOT match
    const afterMatches = evaluateBooleanQuery(afterNot, searchableText);

    return beforeMatches && !afterMatches;
  }

  // Handle AND operations (default behavior and explicit)
  const andParts = query.includes(' and ') ?
    query.split(' and ') :
    query.split(' ').filter(term => term.length > 0);

  return andParts.every(term => {
    term = term.trim();
    console.log('[evaluateBooleanQuery] Checking term:', term);

    // Skip placeholders
    if (term === '__TRUE__') return true;
    if (term === '__FALSE__') return false;

    // Remove quotes if present for exact phrase matching
    if (term.startsWith('"') && term.endsWith('"')) {
      // Exact phrase search
      const phrase = term.slice(1, -1);
      console.log('[evaluateBooleanQuery] Exact phrase search:', phrase, 'Match:', searchableText.includes(phrase));
      return searchableText.includes(phrase);
    } else if (term.startsWith("'") && term.endsWith("'")) {
      // Also support single quotes
      const phrase = term.slice(1, -1);
      console.log('[evaluateBooleanQuery] Single quote phrase search:', phrase, 'Match:', searchableText.includes(phrase));
      return searchableText.includes(phrase);
    } else {
      // Regular word search with wildcard support
      const matches = matchWithWildcard(term, searchableText);
      console.log('[evaluateBooleanQuery] Regular/wildcard search:', term, 'Match:', matches);
      return matches;
    }
  });
}

/**
 * Search and highlight cards
 * @param {string} query - Search query
 */
export async function searchCards(query) {
  console.log('[searchCards] Called with query:', query);

  if (!layer) {
    console.error('[searchCards] Layer not initialized');
    return;
  }

  const allCards = await getAllCards();
  // Get all groups from layer that have a cardId attribute
  const allGroups = layer.getChildren().filter(node => node.getAttr('cardId'));

  console.log('[searchCards] Total cards in DB:', allCards.length);
  console.log('[searchCards] Total card groups on canvas:', allGroups.length);

  if (!query || query.trim() === '') {
    // Clear search - reset all cards
    console.log('[searchCards] Clearing search, resetting all cards');
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

  // Find matching cards using boolean logic
  allCards.forEach(card => {
    const text = (card.text || '').toLowerCase();
    const backText = (card.backText || '').toLowerCase();
    const tags = (card.tags || []).join(' ').toLowerCase();

    // Combine all searchable text
    const searchableText = [text, backText, tags].join(' ');

    console.log('[searchCards] Checking card:', card.id);

    // Use boolean query evaluation
    if (evaluateBooleanQuery(lowerQuery, searchableText)) {
      console.log('[searchCards] ✓ Match found:', card.id);
      matchingCards.add(card.id);
    }
  });

  console.log('[searchCards] Matching card IDs:', Array.from(matchingCards));

  // Apply visual effects
  allGroups.forEach(group => {
    const cardId = group.getAttr('cardId');
    const background = group.findOne('Rect');
    const isMatch = matchingCards.has(cardId);

    console.log('[searchCards] Group cardId:', cardId, 'isMatch:', isMatch, 'hasBackground:', !!background);

    if (isMatch) {
      // Matching card: mark and full opacity
      console.log('[searchCards] → Highlighting match:', cardId);
      group.opacity(1);
      group.addName('selected');
      if (background) {
        background.stroke('#2196F3');
        background.strokeWidth(3);
      }
    } else {
      // Non-matching card: fade and remove selection
      console.log('[searchCards] → Fading non-match:', cardId);
      group.opacity(0.3);
      group.removeName('selected');
      if (background) {
        background.stroke('#e0e0e0');
        background.strokeWidth(1);
      }
    }
  });

  layer.batchDraw();
  console.log(`[searchCards] ✓ Search complete: found ${matchingCards.size} matches for "${query}"`);
}

// ============================================================================
// SECTION 11: CONTEXT MENU & CARD ACTIONS (Lock, Pin)
// ============================================================================

/**
 * Show context menu for card
 */
function showContextMenu(x, y, cardId, group) {
  // Remove any existing context menu
  const existingMenu = document.getElementById('card-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const isLocked = group.getAttr('locked') || false;

  // Create menu
  const menu = document.createElement('div');
  menu.id = 'card-context-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    min-width: 150px;
    overflow: hidden;
  `;

  const menuItems = [
    {
      label: isLocked ? '📌 Avpinna kort' : '📌 Pinna kort',
      action: () => toggleLockCard(cardId, group)
    },
    {
      label: '✏️ Redigera',
      action: () => {
        if (group.getAttr('cardId')) {
          const cards = cardGroups.get(cardId);
          if (cards) {
            getAllCards().then(allCards => {
              const card = allCards.find(c => c.id === cardId);
              if (card && card.image) {
                flipCard(cardId);
              } else {
                openEditDialog(cardId);
              }
            });
          }
        }
      }
    },
    {
      label: '🗑️ Ta bort',
      action: () => deleteCard(cardId)
    }
  ];

  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.textContent = item.label;
    menuItem.style.cssText = `
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    `;
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.background = '#f5f5f5';
    });
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.background = 'white';
    });
    menuItem.addEventListener('click', () => {
      item.action();
      menu.remove();
    });
    menu.appendChild(menuItem);
  });

  document.body.appendChild(menu);

  // Close menu on click outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

/**
 * Toggle lock state for a card
 */
async function toggleLockCard(cardId, group) {
  const isLocked = group.getAttr('locked') || false;
  const newLockedState = !isLocked;

  // Update visual state
  group.draggable(!newLockedState);
  group.setAttr('locked', newLockedState);

  // Update database
  await updateCard(cardId, { locked: newLockedState });

  // Visual feedback - add lock icon
  updateLockIndicator(group, newLockedState);

  console.log(`Card ${cardId} ${newLockedState ? 'locked' : 'unlocked'}`);
  layer.batchDraw();
}

/**
 * Update lock indicator on card
 */
function updateLockIndicator(group, isLocked) {
  // Remove existing lock indicator
  const existingLock = group.findOne('.lock-indicator');
  if (existingLock) {
    existingLock.destroy();
  }

  if (isLocked) {
    // Add pin icon
    const background = group.findOne('Rect');
    if (background) {
      const pinIcon = new Konva.Text({
        text: '📌',
        x: background.width() - 30,
        y: 5,
        fontSize: 20,
        name: 'lock-indicator',
        listening: false
      });
      group.add(pinIcon);
    }
  }
}

/**
 * Toggle pin/unpin for selected cards
 */
async function togglePinSelectedCards() {
  const selectedGroups = layer.find('.selected');
  if (selectedGroups.length === 0) {
    console.log('No cards selected to pin/unpin');
    return;
  }

  // Check if any are pinned
  const anyPinned = selectedGroups.some(group => group.getAttr('locked'));

  for (const group of selectedGroups) {
    const cardId = group.getAttr('cardId');
    if (cardId) {
      // If any are pinned, unpin all. Otherwise, pin all.
      const newState = !anyPinned;
      group.draggable(!newState);
      group.setAttr('locked', newState);
      await updateCard(cardId, { locked: newState });
      updateLockIndicator(group, newState);
    }
  }

  console.log(`${anyPinned ? 'Unpinned' : 'Pinned'} ${selectedGroups.length} cards`);
  layer.batchDraw();
}

// ============================================================================
// SECTION 12: UI BUTTONS & THEME (Fit All, Add Menu, Theme Toggle)
// ============================================================================

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
 * Create "Command Palette" button
 */
function createCommandPaletteButton() {
  const button = document.createElement('button');
  button.id = 'command-palette-button';
  button.innerHTML = '⌘';
  button.title = 'Kommandopalett (Space)';
  button.style.cssText = `
    position: fixed;
    bottom: 168px;
    right: 24px;
    width: 56px;
    height: 56px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 28px;
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

  button.addEventListener('click', showCommandPalette);

  document.body.appendChild(button);
  console.log('Command Palette button created');
}

/**
 * Show add menu overlay
 */
function showAddMenu() {
  // Remove existing menu if any
  const existingMenu = document.getElementById('add-menu-overlay');
  if (existingMenu) {
    existingMenu.remove();
    return; // Toggle off
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'add-menu-overlay';
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
    z-index: 10002;
    backdrop-filter: blur(4px);
  `;

  // Create menu container
  const menu = document.createElement('div');
  menu.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    min-width: 300px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;

  // Title
  const title = document.createElement('h2');
  title.textContent = 'Snabbmeny';
  title.style.cssText = `
    margin: 0 0 20px 0;
    font-size: 24px;
    color: #1a1a1a;
  `;
  menu.appendChild(title);

  // Menu items
  const menuItems = [
    {
      icon: '📝',
      label: 'Nytt text-kort',
      desc: 'Skapa ett nytt text-kort',
      action: async () => {
        const pointer = stage.getPointerPosition();
        const scale = stage.scaleX();
        const position = pointer ? {
          x: (pointer.x - stage.x()) / scale,
          y: (pointer.y - stage.y()) / scale
        } : { x: 100, y: 100 };
        await createNewCard(position);
        overlay.remove();
      }
    },
    {
      icon: '🖼️',
      label: 'Importera bild',
      desc: 'Lägg till en bild från din enhet',
      action: async () => {
        overlay.remove(); // Remove overlay BEFORE opening file picker
        await importImage();
      }
    }
  ];

  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.style.cssText = `
      padding: 16px;
      margin-bottom: 8px;
      background: #f5f5f5;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 16px;
    `;

    menuItem.innerHTML = `
      <div style="font-size: 28px; flex-shrink: 0;">${item.icon}</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 16px; color: #1a1a1a; margin-bottom: 2px;">
          ${item.label}
        </div>
        <div style="font-size: 13px; color: #666;">
          ${item.desc}
        </div>
      </div>
    `;

    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.background = '#e8e8e8';
      menuItem.style.transform = 'translateX(4px)';
    });

    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.background = '#f5f5f5';
      menuItem.style.transform = 'translateX(0)';
    });

    menuItem.addEventListener('click', item.action);
    menu.appendChild(menuItem);
  });

  overlay.appendChild(menu);
  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  // Close on ESC
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Toggle theme
 */
function toggleTheme() {
  const body = document.body;
  const currentTheme = body.getAttribute('data-theme') || 'light';

  const themes = ['light', 'dark', 'eink'];
  const currentIndex = themes.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themes.length;
  const nextTheme = themes[nextIndex];

  body.setAttribute('data-theme', nextTheme);
  localStorage.setItem('theme', nextTheme);

  console.log(`Theme changed to: ${nextTheme}`);
}

/**
 * Toggle view from menu
 */
function toggleViewFromMenu() {
  // Call the main.js toggleView function via custom event
  window.dispatchEvent(new CustomEvent('toggleView'));
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
    button.style.transform = 'scale(1)';
    // Show overlay menu
    showAddMenu();
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

// ============================================================================
// SECTION 13: ARRANGEMENTS & KEYBOARD HANDLERS (Grid, Vertical, Horizontal, etc.)
// ============================================================================

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

  // Check if this is a grid arrangement that needs standard width
  const needsStandardWidth = arrangeName.includes('Grid Vertical') ||
                             arrangeName.includes('Grid Horizontal') ||
                             arrangeName.includes('Grid Top-Aligned');
  const standardWidth = 200;

  // Animate cards to new positions (and resize if needed)
  newPositions.forEach(({ id, x, y }) => {
    const group = cardGroups.get(id);
    if (!group) return;

    // Animate position
    group.to({
      x: x,
      y: y,
      duration: 0.3,
      easing: Konva.Easings.EaseOut
    });

    // Resize cards to standard width for grid arrangements
    if (needsStandardWidth) {
      const background = group.findOne('Rect');
      const text = group.findOne('Text');
      const image = group.findOne('Image');

      if (background) {
        const currentWidth = background.width();
        if (currentWidth !== standardWidth) {
          background.to({
            width: standardWidth,
            duration: 0.3,
            easing: Konva.Easings.EaseOut
          });
        }
      }

      if (text) {
        text.to({
          width: standardWidth - 20,
          duration: 0.3,
          easing: Konva.Easings.EaseOut
        });
      }

      if (image) {
        // Scale image proportionally to fit standard width
        const currentWidth = image.width();
        const currentHeight = image.height();
        if (currentWidth !== standardWidth) {
          const scale = standardWidth / currentWidth;
          image.to({
            width: standardWidth,
            height: currentHeight * scale,
            duration: 0.3,
            easing: Konva.Easings.EaseOut
          });

          // Also resize background to match new image height
          if (background) {
            background.to({
              height: currentHeight * scale + 60, // +60 for text area
              duration: 0.3,
              easing: Konva.Easings.EaseOut
            });
          }
        }
      }
    }

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

/**
 * Clear clipboard
 */
export function clearClipboard() {
  clipboard = [];
  console.log('Clipboard cleared');
}

/**
 * Deselect all cards
 */
export function deselectAllCards() {
  if (!layer) return;

  layer.find('.selected').forEach(group => {
    group.removeName('selected');
    const background = group.findOne('Rect');
    if (background) {
      background.stroke('#e0e0e0');
      background.strokeWidth(1);
    }
  });

  layer.batchDraw();
  console.log('All cards deselected');
}
