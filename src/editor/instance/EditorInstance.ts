// One editor's state. Everything that used to live at module level (the
// stores, the undo history, the clipboard, the wall point counter and the
// Pixi objects the tools reach for) lives here instead, so two editors on
// one page share nothing. Pixi classes take the instance in their
// constructor; React reads it from context (./context.ts).
import type { Renderer } from 'pixi.js';
import type { StoreApi } from 'zustand/vanilla';
import { formatLength, parseLength } from '@accurona/core';
import {
  createNotifier,
  type Notifier,
  type NotifyOptions
} from '@accurona/ui';
import { createEditorStore, type EditorStore } from '../../stores/EditorStore';
import {
  createFloorPlanStore,
  type FloorPlanStore
} from '../../stores/FloorPlanStore';
import {
  createFurnitureStore,
  type FurnitureStore
} from '../../stores/FurnitureStore';
import {
  createHistoryStore,
  type HistoryStore
} from '../../stores/HistoryStore';
import { createUnitsStore, type UnitsStore } from '../../stores/UnitsStore';
import { formatArea, mmToPlan, planToMm } from '../../helpers/planLength';
import { snap } from '../../helpers/ViewportCoordinates';
import { AddWallManager } from '../editor/actions/AddWallManager';
import { createEditHistory, type EditHistory } from '../editor/history';
import type { Main } from '../editor/Main';
import type { FloorPlan } from '../editor/objects/FloorPlan';
import { TransformLayer } from '../editor/objects/TransformControls/TransformLayer';
import { Serializer } from '../editor/persistence/Serializer';
import {
  createSelectionCommands,
  type SelectionCommands
} from '../editor/selection/commands';
import type { Fragment } from '../editor/selection/planOps';
import {
  createContextMenuStore,
  createPointerGlue,
  type ContextMenuStore,
  type PointerGlue
} from '../editor/selection/pointer';
import {
  createSelectionStore,
  type SelectionStore
} from '../editor/selection/SelectionStore';
import { createKeymap, type Keymap } from '../keymap';

export type ThemeMode = 'light' | 'dark';

export interface EditorConfig {
  /** A read-only view: the hand tool only, no edits. */
  readOnly: boolean;
  /**
   * Where the keyboard shortcuts listen: the editor (keys pressed while
   * focus is inside it) or the whole document.
   */
  keyboardScope: 'root' | 'document';
  /** The mode the editor starts in; Alt + Shift + D switches it. */
  themeMode: ThemeMode;
  onThemeModeChange?: (mode: ThemeMode) => void;
  /**
   * Ctrl/Cmd + S. Receives the scene file's text; a returned string is the
   * message shown. Without it, Ctrl/Cmd + S downloads the file.
   */
  onSave?: (sceneText: string) => string | void;
  /** The welcome box: New plan, Load from disk. */
  showWelcome: boolean;
  /** The welcome box's Load from local save; the button shows only with it. */
  loadSaved?: () => string | null;
}

export class EditorInstance {
  readonly config: EditorConfig;

  readonly editor: StoreApi<EditorStore>;
  readonly plan: StoreApi<FloorPlanStore>;
  readonly selection: StoreApi<SelectionStore>;
  readonly history: StoreApi<HistoryStore>;
  readonly units: StoreApi<UnitsStore>;
  readonly furniture: StoreApi<FurnitureStore>;
  readonly contextMenu: StoreApi<ContextMenuStore>;

  readonly edits: EditHistory;
  readonly serializer: Serializer;
  readonly commands: SelectionCommands;
  readonly pointer: PointerGlue;
  readonly keymap: Keymap;

  /** Copy and Cut put a fragment of the plan here; Paste reads it. */
  clipboard: Fragment | null = null;
  /** The last wall point id handed out; ids are unique across floors. */
  wallNodeId = 0;
  /** A transform handle is being dragged. */
  transformDragging = false;

  /** Set while the canvas is mounted. */
  /** This editor's notifications, shown by its own NotificationHost. */
  readonly notifier: Notifier = createNotifier();
  /** The editor's outermost element, set by <Axonometra>. */
  root: HTMLElement | null = null;

  main: Main | null = null;
  floorPlanView: FloorPlan | null = null;
  renderer: Renderer | null = null;

  private transform: TransformLayer | undefined;
  private wallManager: AddWallManager | undefined;

  constructor(config: Partial<EditorConfig> = {}) {
    this.config = {
      readOnly: false,
      keyboardScope: 'root',
      themeMode: 'light',
      showWelcome: true,
      ...config
    };
    this.editor = createEditorStore(this);
    this.plan = createFloorPlanStore(this);
    this.selection = createSelectionStore();
    this.history = createHistoryStore();
    this.units = createUnitsStore();
    this.furniture = createFurnitureStore();
    this.contextMenu = createContextMenuStore();
    this.edits = createEditHistory(this);
    this.serializer = new Serializer(this);
    this.commands = createSelectionCommands(this);
    this.pointer = createPointerGlue(this);
    this.keymap = createKeymap(this);
  }

  get transformLayer(): TransformLayer {
    return (this.transform ??= new TransformLayer(this));
  }

  get addWallManager(): AddWallManager {
    return (this.wallManager ??= new AddWallManager(this));
  }

  /** A plan was loaded before the canvas was ready; frame it on setup. */
  frameOnSetup = false;

  /** Fits the whole floor in the view, now or once the canvas is ready. */
  frameAll() {
    this.frameOnSetup = !this.main?.ready;
    if (!this.frameOnSetup) this.commands.fitAll();
  }

  /** Where the keyboard shortcuts listen (config.keyboardScope). */
  /** <Axonometra> hands over its outermost element and its callbacks. */
  setRoot(root: HTMLElement | null) {
    this.root = root;
  }

  setCallbacks(
    callbacks: Pick<EditorConfig, 'onSave' | 'loadSaved' | 'onThemeModeChange'>
  ) {
    Object.assign(this.config, callbacks);
  }

  get keyTarget(): Document | HTMLElement {
    return this.config.keyboardScope === 'document' || !this.root
      ? document
      : this.root;
  }

  getMain(): Main {
    if (!this.main) throw new Error('The editor canvas is not mounted');
    return this.main;
  }

  getFloorPlanView(): FloorPlan {
    if (!this.floorPlanView) {
      throw new Error('The editor canvas is not mounted');
    }
    return this.floorPlanView;
  }

  notify(options: NotifyOptions) {
    this.notifier.notify(options);
  }

  /** A plan length in the display units, e.g. '2.7 m'. */
  formatLength(length: number, options?: { suffix?: boolean }): string {
    return formatLength(planToMm(length), this.units.getState().units, options);
  }

  /** A plan area in the display units' system, e.g. '12.5 m²' or '135 ft²'. */
  formatArea(area: number): string {
    return formatArea(area, this.units.getState().units);
  }

  /** Typed input in any unit (a bare number is in the display units), or null. */
  parseLength(text: string): number | null {
    const mm = parseLength(text, this.units.getState().units);
    return mm === null ? null : mmToPlan(mm);
  }

  /** Screen x to plan x, snapped to the grid unless told otherwise. */
  viewportX(x: number, customSnap?: boolean) {
    const main = this.getMain();
    const planX = x / main.scale.x + main.corner.x;
    const shouldSnap = customSnap ?? this.editor.getState().snap;
    return Math.trunc(shouldSnap ? snap(planX) : planX);
  }

  /** Screen y to plan y, snapped to the grid unless told otherwise. */
  viewportY(y: number, customSnap?: boolean) {
    const main = this.getMain();
    const planY = y / main.scale.y + main.corner.y;
    const shouldSnap = customSnap ?? this.editor.getState().snap;
    return Math.trunc(shouldSnap ? snap(planY) : planY);
  }

  /** Drops the plan and the tools; the canvas is torn down by its owner. */
  dispose() {
    this.selection.getState().clear();
    this.edits.reset();
    this.plan.getState().reset();
    this.transform?.dispose();
    this.transform = undefined;
    this.wallManager?.dispose();
    this.wallManager = undefined;
    this.clipboard = null;
    this.main = null;
    this.floorPlanView = null;
    this.renderer = null;
  }
}
