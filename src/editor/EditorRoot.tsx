import { useRef, useEffect } from 'react';
import { Application, Renderer } from 'pixi.js';
import { Main } from './editor/Main';
import { IViewportOptions } from 'pixi-viewport';
import { METER } from './editor/constants';
import { FloorPlan } from './editor/objects/FloorPlan';
import { TransformLayer } from './editor/objects/TransformControls/TransformLayer';
import { AddWallManager } from './editor/actions/AddWallManager';
import { useStore } from '../stores/EditorStore';
import { useFloorPlanStore } from '../stores/FloorPlanStore';
import { serializer } from './editor/persistence/Serializer';
import { notifications } from '@mantine/notifications';
import { createElement } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import {
  beginGesture,
  endGesture,
  redo,
  resetHistory,
  undo
} from './editor/history';
import { embedConfig } from '../embed/embedConfig';
import { KeyboardCursor } from './editor/KeyboardCursor';
import classes from './EditorRoot.module.css';

// Holder for the active Main instance. Non-React Pixi consumers
// (ViewportCoordinates, Floor) read mainHolder.current via getMain()
// after mount; the holder is cleared on unmount so a remount (HMR,
// StrictMode, embed-mode toggle) doesn't reuse a destroyed Viewport.
export const mainHolder: { current: Main | null } = { current: null };

// Holder for the active renderer. FloorPlan.print() extracts the plan via the
// live app renderer — a separate renderer can't read the scene's GPU resources.
export const rendererHolder: { current: Renderer | null } = { current: null };

// Holder for the active FloorPlan view. The plan *model* lives in
// useFloorPlanStore and needs no holder; this is only for the handful of
// consumers that need the display object itself (Main, print()).
export const floorPlanHolder: { current: FloorPlan | null } = { current: null };

export function getMain(): Main {
  if (!mainHolder.current) {
    throw new Error('EditorRoot is not mounted');
  }
  return mainHolder.current;
}

export function getFloorPlan(): FloorPlan {
  if (!floorPlanHolder.current) {
    throw new Error('EditorRoot is not mounted');
  }
  return floorPlanHolder.current;
}

export function EditorRoot() {
  const ref = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // v8 Application.init is async. React StrictMode mounts this effect twice;
    // `cancelled` lets a teardown that fires before init resolves throw away
    // the half-built app instead of wiring it up.
    let cancelled = false;
    let app: Application | null = null;
    let view: HTMLCanvasElement | null = null;
    const wrapper = ref.current;
    const live = liveRef.current;
    const keyboardCursor = new KeyboardCursor((message) => {
      if (live) live.textContent = message;
    }, embedConfig.readonly);
    const handleCanvasKeydown = (e: KeyboardEvent) => {
      if (!mainHolder.current) return;
      if (keyboardCursor.handleKey(e)) e.preventDefault();
    };
    const handleCanvasFocus = () => {
      if (mainHolder.current) keyboardCursor.focus();
    };
    const handleCanvasBlur = () => keyboardCursor.blur();

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };
    const handleKeydown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA';
      // Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z and Ctrl+Y redo. Text fields keep
      // their own undo, and a read-only embed has nothing to undo.
      if (mod && !typing && !embedConfig.readonly) {
        if (e.code === 'KeyZ') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          return;
        }
        if (e.code === 'KeyY') {
          e.preventDefault();
          redo();
          return;
        }
      }
      if (e.code === 'KeyS' && e.ctrlKey) {
        e.preventDefault();
        const data = serializer.serialize();
        localStorage.setItem('autosave', data);
        notifications.show({
          message: 'Saved to Local Storage!',
          color: 'green',
          icon: createElement(IconDeviceFloppy)
        });
      }
    };

    const created = new Application();
    // No canvas is passed: Pixi creates its own (index.html has none), which we
    // then mount into the React div.
    created
      .init({
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        background: 0xebebeb,
        antialias: true,
        resizeTo: window
      })
      .then(() => {
        if (cancelled) {
          created.destroy(true, true);
          return;
        }
        app = created;
        rendererHolder.current = created.renderer;
        view = created.canvas;
        view.addEventListener('contextmenu', handleContextMenu);

        const viewportSettings: IViewportOptions = {
          screenWidth: created.screen.width,
          screenHeight: created.screen.height,
          worldWidth: 50 * METER,
          worldHeight: 50 * METER,
          events: created.renderer.events
        };
        floorPlanHolder.current = new FloorPlan();
        const main = new Main(viewportSettings);
        mainHolder.current = main;

        ref.current!.appendChild(view);
        // Every canvas pointer gesture is at most one undo step. Capture phase
        // on the wrapper so this runs before Pixi (whose handlers stop
        // propagation); pointerup lands on window wherever the drag ends.
        wrapper?.addEventListener('pointerdown', beginGesture, true);
        wrapper?.addEventListener('keydown', handleCanvasKeydown);
        wrapper?.addEventListener('focus', handleCanvasFocus);
        wrapper?.addEventListener('blur', handleCanvasBlur);
        window.addEventListener('pointerup', endGesture);
        window.addEventListener('pointercancel', endGesture);
        created.start();
        created.stage.addChild(main);

        // Dev/test introspection handle. Playwright specs read this to drive
        // tool selection and assert wall-node state. Gated on DEV so production
        // bundles don't expose it.
        if (import.meta.env.DEV) {
          (window as unknown as { __axo: unknown }).__axo = {
            getMain,
            getPlan: () => useFloorPlanStore.getState(),
            getStore: () => useStore.getState()
          };
        }

        document.addEventListener('keydown', handleKeydown);
      });

    return () => {
      cancelled = true;
      document.removeEventListener('keydown', handleKeydown);
      wrapper?.removeEventListener('pointerdown', beginGesture, true);
      wrapper?.removeEventListener('keydown', handleCanvasKeydown);
      wrapper?.removeEventListener('focus', handleCanvasFocus);
      wrapper?.removeEventListener('blur', handleCanvasBlur);
      keyboardCursor.blur();
      window.removeEventListener('pointerup', endGesture);
      window.removeEventListener('pointercancel', endGesture);
      resetHistory();
      if (view) view.removeEventListener('contextmenu', handleContextMenu);
      // Drop the plan model and dispose the remaining singletons before
      // app.destroy so their static .instance refs reset; a remount then
      // builds fresh objects against the new Application. The FloorPlan
      // container is not destroyed here — app.destroy cascades to it, and
      // that cascade is what runs its store unsubscribe.
      useFloorPlanStore.getState().reset();
      TransformLayer.Instance.dispose();
      AddWallManager.Instance.dispose();
      floorPlanHolder.current = null;
      mainHolder.current = null;
      rendererHolder.current = null;
      if (import.meta.env.DEV) {
        delete (window as unknown as { __axo?: unknown }).__axo;
      }
      if (app) app.destroy(true, true);
    };
  }, []);

  return (
    <>
      <div
        ref={ref}
        className={classes.canvas}
        tabIndex={0}
        role="application"
        aria-label="Floor plan"
        aria-describedby="axo-canvas-help"
      />
      <p id="axo-canvas-help" className={classes.srOnly}>
        Arrow keys move the cursor by 10 centimetres, or 1 metre with Shift.
        Enter or Space uses the selected tool at the cursor. In Edit mode, Enter
        picks up a wall point, wall or piece of furniture; move it with the
        arrow keys and press Enter to put it down or Escape to cancel. Escape
        also ends wall drawing. Control Z undoes.
      </p>
      <div ref={liveRef} className={classes.srOnly} aria-live="polite" />
    </>
  );
}
