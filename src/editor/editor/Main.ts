import { IViewportOptions, Viewport } from 'pixi-viewport';
import {
  Assets,
  FederatedPointerEvent,
  isMobile,
  Point,
  TilingSprite
} from 'pixi.js';
import { getCatalogImageUrls } from '../../res/catalog';
import { FloorPlan } from './objects/FloorPlan';
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
    // loaded through Assets, so preload the background pattern and every
    // catalog image, then build the scene. The load also defers setup() until
    // after EditorRoot has added this viewport to the stage (clamp() reads the
    // viewport's world transform). Replaces the removed-in-v7 Loader.shared.
    Assets.load(['./pattern.svg', ...getCatalogImageUrls()]).then(() =>
      this.setup()
    );
    this.preview = new Preview();
    this.addChild(this.preview.getReference());
    this.cursor = 'none';
  }

  private setup() {
    // React StrictMode (dev) mounts EditorRoot twice; the first viewport is
    // destroyed before this deferred callback runs. Bail out rather than wire
    // plugins onto a torn-down viewport (whose transform is now null) — v7's
    // clamp plugin reads viewport.x and would throw.
    if (this.destroyed) return;
    this.drag({ mouseButtons: 'right' })
      .clamp({ direction: 'all' })
      .pinch()
      .wheel()
      .clampZoom({ minScale: 1.0, maxScale: 6.0 });
    this.bkgPattern = TilingSprite.from('./pattern.svg', {
      width: this.worldWidth ?? 0,
      height: this.worldHeight ?? 0
    });
    this.center = new Point(this.worldWidth / 2, this.worldHeight / 2);
    this.addChild(this.bkgPattern);

    this.floorPlan = FloorPlan.Instance;
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
  }
  private updatePreview(ev: FederatedPointerEvent) {
    this.addWallManager.updatePreview(ev);
    this.preview.updatePreview(ev);
    this.pointer.update(ev);
  }
  private updateEnd(_ev: FederatedPointerEvent) {
    switch (useStore.getState().activeTool) {
      case Tool.Measure:
        this.preview.set(undefined);
        this.pause = false;
        break;
      case Tool.WallAdd:
        if (!isMobile) {
          this.pause = false;
        }
        break;
      case Tool.Edit:
        this.pause = false;
        break;
    }
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
