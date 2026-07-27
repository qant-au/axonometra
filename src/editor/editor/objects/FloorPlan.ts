import { Container, DestroyOptions } from 'pixi.js';
import { notifications } from '@mantine/notifications';
import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { rendererHolder } from '../../EditorRoot';

// View for the floor plan model. The model itself lives in useFloorPlanStore;
// this container only mirrors the active floor into the scene graph and owns
// the one operation that genuinely needs a live display object: print().
export class FloorPlan extends Container {
  private unsubscribe: () => void;

  constructor() {
    super();
    this.unsubscribe = useFloorPlanStore.subscribe(() => this.syncFromStore());
    // Materialise floor 0 so a fresh editor has something to draw on.
    useFloorPlanStore.getState().getCurrentFloor();
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
    const { floors, currentFloor } = useFloorPlanStore.getState();
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
    const renderer = rendererHolder.current;
    if (!renderer) {
      notifications.show({
        title: 'Export failed',
        message: 'Editor is not ready.',
        color: 'red'
      });
      return;
    }
    const canvas = renderer.extract.canvas(this) as HTMLCanvasElement;
    canvas.toBlob((blob) => {
      if (!blob) {
        notifications.show({
          title: 'Export failed',
          message: 'Could not generate plan image.',
          color: 'red'
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      a.download = `axonometra-plan-${ts}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}
