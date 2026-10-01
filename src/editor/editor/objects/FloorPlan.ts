import type { EditorInstance } from '../../instance/EditorInstance';
import { Container, DestroyOptions } from 'pixi.js';
import { timestamp } from '../actions/SaveAction';

// Clear space around the plan in a saved plan image, in plan units (px).
const PRINT_MARGIN = 40;

// View for the floor plan model. The model itself lives in useFloorPlanStore;
// this container only mirrors the active floor into the scene graph and owns
// the one operation that genuinely needs a live display object: print().
export class FloorPlan extends Container {
  private unsubscribe: () => void;

  constructor(private readonly inst: EditorInstance) {
    super();
    this.unsubscribe = this.inst.plan.subscribe(() => this.syncFromStore());
    // Materialise floor 0 so a fresh editor has something to draw on.
    this.inst.plan.getState().getCurrentFloor();
    this.syncFromStore();
  }

  override destroy(options?: DestroyOptions) {
    this.unsubscribe();
    super.destroy(options);
  }

  // The active floor is this container's only child. Floors that are no
  // longer active (or were removed from the plan) get detached — the store
  // holds them, so they are not destroyed here.
  private syncFromStore() {
    const { floors, currentFloor } = this.inst.plan.getState();
    const active = floors[currentFloor];
    for (const child of [...this.children]) {
      if (child !== active) {
        this.removeChild(child);
      }
    }
    if (active && active.parent !== this) {
      this.addChild(active);
    }
  }

  public print() {
    // v8: extract via the live app renderer (a separate renderer can't read
    // this scene's GPU resources). extract.canvas sizes itself to the bounds.
    const renderer = this.inst.renderer;
    if (!renderer) {
      this.inst.notify({
        title: 'Export failed',
        message: 'Editor is not ready.',
        severity: 'error'
      });
      return;
    }
    // The bounds alone crop tight to the outermost item, so a wall label or a
    // piece of furniture on the edge touches the image border: pad them.
    const frame = this.getLocalBounds().rectangle.clone().pad(PRINT_MARGIN);
    const canvas = renderer.extract.canvas({
      target: this,
      frame
    }) as HTMLCanvasElement;
    canvas.toBlob((blob) => {
      if (!blob) {
        this.inst.notify({
          title: 'Export failed',
          message: 'Could not generate plan image.',
          severity: 'error'
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `axonometra-plan-${timestamp()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}
