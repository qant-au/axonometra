// Draws the selection on the plan: an outline round each selected wall and
// piece of furniture, and the band of a marquee being dragged out. A single
// piece of furniture gets the transform handles instead (TransformLayer).
//
// It reads the live objects every frame, so an outline follows a wall being
// dragged; the selection itself is ids (SelectionStore).
import type { EditorInstance } from '../../instance/EditorInstance';
import { Graphics, Point, Ticker } from 'pixi.js';
import { Tool } from '../constants';
import type { Rect } from './planOps';

const COLOUR = 0x1c7ed6;

export class SelectionOverlay extends Graphics {
  private marquee: Rect | null = null;
  private unsubscribe: (() => void)[] = [];
  private readonly tick = () => this.redraw();

  constructor(private readonly inst: EditorInstance) {
    super();
    // Drawn, never hit: presses belong to what is underneath.
    this.eventMode = 'none';
    this.zIndex = 2000;
    this.unsubscribe.push(
      this.inst.selection.subscribe(() => this.syncTransformLayer()),
      this.inst.plan.subscribe(() => this.syncTransformLayer()),
      this.inst.editor.subscribe((state, previous) => {
        if (state.activeTool === previous.activeTool) return;
        // The selection belongs to the Select tool.
        if (state.activeTool !== Tool.Edit)
          this.inst.selection.getState().clear();
        this.syncTransformLayer();
      })
    );
    Ticker.shared.add(this.tick);
  }

  public setMarquee(rect: Rect | null) {
    this.marquee = rect;
  }

  public override destroy(options?: Parameters<Graphics['destroy']>[0]) {
    Ticker.shared.remove(this.tick);
    for (const off of this.unsubscribe) off();
    super.destroy(options);
  }

  private single() {
    const { refs } = this.inst.selection.getState();
    const only = refs.length === 1 ? refs[0] : undefined;
    return only?.kind === 'furniture'
      ? this.inst.plan.getState().getObject(only.id)
      : undefined;
  }

  // One piece of furniture selected with the Select tool shows its handles.
  private syncTransformLayer() {
    const layer = this.inst.transformLayer;
    const furniture = this.single();
    if (furniture && this.inst.editor.getState().activeTool === Tool.Edit) {
      layer.show(furniture);
    } else {
      layer.deselect();
    }
  }

  private toHere(obj: { toGlobal: (p: Point) => Point }, x: number, y: number) {
    return this.parent!.toLocal(obj.toGlobal(new Point(x, y)));
  }

  private redraw() {
    this.clear();
    if (!this.parent || this.destroyed) return;
    const scale = this.parent.scale.x || 1;
    const width = 2 / scale;
    const { refs } = this.inst.selection.getState();
    const single = this.single();
    const plan = this.inst.plan.getState();
    for (const ref of refs) {
      if (ref.kind === 'wall') {
        const wall = plan.getWallNodeSeq().getWall(ref.left, ref.right);
        if (!wall) continue;
        // The wall's own rectangle (Wall.drawLine), 3 px wider each side.
        // Its nodes' (0, 0) is their corner, not their centre, which drew
        // the band skewed and off the wall.
        const pad = 3 / scale;
        const corners = [
          this.toHere(wall, 0, -pad),
          this.toHere(wall, wall.length, -pad),
          this.toHere(wall, wall.length, wall.thickness + pad),
          this.toHere(wall, 0, wall.thickness + pad)
        ];
        this.poly(corners.flatMap((p) => [p.x, p.y])).fill({
          color: COLOUR,
          alpha: 0.35
        });
        continue;
      }
      const furniture = plan.getObject(ref.id);
      if (!furniture || furniture === single) continue;
      const r = furniture.getLocalBounds().rectangle;
      const corners = [
        this.toHere(furniture, r.x, r.y),
        this.toHere(furniture, r.x + r.width, r.y),
        this.toHere(furniture, r.x + r.width, r.y + r.height),
        this.toHere(furniture, r.x, r.y + r.height)
      ];
      this.poly(corners.flatMap((p) => [p.x, p.y])).stroke({
        width,
        color: COLOUR
      });
    }
    if (this.marquee) {
      const m = this.marquee;
      this.rect(m.x, m.y, m.width, m.height)
        .fill({ color: COLOUR, alpha: 0.08 })
        .stroke({ width: 1 / scale, color: COLOUR });
    }
  }
}
