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

export class Main extends Viewport {
  private floorPlan!: FloorPlan;
  transformLayer!: TransformLayer;
  addWallManager!: AddWallManager;
  bkgPattern!: TilingSprite;
  public pointer!: Pointer;
  public preview: Preview;
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
  // too, since nothing else is waiting for it there.
  private panWith(tool: Tool) {
    return this.drag({ mouseButtons: tool === Tool.View ? 'all' : 'right' });
  }

  public override destroy(options?: Parameters<Viewport['destroy']>[0]) {
    this.unsubscribeTool?.();
    super.destroy(options);
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
      .wheel()
      .clampZoom({ minScale: 1.0, maxScale: 6.0 });
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
  }
  // Pan and zoom are paused while a wall or measurement is being pressed
  // out; every release resumes them (except wall drawing on touch, which
  // keeps them off for the whole chain). Releases outside the canvas count
  // too: a pause that was never lifted left pan and zoom dead in every tool.
  private updateEnd(_ev: FederatedPointerEvent) {
    const tool = useStore.getState().activeTool;
    if (tool === Tool.Measure) this.preview.set(undefined);
    if (!(tool === Tool.WallAdd && isMobile)) this.pause = false;
  }
  private checkTools(ev: FederatedPointerEvent) {
    ev.stopPropagation();
    if (ev.button == 2 || ev.button == 2) {
      return;
    }
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
      case Tool.Edit:
        // if (!isMobile) {
        //     this.pause = true;
        // }
        break;
      case Tool.Measure:
        this.pause = true;
        point.x = viewportX(ev.global.x);
        point.y = viewportY(ev.global.y);
        this.preview.set(point);
        break;
    }
  }
}
