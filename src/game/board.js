import {
  Mesh, BoxGeometry, PlaneGeometry, MeshBasicMaterial, Vector3,
  BufferGeometry, LineDashedMaterial, Line
} from 'three';
import { BOARD_WIDTH, BOARD_HEIGHT, GRID_SPACING, BUBBLE_RADIUS, getBoardBounds } from './grid.js';

export function createBoardWalls(scene) {
  const floorMat = new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.08 });
  const bottomGeo = new BoxGeometry(BOARD_WIDTH * GRID_SPACING + 1, 0.05, 0.02);
  const floor = new Mesh(bottomGeo, floorMat);
  floor.position.set(0, -3.5, 0);
  scene.add(floor);
  return floor;
}

export function getBounds() {
  return getBoardBounds();
}
