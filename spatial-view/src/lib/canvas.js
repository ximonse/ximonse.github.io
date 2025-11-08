/**
 * Canvas module using Konva.js
 */

import Konva from 'konva';
import { getAllCards, updateCard, createCard, deleteCard } from './storage.js';

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

  // Store card ID on group
  group.setAttr('cardId', cardData.id);

  // Click to select (for deletion)
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
