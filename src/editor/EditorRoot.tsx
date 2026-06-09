import { useRef, useEffect } from 'react';
import { Application } from 'pixi.js';
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

export function getMain(): Main {
  if (!mainHolder.current) {
    throw new Error('EditorRoot is not mounted');
  }
  return mainHolder.current;
}

export function EditorRoot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const app = new Application({
      view: document.getElementById('pixi-canvas') as HTMLCanvasElement,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      backgroundColor: 0xebebeb,
      antialias: true,
      resizeTo: window
    });

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };
    app.view.addEventListener('contextmenu', handleContextMenu);

    const viewportSettings: IViewportOptions = {
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
      worldWidth: 50 * METER,
      worldHeight: 50 * METER,
      interaction: app.renderer.plugins.interaction
    };
    const main = new Main(viewportSettings);
    mainHolder.current = main;

    ref.current!.appendChild(app.view);
    app.start();
    app.stage.addChild(main);

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
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      app.view.removeEventListener('contextmenu', handleContextMenu);
      // Dispose singletons before app.destroy so their static .instance
      // refs reset; a remount then builds fresh objects against the
      // new Application.
      FloorPlan.Instance.dispose();
      TransformLayer.Instance.dispose();
      AddWallManager.Instance.dispose();
      mainHolder.current = null;
      if (import.meta.env.DEV) {
        delete (window as unknown as { __axo?: unknown }).__axo;
      }
      app.destroy(true, true);
    };
  }, []);

  return <div ref={ref} />;
}
