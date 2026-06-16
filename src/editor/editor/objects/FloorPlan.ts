import { autoDetectRenderer, Container, IRendererOptionsAuto } from 'pixi.js';
import { FurnitureData } from '../../../stores/FurnitureStore';
import { Wall } from './Walls/Wall';
import { Floor } from './Floor';
import { Serializer } from '../persistence/Serializer';
import {
  safeParsePlan,
  validatePlanShape
} from '../persistence/FloorPlanSerializable';
import { useStore } from '../../../stores/EditorStore';
import { Point } from '../../../helpers/Point';
import { showNotification } from '@mantine/notifications';

export class FloorPlan extends Container {
  private static instance: FloorPlan | undefined;

  private floors: Floor[];
  private visibleLabels: boolean = true;
  private serializer: Serializer;
  public furnitureId = 0; // TODO uuid?
  public windowFurniture!: FurnitureData;

  public currentFloor = 0;
  private constructor() {
    super();
    this.floors = [];
    this.floors.push(new Floor());
    this.addChild(this.floors[0]);
    this.serializer = new Serializer();
  }
  public static get Instance() {
    return this.instance || (this.instance = new this());
  }

  public get CurrentFloor() {
    return this.currentFloor;
  }

  public set CurrentFloor(floor: number) {
    this.currentFloor = floor;
    useStore.setState({ floor: this.currentFloor });
  }

  public toggleLabels() {
    this.visibleLabels = !this.visibleLabels;
    this.floors[this.currentFloor].setLabelVisibility(this.visibleLabels);
  }

  public changeFloor(by: number) {
    this.removeChild(this.floors[this.currentFloor]);
    const previousFloor = this.currentFloor;
    this.CurrentFloor += by;
    if (this.floors[this.currentFloor] == null) {
      this.floors[this.currentFloor] = new Floor(
        undefined,
        this.floors[previousFloor]
      );
    }
    this.floors[this.currentFloor].setLabelVisibility(this.visibleLabels);
    this.addChild(this.floors[this.currentFloor]);
  }

  public print() {
    const bounds = this.getBounds();
    const opts: IRendererOptionsAuto = {
      preserveDrawingBuffer: true,
      width: Math.max(1, Math.ceil(bounds.width)),
      height: Math.max(1, Math.ceil(bounds.height))
    };

    const renderer = autoDetectRenderer(opts);
    let canvas: HTMLCanvasElement;
    try {
      canvas = renderer.plugins.extract.canvas(this);
    } finally {
      renderer.destroy(true);
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        showNotification({
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

  public save() {
    const floorPlan = this.serializer.serialize(this.floors, this.furnitureId);
    return floorPlan;
  }

  public load(planText: string | null) {
    if (planText == null || planText === '') {
      showNotification({
        title: 'Load failed',
        message: 'No plan data to load.',
        color: 'red'
      });
      return;
    }
    let raw: unknown;
    try {
      raw = safeParsePlan(planText);
    } catch {
      showNotification({
        title: 'Load failed',
        message: 'Plan file is not valid JSON.',
        color: 'red'
      });
      return;
    }
    const plan = validatePlanShape(raw);
    if (!plan) {
      showNotification({
        title: 'Load failed',
        message: 'Plan file is missing required fields.',
        color: 'red'
      });
      return;
    }
    // Future schema migrations dispatch on plan.version here.
    const version = (raw as { version?: number }).version ?? 1;
    if (version !== 1) {
      showNotification({
        title: 'Load failed',
        message: `Unsupported plan version: ${version}.`,
        color: 'red'
      });
      return;
    }
    this.reset();
    for (const floorData of plan.floors) {
      const floor = new Floor(floorData);
      this.floors.push(floor);
    }

    this.furnitureId = plan.furnitureId;
    this.floors[0].getWallNodeSequence().setId(plan.wallNodeId);
    this.addChild(this.floors[this.currentFloor]);
  }

  // removes current floor
  public removeFloor() {
    if (this.floors.length < 2) {
      showNotification({
        title: 'Floor removal not permitted',
        message:
          'This floor is the only floor in the plan. You cannot have a plan with no floors. Create a new floor before deleting.',
        color: 'red'
      });
      return;
    }
    const oldCurrentFloor = this.currentFloor;
    this.changeFloor(-1);
    this.floors[oldCurrentFloor].reset();
    this.floors.splice(oldCurrentFloor, 1);
    this.changeFloor(1);
  }

  // Releases editor-side state and resets the singleton ref. Called
  // from EditorRoot's cleanup before app.destroy.
  public dispose() {
    for (const floor of this.floors) {
      floor.reset();
    }
    this.floors = [];
    this.currentFloor = 0;
    this.furnitureId = 0;
    FloorPlan.instance = undefined;
  }

  // cleans up everything. prepare for new load. TODO Feature multiple floors
  private reset() {
    // remove furniture
    for (const floor of this.floors) {
      floor.reset();
    }

    // remove all floors
    this.floors = [];
    this.currentFloor = 0;
    this.furnitureId = 0;
  }

  public addFurniture(
    obj: FurnitureData,
    attachedTo?: Wall,
    coords?: Point,
    attachedToLeft?: number,
    attachedToRight?: number
  ) {
    this.furnitureId += 1;
    this.floors[this.currentFloor].addFurniture(
      obj,
      this.furnitureId,
      attachedTo,
      coords,
      attachedToLeft,
      attachedToRight
    );
  }

  public setFurniturePosition(
    id: number,
    x: number,
    y: number,
    angle?: number
  ) {
    this.floors[this.currentFloor].setFurniturePosition(id, x, y, angle);
  }

  public removeFurniture(id: number) {
    this.floors[this.currentFloor].removeFurniture(id);
  }

  public getObject(id: number) {
    return this.floors[this.currentFloor].getObject(id);
  }

  public redrawWalls() {
    this.floors[this.currentFloor].redrawWalls();
  }

  public removeWallNode(nodeId: number) {
    this.floors[this.currentFloor].removeWallNode(nodeId);
  }

  public removeWall(wall: Wall) {
    this.floors[this.currentFloor].removeWall(wall);
  }

  public addNodeToWall(wall: Wall, coords: Point) {
    return this.floors[this.currentFloor].addNodeToWall(wall, coords);
  }
  public addNode(leftId: number, rightId: number) {
    return this.floors[this.currentFloor].addNode(leftId, rightId);
  }

  public getWallNodeSeq() {
    return this.floors[this.currentFloor].getWallNodeSequence();
  }

  public getFurniture() {
    return this.floors[this.currentFloor].getFurniture();
  }
}
