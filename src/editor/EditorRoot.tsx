import { useRef, useEffect } from 'react';
// Pixi 8 compiles shaders and uniform uploads with new Function() unless
// this module is loaded first. The container's CSP has no 'unsafe-eval'
// (docker/nginx.conf), so without it the canvas never starts there.
import 'pixi.js/unsafe-eval';
import { Application } from 'pixi.js';
import { Main } from './editor/Main';
import { IViewportOptions } from 'pixi-viewport';
import { METER } from './editor/constants';
import { FloorPlan } from './editor/objects/FloorPlan';
import { useStore } from '../stores/EditorStore';
import { useInstance } from './instance/context';
import { KeyboardCursor } from './editor/KeyboardCursor';
import classes from './EditorRoot.module.css';

export function EditorRoot() {
  const inst = useInstance();
  const ref = useRef<HTMLDivElement>(null);
  const dark = useStore((s) => s.theme) === 'dark';
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
    const keyboardCursor = new KeyboardCursor(
      inst,
      (message) => {
        if (live) live.textContent = message;
      },
      inst.config.readOnly
    );
    const handleCanvasKeydown = (e: KeyboardEvent) => {
      if (!inst.main) return;
      if (keyboardCursor.handleKey(e)) e.preventDefault();
    };
    // Only keyboard focus brings up the keyboard cursor. A mouse press also
    // focuses the canvas, and showing the cursor then moved the view and put
    // a crosshair where the person clicked; the first key press places it.
    const handleCanvasFocus = (e: FocusEvent) => {
      if (!inst.main) return;
      if ((e.target as HTMLElement).matches(':focus-visible')) {
        keyboardCursor.focus();
      }
    };
    const handleCanvasBlur = () => keyboardCursor.blur();
    const handleCanvasPointerDown = () => keyboardCursor.pointerPressed();
    const handleWheel = (e: WheelEvent) => inst.main?.handleWheel(e);

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };
    // Every key the shared keymap binds (./keymap.ts). The canvas's keyboard
    // cursor sees a key first when the canvas has focus.
    const handleKeydown = (e: KeyboardEvent) => {
      if (!inst.main) return;
      inst.keymap.handleKeydown(e, {
        readonly: inst.config.readOnly,
        editLengthAtCursor: () => keyboardCursor.editLength()
      });
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
        inst.renderer = created.renderer;
        view = created.canvas;
        view.addEventListener('contextmenu', handleContextMenu);
        // Not passive: the wheel's default (page scroll, browser zoom on
        // Ctrl + wheel) is always taken.
        view.addEventListener('wheel', handleWheel, { passive: false });

        const viewportSettings: IViewportOptions = {
          screenWidth: created.screen.width,
          screenHeight: created.screen.height,
          worldWidth: 50 * METER,
          worldHeight: 50 * METER,
          events: created.renderer.events
        };
        inst.floorPlanView = new FloorPlan(inst);
        const main = new Main(inst, viewportSettings);
        inst.main = main;

        ref.current!.appendChild(view);
        // Every canvas pointer gesture is at most one undo step. Capture phase
        // on the wrapper so this runs before Pixi (whose handlers stop
        // propagation); pointerup lands on window wherever the drag ends.
        wrapper?.addEventListener('pointerdown', inst.edits.beginGesture, true);
        wrapper?.addEventListener('pointerdown', handleCanvasPointerDown, true);
        wrapper?.addEventListener('keydown', handleCanvasKeydown);
        wrapper?.addEventListener('focus', handleCanvasFocus);
        wrapper?.addEventListener('blur', handleCanvasBlur);
        window.addEventListener('pointerup', inst.edits.endGesture);
        window.addEventListener('pointerup', inst.pointer.rightReleased);
        window.addEventListener('pointercancel', inst.edits.endGesture);
        created.start();
        created.stage.addChild(main);

        // Dev/test introspection handle. Playwright specs read this to drive
        // tool selection and assert wall-node state. Gated on DEV so production
        // bundles don't expose it.
        if (import.meta.env.DEV) {
          (window as unknown as { __axo: unknown }).__axo = {
            getMain: () => inst.getMain(),
            getPlan: () => inst.plan.getState(),
            getStore: () => inst.editor.getState(),
            getSelection: () => inst.selection.getState()
          };
        }

        document.addEventListener('keydown', handleKeydown);
      });

    return () => {
      cancelled = true;
      document.removeEventListener('keydown', handleKeydown);
      wrapper?.removeEventListener(
        'pointerdown',
        inst.edits.beginGesture,
        true
      );
      wrapper?.removeEventListener(
        'pointerdown',
        handleCanvasPointerDown,
        true
      );
      wrapper?.removeEventListener('keydown', handleCanvasKeydown);
      wrapper?.removeEventListener('focus', handleCanvasFocus);
      wrapper?.removeEventListener('blur', handleCanvasBlur);
      keyboardCursor.blur();
      window.removeEventListener('pointerup', inst.edits.endGesture);
      window.removeEventListener('pointerup', inst.pointer.rightReleased);
      window.removeEventListener('pointercancel', inst.edits.endGesture);
      if (view) {
        view.removeEventListener('contextmenu', handleContextMenu);
        view.removeEventListener('wheel', handleWheel);
      }
      // Drop the plan model and the tools before app.destroy, so a remount
      // builds fresh objects against the new Application. The FloorPlan
      // container is not destroyed here — app.destroy cascades to it, and
      // that cascade is what runs its store unsubscribe.
      inst.dispose();
      if (import.meta.env.DEV) {
        delete (window as unknown as { __axo?: unknown }).__axo;
      }
      if (app) app.destroy(true, true);
    };
  }, [inst]);

  return (
    <>
      <div
        ref={ref}
        className={dark ? `${classes.canvas} ${classes.dark}` : classes.canvas}
        tabIndex={0}
        role="application"
        aria-label="Floor plan"
        aria-describedby="axo-canvas-help"
      />
      <p id="axo-canvas-help" className={classes.srOnly}>
        Arrow keys move the cursor by 10 centimetres, or 1 metre with Shift.
        Enter or Space uses the selected tool at the cursor. In Edit mode, Enter
        picks up a wall point, wall or piece of furniture; move it with the
        arrow keys and press Enter to put it down or Escape to cancel. In Edit
        mode, Control Enter on a wall opens a box to type its length. Escape
        also ends wall drawing. Control Z undoes. Question mark lists every
        keyboard shortcut.
      </p>
      <div ref={liveRef} className={classes.srOnly} aria-live="polite" />
    </>
  );
}
