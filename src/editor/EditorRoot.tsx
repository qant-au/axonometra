import { useRef, useEffect } from 'react';
import { Application, Renderer } from 'pixi.js';
import { Main } from './editor/Main';
import { IViewportOptions } from 'pixi-viewport';
import { METER } from './editor/constants';
import { FloorPlan } from './editor/objects/FloorPlan';
import { TransformLayer } from './editor/objects/TransformControls/TransformLayer';
import { AddWallManager } from './editor/actions/AddWallManager';
import { useStore } from '../stores/EditorStore';
import { showNotification } from '@mantine/notifications';
import { createElement } from 'react';
import { DeviceFloppy } from 'tabler-icons-react';

// Holder for the active Main instance. Non-React Pixi consumers
// (ViewportCoordinates, Floor) read mainHolder.current via getMain()
// after mount; the holder is cleared on unmount so a remount (HMR,
// StrictMode, embed-mode toggle) doesn't reuse a destroyed Viewport.
export const mainHolder: { current: Main | null } = { current: null };

// Holder for the active renderer. FloorPlan.print() extracts the plan via the
// live app renderer — a separate renderer can't read the scene's GPU resources.
export const rendererHolder: { current: Renderer | null } = { current: null };

export function getMain(): Main {
  if (!mainHolder.current) {
    throw new Error('EditorRoot is not mounted');
  }
  return mainHolder.current;
}

export function EditorRoot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // v8 Application.init is async. React StrictMode mounts this effect twice;
    // `cancelled` lets a teardown that fires before init resolves throw away
    // the half-built app instead of wiring it up.
    let cancelled = false;
    let app: Application | null = null;
    let view: HTMLCanvasElement | null = null;

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === 'KeyS' && e.ctrlKey) {
        e.preventDefault();
        const data = FloorPlan.Instance.save();
        localStorage.setItem('autosave', data);
        showNotification({
          message: 'Saved to Local Storage!',
          color: 'green',
          icon: createElement(DeviceFloppy)
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
        const main = new Main(viewportSettings);
        mainHolder.current = main;

        ref.current!.appendChild(view);
        created.start();
        created.stage.addChild(main);

        // Dev/test introspection handle. Playwright specs read this to drive
        // tool selection and assert wall-node state. Gated on DEV so production
        // bundles don't expose it.
        if (import.meta.env.DEV) {
          (window as unknown as { __axo: unknown }).__axo = {
            getMain,
            getFloorPlan: () => FloorPlan.Instance,
            getStore: () => useStore.getState()
          };
        }

        document.addEventListener('keydown', handleKeydown);
      });

    return () => {
      cancelled = true;
      document.removeEventListener('keydown', handleKeydown);
      if (view) view.removeEventListener('contextmenu', handleContextMenu);
      // Dispose singletons before app.destroy so their static .instance
      // refs reset; a remount then builds fresh objects against the
      // new Application.
      FloorPlan.Instance.dispose();
      TransformLayer.Instance.dispose();
      AddWallManager.Instance.dispose();
      mainHolder.current = null;
      rendererHolder.current = null;
      if (import.meta.env.DEV) {
        delete (window as unknown as { __axo?: unknown }).__axo;
      }
      if (app) app.destroy(true, true);
    };
  }, []);

  return <div ref={ref} />;
}
