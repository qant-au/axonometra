import type { EditorInstance } from '../instance/EditorInstance';
import { IViewportOptions, Viewport } from 'pixi-viewport';
import {
  FederatedPointerEvent,
  Graphics,
  isMobile,
  Point,
  Texture,
  TilingSprite
} from 'pixi.js';
import { getPreloadImageUrls } from '../../res/catalog';
// Imported, not fetched from /: the bundler ships it with the code, so it
// loads wherever the editor is hosted.
import patternUrl from '../../res/pattern.svg';
import { loadedTexture, loadTexture } from './textures';
import { FloorPlan } from './objects/FloorPlan';
import { TransformLayer } from './objects/TransformControls/TransformLayer';
import { AddNodeAction } from './actions/AddNodeAction';
import { AddWallManager } from './actions/AddWallManager';
import { METER, MIN_ZOOM, Tool } from './constants';
import { Pointer } from './Pointer';
import { Preview } from './actions/MeasureToolManager';
import { SelectionOverlay } from './selection/SelectionOverlay';
import { refsInRect } from './selection/planOps';
import { interpretWheel } from './wheel';
import {
  GRID_MINOR_MIN_ZOOM,
  GRID_MINOR_STEP,
  GRID_PATTERN_MIN_ZOOM,
  gridLines,
  toPixelCentre
} from './grid';
import { isTypingTarget } from '@accurona/core';

// A press that moves less than this, in screen pixels, is a click, not a
// marquee.
const MARQUEE_SLOP = 4;

export class Main extends Viewport {
  private floorPlan!: FloorPlan;
  transformLayer!: TransformLayer;
  addWallManager!: AddWallManager;
  bkgPattern!: TilingSprite;
  /** Zoomed out past GRID_PATTERN_MIN_ZOOM: the grid, drawn line by line. */
  lineGrid!: Graphics;
  private lineGridFor = '';
  /** setup() has run: the plugins are on and the plan is drawn. */
  ready = false;
  public pointer!: Pointer;
  public preview: Preview;
  public selectionOverlay!: SelectionOverlay;
  private marqueeStart: {
    x: number;
    y: number;
    sx: number;
    sy: number;
    add: boolean;
  } | null = null;
  private spaceHeld = false;
  // Space listens where the editor's other keys do (EditorInstance.keyTarget).
  private keyTarget?: Document | HTMLElement;
  constructor(
    private readonly inst: EditorInstance,
    options: IViewportOptions
  ) {
    super(options);

    // Preload the background pattern and the door/window images (furniture
    // icons load on first use; see ./textures.ts), then build the scene. The
    // load also defers setup() until after EditorRoot has added this viewport
    // to the stage (clamp() reads the viewport's world transform).
    // A failed image must not leave the editor half-built: setup() wires the
    // tools, so it runs whether or not every preload arrived. A missing icon
    // shows as a placeholder instead.
    Promise.all([patternUrl, ...getPreloadImageUrls()].map(loadTexture))
      .catch((error: unknown) => console.error('Preload failed:', error))
      .finally(() => this.setup());
    this.preview = new Preview(this.inst);
    this.cursor = 'none';
  }

  private unsubscribeTool?: () => void;

  // Right-drag pans in every tool; in View, the hand tool, a left drag does
  // too, since nothing else is waiting for it there. So does any drag while
  // Space is held. The wheel is handled by handleWheel, not the plugin.
  private panWith(tool: Tool) {
    return this.drag({
      mouseButtons: tool === Tool.View || this.spaceHeld ? 'all' : 'right',
      wheel: false
    });
  }

  public override destroy(options?: Parameters<Viewport['destroy']>[0]) {
    this.unsubscribeTool?.();
    this.keyTarget?.removeEventListener('keydown', this.onSpaceDown);
    this.keyTarget?.removeEventListener('keyup', this.onSpaceUp);
    window.removeEventListener('blur', this.onSpaceUp);
    super.destroy(options);
  }

  // Space + drag pans from any tool, as in Excalidraw. While Space is held
  // the plan's objects take no presses, so the drag reaches the viewport.
  private setSpaceHeld(held: boolean) {
    if (this.spaceHeld === held || this.destroyed) return;
    this.spaceHeld = held;
    if (this.floorPlan) this.floorPlan.interactiveChildren = !held;
    if (this.transformLayer) this.transformLayer.interactiveChildren = !held;
    this.cursor = held ? 'grab' : 'none';
    this.panWith(this.inst.editor.getState().activeTool);
  }

  private readonly onSpaceDown = (event: Event) => {
    const e = event as KeyboardEvent;
    if (e.code !== 'Space' || e.repeat || isTypingTarget(e.target)) return;
    this.setSpaceHeld(true);
  };

  private readonly onSpaceUp = (e: Event) => {
    if (e instanceof KeyboardEvent && e.code !== 'Space') return;
    this.setSpaceHeld(false);
  };

  /**
   * The wheel, per the shared keymap: plain pans, Shift pans sideways,
   * Ctrl/Cmd (and a trackpad pinch) zooms about the pointer.
   */
  public handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (this.pause || this.destroyed) return;
    const result = interpretWheel(e);
    if (result.kind === 'pan') {
      this.x -= result.dx;
      this.y -= result.dy;
    } else {
      const screen = new Point(e.offsetX, e.offsetY);
      const before = this.toWorld(screen);
      this.setZoom(this.scale.x * result.factor);
      (
        this.plugins.get('clamp-zoom') as { clamp?: () => void } | null
      )?.clamp?.();
      const after = this.toScreen(before);
      this.x += screen.x - after.x;
      this.y += screen.y - after.y;
    }
    this.emit('moved', { viewport: this, type: 'wheel' });
  }

  private setup() {
    // React StrictMode (dev) mounts EditorRoot twice; the first viewport is
    // destroyed before this deferred callback runs. Bail out rather than wire
    // plugins onto a torn-down viewport (whose transform is now null) — v7's
    // clamp plugin reads viewport.x and would throw.
    if (this.destroyed) return;
    // The view may go half a world past each edge, so a plan drawn near the
    // origin (a scene from another tool starts at 0, 0) can still be centred,
    // and may zoom out far enough to take the whole world in.
    const padX = this.worldWidth / 2;
    const padY = this.worldHeight / 2;
    this.panWith(this.inst.editor.getState().activeTool)
      .clamp({
        left: -padX,
        top: -padY,
        right: this.worldWidth + padX,
        bottom: this.worldHeight + padY,
        underflow: 'center'
      })
      .pinch()
      .clampZoom({ minScale: MIN_ZOOM, maxScale: 6.0 });
    this.keyTarget = this.inst.keyTarget;
    this.keyTarget.addEventListener('keydown', this.onSpaceDown);
    this.keyTarget.addEventListener('keyup', this.onSpaceUp);
    window.addEventListener('blur', this.onSpaceUp);
    this.unsubscribeTool = this.inst.editor.subscribe((state, previous) => {
      if (state.activeTool !== previous.activeTool) {
        // A new tool starts with pan and zoom working.
        this.pause = false;
        // Esc may put the Measure tool down mid-measurement.
        if (previous.activeTool === Tool.Measure) this.preview.set(undefined);
        this.panWith(state.activeTool);
      }
    });
    // The grid covers everywhere the view can go.
    this.bkgPattern = new TilingSprite({
      texture: loadedTexture(patternUrl) ?? Texture.WHITE,
      width: this.worldWidth + 2 * padX,
      height: this.worldHeight + 2 * padY
    });
    this.bkgPattern.position.set(-padX, -padY);
    this.center = new Point(this.worldWidth / 2, this.worldHeight / 2);
    this.addChild(this.bkgPattern);
    this.lineGrid = new Graphics();
    this.lineGrid.eventMode = 'none';
    this.addChild(this.lineGrid);
    this.onRender = () => this.drawGrid();

    this.floorPlan = this.inst.getFloorPlanView();
    this.addChild(this.floorPlan);

    this.transformLayer = this.inst.transformLayer;
    this.addChild(this.transformLayer);

    this.addWallManager = this.inst.addWallManager;
    this.addChild(this.addWallManager.preview.getReference());
    // The measurement draws over the plan, its room areas included.
    this.addChild(this.preview.getReference());

    this.selectionOverlay = new SelectionOverlay(this.inst);
    this.addChild(this.selectionOverlay);

    this.pointer = new Pointer(this.inst);
    this.addChild(this.pointer);
    this.on('pointerdown', this.checkTools);
    this.on('pointermove', this.updatePreview);
    this.on('pointerup', this.updateEnd);
    this.on('pointerupoutside', this.updateEnd);

    this.ready = true;
    // A plan loaded before the canvas was ready is framed now.
    if (this.inst.frameOnSetup) this.inst.frameAll();
  }
  /**
   * Zoomed out, the grid pattern's texture drops some of its thin lines and
   * leaves uneven gaps, so there the grid is drawn line by line, each a
   * screen pixel wide on a whole pixel, over just the part of the plan on
   * screen. The 10 cm lines go once they would be under GRID_MINOR_MIN_PX
   * apart, where they run together into bands, leaving the metre lines.
   */
  private drawGrid() {
    const zoom = this.scale.x;
    const drawn = zoom < GRID_PATTERN_MIN_ZOOM;
    this.bkgPattern.visible = !drawn;
    this.lineGrid.visible = drawn;
    if (!drawn) return;
    const view = {
      x: this.left,
      y: this.top,
      width: this.worldScreenWidth,
      height: this.worldScreenHeight
    };
    const key = [zoom, view.x, view.y, view.width, view.height].join();
    if (key === this.lineGridFor) return;
    this.lineGridFor = key;
    const bounds = {
      x: this.bkgPattern.x,
      y: this.bkgPattern.y,
      width: this.bkgPattern.width,
      height: this.bkgPattern.height
    };
    const top = Math.max(view.y, bounds.y);
    const bottom = Math.min(view.y + view.height, bounds.y + bounds.height);
    const left = Math.max(view.x, bounds.x);
    const right = Math.min(view.x + view.width, bounds.x + bounds.width);
    const g = this.lineGrid.clear();
    const draw = (step: number, alpha: number) => {
      const { xs, ys } = gridLines(view, bounds, step);
      // The minor lines leave the metre lines to their own, darker pass.
      const keep = (v: number) => step === METER || v % METER !== 0;
      g.beginPath();
      for (const x of xs.filter(keep)) {
        const sx = toPixelCentre(x, view.x, zoom);
        g.moveTo(sx, top).lineTo(sx, bottom);
      }
      for (const y of ys.filter(keep)) {
        const sy = toPixelCentre(y, view.y, zoom);
        g.moveTo(left, sy).lineTo(right, sy);
      }
      g.stroke({ width: 1 / zoom, color: 0x808080, alpha });
    };
    // As dark as the pattern draws its lines at full size, so the grid does
    // not darken as the zoom drops below it.
    if (zoom >= GRID_MINOR_MIN_ZOOM) draw(GRID_MINOR_STEP, 0.25);
    draw(METER, 0.63);
  }

  private updatePreview(ev: FederatedPointerEvent) {
    this.addWallManager.updatePreview(ev);
    this.preview.updatePreview(ev);
    this.pointer.update(ev);
    if (this.marqueeStart) {
      const here = this.toWorld(ev.global);
      const { x, y } = this.marqueeStart;
      this.selectionOverlay.setMarquee({
        x: Math.min(x, here.x),
        y: Math.min(y, here.y),
        width: Math.abs(here.x - x),
        height: Math.abs(here.y - y)
      });
    }
  }

  // A drag on the empty plan with the Select tool selects what it encloses.
  private endMarquee(ev: FederatedPointerEvent) {
    const start = this.marqueeStart;
    if (!start) return;
    this.marqueeStart = null;
    this.selectionOverlay.setMarquee(null);
    const moved = Math.hypot(ev.global.x - start.sx, ev.global.y - start.sy);
    if (moved < MARQUEE_SLOP) return;
    const here = this.toWorld(ev.global);
    const floor = this.inst.commands.currentFloorData();
    if (!floor) return;
    const refs = refsInRect(floor, {
      x: Math.min(start.x, here.x),
      y: Math.min(start.y, here.y),
      width: Math.abs(here.x - start.x),
      height: Math.abs(here.y - start.y)
    });
    this.inst.commands.selectRefs(refs, start.add);
  }
  // Pan and zoom are paused while a wall or measurement is being pressed
  // out; every release resumes them (except wall drawing on touch, which
  // keeps them off for the whole chain). Releases outside the canvas count
  // too: a pause that was never lifted left pan and zoom dead in every tool.
  private updateEnd(ev: FederatedPointerEvent) {
    this.endMarquee(ev);
    const tool = this.inst.editor.getState().activeTool;
    if (tool === Tool.Measure) this.preview.set(undefined);
    if (!(tool === Tool.WallAdd && isMobile)) this.pause = false;
  }
  private checkTools(ev: FederatedPointerEvent) {
    ev.stopPropagation();
    if (ev.button == 2) {
      this.inst.pointer.rightPressed(null, ev);
      return;
    }
    // Space + drag is a pan, whatever the tool.
    if (this.spaceHeld) return;
    const point = { x: 0, y: 0 };
    switch (this.inst.editor.getState().activeTool) {
      case Tool.WallAdd: {
        this.pause = true;
        point.x = this.inst.viewportX(ev.global.x);
        point.y = this.inst.viewportY(ev.global.y);
        const action = new AddNodeAction(this.inst, undefined, point);
        action.execute();
        break;
      }
      case Tool.Edit: {
        // A press on the empty plan: deselect (Shift keeps the selection,
        // for an additive marquee) and start a marquee.
        if (!ev.shiftKey) this.inst.selection.getState().clear();
        const world = this.toWorld(ev.global);
        this.marqueeStart = {
          x: world.x,
          y: world.y,
          sx: ev.global.x,
          sy: ev.global.y,
          add: ev.shiftKey
        };
        break;
      }
      case Tool.Measure:
        this.pause = true;
        point.x = this.inst.viewportX(ev.global.x);
        point.y = this.inst.viewportY(ev.global.y);
        this.preview.set(point);
        break;
    }
  }
}
