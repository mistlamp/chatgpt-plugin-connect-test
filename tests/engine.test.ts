import { describe, expect, it } from 'vitest';
import {
  BOARD_HEIGHT, BOARD_WIDTH, canPlace, clearLines, createBoard, createPiece,
  getCells, lockPiece, movePiece, rotatePiece, scoreForLines,
} from '../src/game/engine';

describe('Tetris rules engine', () => {
  it('creates a 10x20 empty board', () => {
    const board = createBoard();
    expect(board).toHaveLength(BOARD_HEIGHT);
    expect(board.every(row => row.length === BOARD_WIDTH && row.every(c => c === null))).toBe(true);
  });

  it('detects occupied cells and board boundaries', () => {
    const board = createBoard();
    const piece = createPiece('O', { x: 4, y: 0 });
    expect(canPlace(board, piece)).toBe(true);
    const blocked = lockPiece(board, createPiece('O', { x: 4, y: 1 }));
    expect(canPlace(blocked, piece)).toBe(false);
    expect(canPlace(board, createPiece('I', { x: 0, y: 0 }))).toBe(false);
  });

  it('moves only when the destination is valid', () => {
    const board = createBoard();
    const piece = createPiece('O', { x: 4, y: 0 });
    expect(movePiece(board, piece, 1, 1)?.position).toEqual({ x: 5, y: 1 });
    expect(movePiece(board, piece, -5, 0)).toBeNull();
  });

  it('rotates and applies simple wall kicks', () => {
    const board = createBoard();
    const piece = createPiece('T', { x: 0, y: 2 });
    const rotated = rotatePiece(board, piece);
    expect(rotated).not.toBeNull();
    expect(rotated!.rotation).toBe(1);
    expect(canPlace(board, rotated!)).toBe(true);
  });

  it('locks a piece and clears completed lines', () => {
    let board = createBoard();
    for (let x = 0; x < BOARD_WIDTH - 2; x++) board[BOARD_HEIGHT - 1][x] = 1;
    board = lockPiece(board, createPiece('O', { x: 8, y: BOARD_HEIGHT - 2 }));
    const result = clearLines(board);
    expect(result.lines).toBe(1);
    expect(result.board[BOARD_HEIGHT - 1].every(c => c === null)).toBe(true);
  });

  it('uses standard line-clear scoring', () => {
    expect(scoreForLines(0)).toBe(0);
    expect(scoreForLines(1)).toBe(100);
    expect(scoreForLines(2)).toBe(300);
    expect(scoreForLines(3)).toBe(500);
    expect(scoreForLines(4)).toBe(800);
  });

  it('keeps piece cells deterministic', () => {
    expect(getCells(createPiece('O', { x: 4, y: 0 }))).toEqual([
      {x:4,y:0},{x:5,y:0},{x:4,y:1},{x:5,y:1}
    ]);
  });
});
