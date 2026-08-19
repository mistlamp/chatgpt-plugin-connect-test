import Phaser from 'phaser';
import {
  BOARD_HEIGHT, BOARD_WIDTH, Board, Piece, PieceType, canPlace, clearLines,
  createBoard, createPiece, getCells, lockPiece, movePiece, rotatePiece, scoreForLines,
} from './game/engine';
import './style.css';

const COLORS: Record<number, number> = { 1: 0x4cc9f0, 2: 0xf72585, 3: 0xb8f2e6, 4: 0xfca311, 5: 0x90be6d, 6: 0x9b5de5, 7: 0xffd166 };
const TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

class GameScene extends Phaser.Scene {
  private board: Board = createBoard();
  private active!: Piece;
  private nextType: PieceType = 'T';
  private score = 0;
  private lines = 0;
  private tick = 0;
  private cellSize = 28;
  private boardX = 0;
  private boardY = 0;
  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private gameOver = false;

  constructor() { super('game'); }

  create() {
    this.graphics = this.add.graphics();
    this.scoreText = this.add.text(0, 0, '', { fontFamily: 'system-ui', fontSize: '18px', color: '#eef2ff' });
    this.newPiece();
    this.input.keyboard?.on('keydown-LEFT', () => this.move(-1, 0));
    this.input.keyboard?.on('keydown-RIGHT', () => this.move(1, 0));
    this.input.keyboard?.on('keydown-DOWN', () => this.softDrop());
    this.input.keyboard?.on('keydown-UP', () => this.rotate());
    this.input.keyboard?.on('keydown-SPACE', () => this.hardDrop());
    this.scale.on('resize', () => this.layout());
    this.layout();
    this.renderBoard();
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;
    this.tick += delta;
    const interval = Math.max(100, 650 - Math.floor(this.lines / 10) * 45);
    if (this.tick >= interval) { this.tick = 0; this.softDrop(); }
  }

  private layout() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cellSize = Math.floor(Math.min(width / (BOARD_WIDTH + 2), (height - 170) / BOARD_HEIGHT));
    this.cellSize = Math.max(16, this.cellSize);
    this.boardX = Math.floor((width - BOARD_WIDTH * this.cellSize) / 2);
    this.boardY = Math.max(50, Math.floor((height - BOARD_HEIGHT * this.cellSize - 90) / 2));
    this.scoreText.setPosition(16, 12);
    this.renderBoard();
  }

  private newPiece() {
    const type = this.nextType;
    this.nextType = TYPES[Math.floor(Math.random() * TYPES.length)];
    this.active = createPiece(type, { x: 4, y: 0 });
    if (!canPlace(this.board, this.active)) {
      this.gameOver = true;
      this.scoreText.setText(`GAME OVER  ·  ${this.score.toLocaleString()}점\n탭/스페이스로 다시 시작`);
    }
  }

  private move(dx: number, dy: number) {
    if (this.gameOver) return;
    const moved = movePiece(this.board, this.active, dx, dy);
    if (moved) { this.active = moved; this.renderBoard(); }
  }

  private softDrop() {
    if (this.gameOver) return;
    const moved = movePiece(this.board, this.active, 0, 1);
    if (moved) { this.active = moved; this.score += 1; this.renderBoard(); }
    else this.lock();
  }

  private hardDrop() {
    if (this.gameOver) { this.restart(); return; }
    while (true) { const moved = movePiece(this.board, this.active, 0, 1); if (!moved) break; this.active = moved; this.score += 2; }
    this.lock();
  }

  private rotate() {
    if (this.gameOver) return;
    const rotated = rotatePiece(this.board, this.active);
    if (rotated) { this.active = rotated; this.renderBoard(); }
  }

  private lock() {
    this.board = lockPiece(this.board, this.active, TYPES.indexOf(this.active.type) + 1);
    const result = clearLines(this.board);
    this.board = result.board;
    this.lines += result.lines;
    this.score += scoreForLines(result.lines);
    this.newPiece();
    this.renderBoard();
  }

  private restart() {
    this.board = createBoard(); this.score = 0; this.lines = 0; this.tick = 0; this.gameOver = false;
    this.newPiece(); this.renderBoard();
  }

  private renderBoard() {
    if (!this.graphics || !this.scoreText || !this.active) return;
    this.graphics.clear();
    this.graphics.fillStyle(0x0f1730, 1);
    this.graphics.fillRoundedRect(this.boardX - 5, this.boardY - 5, BOARD_WIDTH * this.cellSize + 10, BOARD_HEIGHT * this.cellSize + 10, 8);
    for (let y = 0; y < BOARD_HEIGHT; y++) for (let x = 0; x < BOARD_WIDTH; x++) {
      const value = this.board[y][x];
      this.drawCell(x, y, value ? COLORS[value] : 0x1b2645, value ? 1 : 0.45);
    }
    if (!this.gameOver) for (const { x, y } of getCells(this.active)) this.drawCell(x, y, COLORS[TYPES.indexOf(this.active.type) + 1], 1);
    this.scoreText.setText(`SCORE ${this.score.toLocaleString()}    LINES ${this.lines}`);
  }

  private drawCell(x: number, y: number, color: number, alpha: number) {
    const px = this.boardX + x * this.cellSize;
    const py = this.boardY + y * this.cellSize;
    this.graphics.fillStyle(color, alpha);
    this.graphics.fillRoundedRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2, Math.max(2, this.cellSize * 0.16));
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#080c18',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390, height: 844 },
  input: { activePointers: 3 },
  scene: GameScene,
};

const game = new Phaser.Game(config);
window.addEventListener('pointerdown', () => game.scene.getScene('game') && (game.scene.getScene('game') as GameScene), { passive: true });
