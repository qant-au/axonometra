import { IViewportOptions, Viewport } from 'pixi-viewport';
import {
  Assets,
  FederatedPointerEvent,
  isMobile,
  Point,
  TilingSprite
} from 'pixi.js';
import { getPreloadImageUrls } from '../../res/catalog';
import { FloorPlan } from './objects/FloorPlan';
import { getFloorPlan } from '../EditorRoot';
import { TransformLayer } from './objects/TransformControls/TransformLayer';
import { useStore } from '../../stores/EditorStore';
import { AddNodeAction } from './actions/AddNodeAction';
import { AddWallManager } from './actions/AddWallManager';
import { viewportX, viewportY } from '../../helpers/ViewportCoordinates';
import { Tool } from './constants';
import { Pointer } from './Pointer';
import { Preview } from './actions/MeasureToolManager';
import { SelectionOverlay } from './selection/SelectionOverlay';
import { refsInRect } from './selection/planOps';
import { currentFloorData, selectRefs } from './selection/commands';
import { rightPressed } from './selection/pointer';
import { useSelectionStore } from './selection/SelectionStore';
import { interpretWheel } from './wheel';
import { isTypingTarget } from '../../vendor/accurona-core';

// A press that moves less than this, in screen pixels, is a click, not a
// marquee.
const MARQUEE_SLOP = 4;

export class Main extends Viewport {
  private floorPlan!: FloorPlan;
  transformLayer!: TransformLayer;
  addWallManager!: AddWallManager;
  bkgPattern!: TilingSprite;
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
  constructor(options: IViewportOptions) {
    super(options);

    // v8 Texture.from/TilingSprite.from only resolve a URL once it's been
    // loaded through Assets, so preload the background pattern and the
    // door/window images (furniture icons load on first use), then build the
    // scene. The load also defers setup() until after EditorRoot has added
    // this viewport to the stage (clamp() reads the viewport's world
    // transform). Replaces the removed-in-v7 Loader.shared.
    // A failed image must not leave the editor half-built: setup() wires the
    // tools, so it runs whether or not every preload arrived. A missing icon
    // shows as a placeholder instead.
    Assets.load(['./pattern.svg', ...getPreloadImageUrls()])
      .catch((error: unknown) => console.error('Preload failed:', error))
      .finally(() => this.setup());
    this.preview = new Preview();
    this.addChild(this.preview.getReference());
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
    window.removeEventListener('keydown', this.onSpaceDown);
    window.removeEventListener('keyup', this.onSpaceUp);
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
    this.panWith(useStore.getState().activeTool);
  }

  private readonly onSpaceDown = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || e.repeat || isTypingTarget(e.target)) return;
    this.setSpaceHeld(true);
  };

  private readonly onSpaceUp = (e: KeyboardEvent | FocusEvent) => {
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
    this.panWith(useStore.getState().activeTool)
      .clamp({ direction: 'all' })
      .pinch()
      .clampZoom({ minScale: 1.0, maxScale: 6.0 });
    window.addEventListener('keydown', this.onSpaceDown);
    window.addEventListener('keyup', this.onSpaceUp);
    window.addEventListener('blur', this.onSpaceUp);
    this.unsubscribeTool = useStore.subscribe((state, previous) => {
      if (state.activeTool !== previous.activeTool) {
        // A new tool starts with pan and zoom working.
        this.pause = false;
        this.panWith(state.activeTool);
      }
    });
    this.bkgPattern = TilingSprite.from('./pattern.svg', {
      width: this.worldWidth ?? 0,
      height: this.worldHeight ?? 0
    });
    this.center = new Point(this.worldWidth / 2, this.worldHeight / 2);
    this.addChild(this.bkgPattern);

    this.floorPlan = getFloorPlan();
    this.addChild(this.floorPlan);

    this.transformLayer = TransformLayer.Instance;
    this.addChild(this.transformLayer);

    this.addWallManager = AddWallManager.Instance;
    this.addChild(this.addWallManager.preview.getReference());

    this.selectionOverlay = new SelectionOverlay();
    this.addChild(this.selectionOverlay);

    this.pointer = new Pointer();
    this.addChild(this.pointer);
    this.on('pointerdown', this.checkTools);
    this.on('pointermove', this.updatePreview);
    this.on('pointerup', this.updateEnd);
    this.on('pointerupoutside', this.updateEnd);
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
    const floor = currentFloorData();
    if (!floor) return;
    const refs = refsInRect(floor, {
      x: Math.min(start.x, here.x),
      y: Math.min(start.y, here.y),
      width: Math.abs(here.x - start.x),
      height: Math.abs(here.y - start.y)
    });
    selectRefs(refs, start.add);
  }
  // Pan and zoom are paused while a wall or measurement is being pressed
  // out; every release resumes them (except wall drawing on touch, which
  // keeps them off for the whole chain). Releases outside the canvas count
  // too: a pause that was never lifted left pan and zoom dead in every tool.
  private updateEnd(ev: FederatedPointerEvent) {
    this.endMarquee(ev);
    const tool = useStore.getState().activeTool;
    if (tool === Tool.Measure) this.preview.set(undefined);
    if (!(tool === Tool.WallAdd && isMobile)) this.pause = false;
  }
  private checkTools(ev: FederatedPointerEvent) {
    ev.stopPropagation();
    if (ev.button == 2) {
      rightPressed(null, ev);
      return;
    }
    // Space + drag is a pan, whatever the tool.
    if (this.spaceHeld) return;
    const point = { x: 0, y: 0 };
    switch (useStore.getState().activeTool) {
      case Tool.WallAdd: {
        this.pause = true;
        point.x = viewportX(ev.global.x);
        point.y = viewportY(ev.global.y);
        const action = new AddNodeAction(undefined, point);
        action.execute();
        break;
      }
      case Tool.Edit: {
        // A press on the empty plan: deselect (Shift keeps the selection,
        // for an additive marquee) and start a marquee.
        if (!ev.shiftKey) useSelectionStore.getState().clear();
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
        point.x = viewportX(ev.global.x);
        point.y = viewportY(ev.global.y);
        this.preview.set(point);
        break;
    }
  }
}
