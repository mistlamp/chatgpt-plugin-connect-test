import Phaser from 'phaser';
import {
  BOARD_HEIGHT, BOARD_WIDTH, Board, Piece, PieceType, canPlace, clearLines,
  createBoard, createPiece, getCells, lockPiece, movePiece, rotatePiece, scoreForLines,
} from './game/engine';
import './style.css';

const COLORS: Record<number, number> = { 1: 0x4cc9f0, 2: 0xf72585, 3: 0xb8f2e6, 4: 0xfca311, 5: 0x90be6d, 6: 0x9b5de5, 7: 0xffd166 };
const TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

type Button = Phaser.GameObjects.Text;

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
  private buttons: Button[] = [];
  private touchStart: { x: number; y: number } | null = null;

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
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.touchStart = { x: p.x, y: p.y }; });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.handleSwipe(p.x, p.y));
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
    this.cellSize = Math.floor(Math.min(width / (BOARD_WIDTH + 2), (height - 190) / BOARD_HEIGHT));
    this.cellSize = Math.max(16, this.cellSize);
    this.boardX = Math.floor((width - BOARD_WIDTH * this.cellSize) / 2);
    this.boardY = Math.max(50, Math.floor((height - BOARD_HEIGHT * this.cellSize - 115) / 2));
    this.scoreText.setPosition(16, 12);
    this.layoutButtons(width, height);
    this.renderBoard();
  }

  private layoutButtons(width: number, height: number) {
    if (!this.buttons.length) {
      const specs: [string, () => void][] = [['←', () => this.move(-1, 0)], ['↻', () => this.rotate()], ['→', () => this.move(1, 0)], ['↓', () => this.softDrop()], ['DROP', () => this.hardDrop()]];
      this.buttons = specs.map(([label, action]) => {
        const b = this.add.text(0, 0, label, { fontFamily: 'system-ui', fontSize: label === 'DROP' ? '16px' : '28px', color: '#ffffff', backgroundColor: '#182544', padding: { left: 12, right: 12, top: 7, bottom: 7 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        b.on('pointerdown', action);
        return b;
      });
    }
    const gap = Math.min(12, width * 0.025);
    const total = this.buttons.reduce((sum, b) => sum + b.width, 0) + gap * (this.buttons.length - 1);
    let x = (width - total) / 2;
    const y = height - 42;
    for (const b of this.buttons) { b.setPosition(x + b.width / 2, y); x += b.width + gap; }
  }

  private handleSwipe(x: number, y: number) {
    if (!this.touchStart) return;
    const dx = x - this.touchStart.x;
    const dy = y - this.touchStart.y;
    this.touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { this.rotate(); return; }
    if (Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 1 : -1, 0);
    else if (dy > 0) this.hardDrop();
    else this.rotate();
  }

  private newPiece() {
    const type = this.nextType;
    this.nextType = TYPES[Math.floor(Math.random() * TYPES.length)];
    this.active = createPiece(type, { x: 4, y: 0 });
    if (!canPlace(this.board, this.active)) {
      this.gameOver = true;
      this.scoreText.setText(`GAME OVER · ${this.score.toLocaleString()}점\nDROP 버튼으로 다시 시작`);
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

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#080c18',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390, height: 844 },
  input: { activePointers: 3 },
  scene: GameScene,
});
