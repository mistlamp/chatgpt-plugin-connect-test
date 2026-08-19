export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type Cell = number | null;
export type Board = Cell[][];
export type Point = { x: number; y: number };

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Piece = { type: PieceType; rotation: number; position: Point };

const SHAPES: Record<PieceType, Point[]> = {
  I: [{x:-1,y:0},{x:0,y:0},{x:1,y:0},{x:2,y:0}],
  O: [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}],
  T: [{x:-1,y:0},{x:0,y:0},{x:1,y:0},{x:0,y:1}],
  S: [{x:0,y:0},{x:1,y:0},{x:-1,y:1},{x:0,y:1}],
  Z: [{x:-1,y:0},{x:0,y:0},{x:0,y:1},{x:1,y:1}],
  J: [{x:-1,y:0},{x:0,y:0},{x:1,y:0},{x:1,y:1}],
  L: [{x:-1,y:0},{x:0,y:0},{x:1,y:0},{x:-1,y:1}],
};

export function createBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(null));
}

export function createPiece(type: PieceType, position: Point = { x: 4, y: 0 }): Piece {
  return { type, rotation: 0, position: { ...position } };
}

export function getCells(piece: Piece): Point[] {
  let cells = SHAPES[piece.type].map(p => ({ ...p }));
  const rotations = piece.rotation % 4;
  for (let i = 0; i < rotations; i++) {
    cells = cells.map(({ x, y }) => ({ x: -y, y: x }));
  }
  return cells.map(p => ({ x: p.x + piece.position.x, y: p.y + piece.position.y }));
}

export function canPlace(board: Board, piece: Piece): boolean {
  return getCells(piece).every(({ x, y }) =>
    x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT && board[y][x] === null
  );
}

export function movePiece(board: Board, piece: Piece, dx: number, dy: number): Piece | null {
  const moved = { ...piece, position: { x: piece.position.x + dx, y: piece.position.y + dy } };
  return canPlace(board, moved) ? moved : null;
}

export function rotatePiece(board: Board, piece: Piece): Piece | null {
  const rotated = { ...piece, rotation: (piece.rotation + 1) % 4 };
  if (canPlace(board, rotated)) return rotated;
  for (const kick of [-1, 1, -2, 2]) {
    const kicked = { ...rotated, position: { x: rotated.position.x + kick, y: rotated.position.y } };
    if (canPlace(board, kicked)) return kicked;
  }
  return null;
}

export function lockPiece(board: Board, piece: Piece, value = 1): Board {
  const next = board.map(row => [...row]);
  for (const { x, y } of getCells(piece)) {
    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) next[y][x] = value;
  }
  return next;
}

export function clearLines(board: Board): { board: Board; lines: number } {
  const remaining = board.filter(row => row.some(cell => cell === null));
  const lines = BOARD_HEIGHT - remaining.length;
  const empty = Array.from({ length: lines }, () => Array<Cell>(BOARD_WIDTH).fill(null));
  return { board: [...empty, ...remaining], lines };
}

export function scoreForLines(lines: number): number {
  return [0, 100, 300, 500, 800][lines] ?? lines * 200;
}
