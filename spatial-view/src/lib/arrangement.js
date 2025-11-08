/**
 * Card arrangement utilities
 * Adapted from spatial-notes-v2 for Konva.js
 */

/**
 * Arrange cards in vertical column
 * Based on v2's arrangeSelectedInColumn
 */
export function arrangeVertical(cards, centerPos) {
  const gap = 60; // 20% of 300px card width
  const positions = [];

  // Calculate total height needed
  let totalHeight = 0;
  cards.forEach((card, index) => {
    const height = card.height || 150;
    totalHeight += height;
    if (index < cards.length - 1) totalHeight += gap;
  });

  // Start from top, centered vertically around centerPos
  let currentY = centerPos.y - totalHeight / 2;

  cards.forEach(card => {
    const height = card.height || 150;
    const width = card.width || 200;

    positions.push({
      id: card.id,
      x: centerPos.x - width / 2, // Center horizontally
      y: currentY
    });

    currentY += height + gap;
  });

  return positions;
}

/**
 * Arrange cards in horizontal row
 * Based on v2's arrangeSelectedInRow
 */
export function arrangeHorizontal(cards, centerPos) {
  const gap = 60; // 20% spacing
  const positions = [];

  // Calculate total width needed
  let totalWidth = 0;
  cards.forEach((card, index) => {
    const width = card.width || 200;
    totalWidth += width;
    if (index < cards.length - 1) totalWidth += gap;
  });

  // Start from left, centered horizontally around centerPos
  let currentX = centerPos.x - totalWidth / 2;

  cards.forEach(card => {
    const width = card.width || 200;

    positions.push({
      id: card.id,
      x: currentX,
      y: centerPos.y // Top-aligned
    });

    currentX += width + gap;
  });

  return positions;
}

/**
 * Arrange cards in grid
 * Based on v2's arrangeSelectedInGrid
 */
export function arrangeGrid(cards, centerPos) {
  const spacing = 180; // Both horizontal and vertical
  const positions = [];

  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(cards.length));
  const rows = Math.ceil(cards.length / cols);

  const gridWidth = cols * spacing;
  const gridHeight = rows * spacing;

  // Start position (top-left of grid, centered around centerPos)
  const startX = centerPos.x - gridWidth / 2;
  const startY = centerPos.y - gridHeight / 2;

  cards.forEach((card, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    positions.push({
      id: card.id,
      x: startX + col * spacing,
      y: startY + row * spacing
    });
  });

  return positions;
}

/**
 * Arrange cards in cluster (circle)
 * Based on v2's clusterSelectedCards
 */
export function arrangeCluster(cards, centerPos) {
  const radius = 50;
  const positions = [];

  cards.forEach((card, index) => {
    const angle = (index / cards.length) * 2 * Math.PI;
    const x = centerPos.x + Math.cos(angle) * radius;
    const y = centerPos.y + Math.sin(angle) * radius;

    positions.push({
      id: card.id,
      x: x,
      y: y
    });
  });

  return positions;
}

/**
 * Arrange cards in vertical columns (grid variant)
 * Based on v2's arrangeSelectedGridVerticalColumns
 */
export function arrangeGridVertical(cards, centerPos) {
  const maxCols = 6;
  const colSpacing = 350; // Horizontal spacing
  const rowGap = 80; // Vertical gap between cards
  const positions = [];

  const cols = Math.min(maxCols, Math.ceil(Math.sqrt(cards.length)));
  const cardsPerCol = Math.ceil(cards.length / cols);

  // Calculate total grid dimensions
  const gridWidth = cols * colSpacing;

  // Start position
  const startX = centerPos.x - gridWidth / 2;
  const startY = centerPos.y; // Top-aligned

  let cardIndex = 0;
  for (let col = 0; col < cols && cardIndex < cards.length; col++) {
    let currentY = startY;

    for (let row = 0; row < cardsPerCol && cardIndex < cards.length; row++) {
      const card = cards[cardIndex];
      const height = card.height || 150;

      positions.push({
        id: card.id,
        x: startX + col * colSpacing,
        y: currentY
      });

      currentY += height + rowGap;
      cardIndex++;
    }
  }

  return positions;
}

/**
 * Arrange cards in packed rows (grid variant)
 * Based on v2's arrangeSelectedGridHorizontalPacked
 */
export function arrangeGridHorizontal(cards, centerPos) {
  const maxCols = 6;
  const colSpacing = 360; // Horizontal spacing (gives 60px gap for 300px cards)
  const rowPadding = 95; // Vertical padding
  const positions = [];

  // Group cards into rows
  const rows = [];
  for (let i = 0; i < cards.length; i += maxCols) {
    rows.push(cards.slice(i, i + maxCols));
  }

  // Calculate row heights (max card height in each row)
  const rowHeights = rows.map(row => {
    return Math.max(...row.map(card => card.height || 150));
  });

  const totalHeight = rowHeights.reduce((sum, h) => sum + h + rowPadding, -rowPadding);

  let currentY = centerPos.y - totalHeight / 2;

  rows.forEach((row, rowIndex) => {
    const rowWidth = row.length * colSpacing;
    let currentX = centerPos.x - rowWidth / 2;

    row.forEach(card => {
      positions.push({
        id: card.id,
        x: currentX,
        y: currentY
      });

      currentX += colSpacing;
    });

    currentY += rowHeights[rowIndex] + rowPadding;
  });

  return positions;
}

/**
 * Arrange cards in overlapping grid (for showing titles)
 * Based on v2's arrangeSelectedGridTopAligned
 */
export function arrangeGridTopAligned(cards, centerPos) {
  const maxCols = 6;
  const colSpacing = 15; // 5% of 300px - very tight
  const rowSpacing = 120; // Cards overlap, show 120px of each
  const positions = [];

  // Group into rows
  const rows = [];
  for (let i = 0; i < cards.length; i += maxCols) {
    rows.push(cards.slice(i, i + maxCols));
  }

  const totalHeight = rows.length * rowSpacing;
  let currentY = centerPos.y - totalHeight / 2;

  rows.forEach(row => {
    const rowWidth = row.length * (300 + colSpacing);
    let currentX = centerPos.x - rowWidth / 2;

    row.forEach(card => {
      positions.push({
        id: card.id,
        x: currentX,
        y: currentY
      });

      currentX += 300 + colSpacing;
    });

    currentY += rowSpacing;
  });

  return positions;
}
