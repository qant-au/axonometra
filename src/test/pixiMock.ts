// Minimal Pixi.js stand-in for vitest unit tests that exercise the editor
// engine. Each test file installs it via
//   vi.mock('pixi.js', async () => (await import('../../../test/pixiMock')).createPixiMock())
// The mocks are deliberately thin — they support the constructor + property +
// chained-builder surface the engine code actually touches, and nothing more.
import { vi } from 'vitest';

class EventEmitterMock {
  private handlers = new Map<string, Array<(...args: unknown[]) => void>>();
  on(event: string, handler: (...args: unknown[]) => void) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
    return this;
  }
  off(event: string, handler: (...args: unknown[]) => void) {
    const list = this.handlers.get(event);
    if (!list) return this;
    const i = list.indexOf(handler);
    if (i !== -1) list.splice(i, 1);
    return this;
  }
  emit(event: string, ...args: unknown[]) {
    for (const h of this.handlers.get(event) ?? []) h(...args);
    return true;
  }
}

class PointMock {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class ContainerMock extends EventEmitterMock {
  children: ContainerMock[] = [];
  parent: ContainerMock | null = null;
  sortableChildren = false;
  interactive = false;
  buttonMode = false;
  visible = true;
  zIndex = 0;
  cursor = 'default';
  angle = 0;
  rotation = 0;
  position = new PointMock();
  pivot = new PointMock();
  scale = new PointMock(1, 1);
  width = 0;
  height = 0;
  destroyed = false;

  addChild<T extends ContainerMock>(child: T): T {
    this.children.push(child);
    child.parent = this;
    return child;
  }
  removeChild<T extends ContainerMock>(child: T): T {
    const i = this.children.indexOf(child);
    if (i !== -1) this.children.splice(i, 1);
    child.parent = null;
    return child;
  }
  destroy(_opts?: unknown) {
    this.destroyed = true;
  }
  getGlobalPosition() {
    return new PointMock(this.position.x, this.position.y);
  }
  getBounds() {
    return { x: 0, y: 0, width: this.width, height: this.height };
  }
}

class GraphicsMock extends ContainerMock {
  anchor = new PointMock();
  clear() {
    return this;
  }
  beginFill(_color?: number) {
    return this;
  }
  endFill() {
    return this;
  }
  lineStyle(_w?: number, _c?: number) {
    return this;
  }
  drawRect(_x: number, _y: number, _w: number, _h: number) {
    return this;
  }
  drawCircle(_x: number, _y: number, _r: number) {
    return this;
  }
}

class SpriteMock extends ContainerMock {
  texture: unknown;
  anchor = new PointMock();
  constructor(texture?: unknown) {
    super();
    this.texture = texture;
  }
}

class TextMock {
  text: string;
  width = 50;
  height = 16;
  visible = true;
  position = new PointMock();
  constructor(text: string, _style?: unknown) {
    this.text = text;
  }
}

class TextStyleMock {
  constructor(opts: unknown) {
    Object.assign(this, opts as object);
  }
}

const TextureMock = {
  from: vi.fn((path: string) => ({ path })),
  WHITE: { white: true }
};

class TilingSpriteMock extends SpriteMock {
  static from(_path: string, _opts?: unknown) {
    return new TilingSpriteMock();
  }
}

export function createPixiMock() {
  return {
    Container: ContainerMock,
    Graphics: GraphicsMock,
    Sprite: SpriteMock,
    Text: TextMock,
    TextStyle: TextStyleMock,
    Texture: TextureMock,
    TilingSprite: TilingSpriteMock,
    Point: PointMock,
    Loader: { shared: { onComplete: { once: vi.fn() }, load: vi.fn() } },
    Application: vi.fn(),
    autoDetectRenderer: vi.fn(),
    isMobile: false
  };
}

export type {
  ContainerMock as Container,
  GraphicsMock as Graphics,
  SpriteMock as Sprite
};
