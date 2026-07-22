export const BOARD_WIDTH = 12;
export const BOARD_HEIGHT = 22;
export const BUBBLE_RADIUS = 0.45;
export const GRID_SPACING = BUBBLE_RADIUS * 2.05;
export const ROW_OFFSET = GRID_SPACING * 0.5;
export const EXPLOSION_RADIUS = BUBBLE_RADIUS * 4;

export function gridToX(row, col) {
  const numInRow = BOARD_WIDTH - (row % 2 === 0 ? 0 : 1);
  const startX = -(numInRow - 1) * GRID_SPACING * 0.5;
  return startX + col * GRID_SPACING + (row % 2 === 0 ? 0 : ROW_OFFSET);
}

export function gridToY(row, col, ceilY) {
  return ceilY - row * GRID_SPACING * 0.866;
}

export function getNeighborPositions(row, col) {
  const parity = row % 2;
  const neighbors = [
    { row: row - 1, col: col - (parity === 0 ? 1 : 0) },
    { row: row - 1, col: col + (parity === 0 ? 0 : 1) },
    { row: row, col: col - 1 },
    { row: row, col: col + 1 },
    { row: row + 1, col: col - (parity === 0 ? 1 : 0) },
    { row: row + 1, col: col + (parity === 0 ? 0 : 1) }
  ];
  return neighbors.filter(n => {
    const numInRow = BOARD_WIDTH - (n.row % 2 === 0 ? 0 : 1);
    return n.col >= 0 && n.col < numInRow && n.row >= 0;
  });
}

export function getBoardBounds() {
  return {
    ceilY: BOARD_HEIGHT * 0.5 * GRID_SPACING - BUBBLE_RADIUS,
    leftBound: -BOARD_WIDTH * 0.5 * GRID_SPACING + BUBBLE_RADIUS,
    rightBound: BOARD_WIDTH * 0.5 * GRID_SPACING - BUBBLE_RADIUS,
    floorY: -3.5 + BUBBLE_RADIUS
  };
}
