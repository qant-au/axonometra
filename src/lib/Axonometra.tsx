// <Axonometra>: the floor planner as a React component. Each one is its own
// editor (EditorInstance), so several can share a page. It fills the box its
// host gives it and writes nothing to the page outside itself.
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type Ref
} from 'react';
import {
  Box,
  ScopedCssBaseline,
  ThemeProvider,
  type Theme
} from '@mui/material';
import { TOOLBAR_WIDTH } from '../editor/editor/constants';
import {
  createLineworkTheme,
  NotificationHost,
  type NotifyOptions
} from '@accurona/ui';
import type { LengthUnit, Scene } from '@accurona/core';
import {
  EditorInstance,
  type ThemeMode
} from '../editor/instance/EditorInstance';
import { EditorInstanceContext } from '../editor/instance/context';
import { SetUnitsAction } from '../editor/editor/actions/SetUnitsAction';
import { PageLayout } from '../ui/Layout/PageLayout';
import { useStore } from '../stores/EditorStore';

export interface AxonometraApi {
  /** Opens a scene, or a plan v1/v2 file (saved as a scene from then on). */
  load(file: string | object): boolean;
  /** The plan as an Accurona scene, the file Save writes. */
  getScene(): Scene;
  /** getScene() as the text of the file. */
  getSceneText(): string;
  /** The plan as a glTF binary (.glb) for other 3D tools. */
  exportGlb(): Promise<ArrayBuffer>;
  setUnits(units: LengthUnit): void;
  undo(): boolean;
  redo(): boolean;
  /** Shows a message in this editor. */
  notify(options: NotifyOptions): void;
  /** For tests and tooling: the editor's insides. Not a stable API. */
  debug: {
    main(): unknown;
    plan(): unknown;
    editor(): unknown;
    selection(): unknown;
  };
}

export interface AxonometraProps {
  /** A scene or a plan v1/v2 file to open with. */
  initialScene?: string | object;
  /** The hand tool only, no toolbar, no edits. */
  readOnly?: boolean;
  /** The welcome box. On unless the host opens the plan itself. */
  showWelcome?: boolean;
  /**
   * Where the shortcuts listen: 'root' (the default) while focus is inside
   * the editor, 'document' for a page that is only the editor.
   */
  keyboardScope?: 'root' | 'document';
  /** Light or dark. Alt + Shift + D switches it and calls onThemeModeChange. */
  themeMode?: ThemeMode;
  onThemeModeChange?: (mode: ThemeMode) => void;
  /** A host MUI theme, used instead of Accurona's. */
  theme?: Theme;
  /**
   * Ctrl/Cmd + S. Receives the scene file's text; a returned string is the
   * message shown. Without it, Ctrl/Cmd + S downloads the file.
   */
  onSave?: (sceneText: string) => string | void;
  /** Adds Load from local save to the welcome box. */
  loadSaved?: () => string | null;
  /** After each edit, undo and redo. */
  onChange?: (api: AxonometraApi) => void;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<AxonometraApi>;
}

function createApi(inst: EditorInstance): AxonometraApi {
  return {
    load: (file) => {
      inst.selection.getState().clear();
      return inst.serializer.load(
        typeof file === 'string' ? file : JSON.stringify(file)
      );
    },
    getScene: () => JSON.parse(inst.serializer.sceneText()) as Scene,
    getSceneText: () => inst.serializer.sceneText(),
    // three.js only downloads when a model is first asked for.
    exportGlb: async () =>
      (await import('../editor/scene3d/exportGlb')).exportGlb(
        inst.serializer.serialize()
      ),
    setUnits: (units) => new SetUnitsAction(inst, units).execute(),
    undo: () => {
      const undone = inst.edits.undo();
      if (undone) inst.commands.pruneSelection();
      return undone;
    },
    redo: () => {
      const redone = inst.edits.redo();
      if (redone) inst.commands.pruneSelection();
      return redone;
    },
    notify: (options) => inst.notify(options),
    debug: {
      main: () => inst.main,
      plan: () => inst.plan.getState(),
      editor: () => inst.editor.getState(),
      selection: () => inst.selection.getState()
    }
  };
}

function Themed({
  theme,
  children
}: {
  theme?: Theme;
  children: React.ReactNode;
}) {
  // Accurona's shared theme, so Axonometra looks like Reticulyne, in the
  // mode the editor is in. No CSS variables: MUI would write them to the
  // host page's :root.
  const mode = useStore((s) => s.theme);
  const own = useMemo(() => createLineworkTheme(mode), [mode]);
  return <ThemeProvider theme={theme ?? own}>{children}</ThemeProvider>;
}

export function Axonometra({
  initialScene,
  readOnly = false,
  showWelcome,
  keyboardScope = 'root',
  themeMode,
  onThemeModeChange,
  theme,
  onSave,
  loadSaved,
  onChange,
  className,
  style,
  ref
}: AxonometraProps) {
  const [inst] = useState(
    () =>
      new EditorInstance({
        readOnly,
        keyboardScope,
        themeMode: themeMode ?? 'light',
        showWelcome: showWelcome ?? initialScene === undefined,
        onSave,
        loadSaved,
        onThemeModeChange
      })
  );
  const api = useMemo(() => createApi(inst), [inst]);
  useImperativeHandle(ref, () => api, [api]);

  // The callbacks can change between renders; the editor reads them when
  // it needs them.
  useLayoutEffect(() => {
    inst.setCallbacks({ onSave, loadSaved, onThemeModeChange });
  });

  useEffect(() => {
    inst.furniture.getState().getCategories();
  }, [inst]);

  useEffect(() => {
    if (themeMode) inst.editor.setState({ theme: themeMode });
  }, [inst, themeMode]);

  // After the canvas has mounted (its effect runs first), so the plan is
  // drawn into it; a remount starts from the same file.
  useEffect(() => {
    if (initialScene !== undefined) api.load(initialScene);
    // The initial file only: a new one is loaded with api.load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    if (!onChange) return undefined;
    return inst.history.subscribe(() => onChange(api));
  }, [inst, api, onChange]);

  return (
    <EditorInstanceContext.Provider value={inst}>
      <Themed theme={theme}>
        <ScopedCssBaseline
          ref={(el: HTMLDivElement | null) => inst.setRoot(el)}
          className={className}
          style={style}
          data-axonometra=""
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Notifications keep clear of the tool bar, which a narrow
              screen's full-width notification covered, and go under the
              dialogs (a snackbar's z-index drew them over one on a phone),
              though still over the side panels. */}
          <Box
            sx={(theme) => ({
              '& > .MuiStack-root': {
                maxWidth: readOnly
                  ? undefined
                  : `calc(100% - ${TOOLBAR_WIDTH + 32}px)`,
                zIndex: theme.zIndex.modal - 1
              }
            })}
          >
            <NotificationHost notifier={inst.notifier} />
          </Box>
          <PageLayout />
        </ScopedCssBaseline>
      </Themed>
    </EditorInstanceContext.Provider>
  );
}
