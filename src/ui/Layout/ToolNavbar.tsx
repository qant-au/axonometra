import { ChangeEvent, Suspense, lazy, useRef, useState } from 'react';
import { Box, Stack, Tooltip } from '@mui/material';
import {
  IconArmchair,
  IconBorderLeft,
  IconArrowDownSquare,
  IconDeviceFloppy,
  IconUpload,
  IconRuler2,
  IconStairsUp,
  IconStairsDown,
  IconEye,
  IconPencil,
  IconEraser,
  IconWindow,
  IconDoor,
  IconPlus,
  IconSquareX,
  IconDimensions,
  IconPrinter,
  IconTable,
  IconTableOff,
  IconTag,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCube,
  IconView360,
  IconRulerMeasure,
  IconCheck,
  IconKeyboard
} from '@tabler/icons-react';
import type { LengthUnit } from '@accurona/core';
import { useUnitsStore } from '../../stores/UnitsStore';
import { SetUnitsAction } from '../../editor/editor/actions/SetUnitsAction';
import { SidePanel, ToolMenu } from '@accurona/ui';
import { useStore } from '../../stores/EditorStore';
import { useFloorPlanStore } from '../../stores/FloorPlanStore';
import { ChangeFloorAction } from '../../editor/editor/actions/ChangeFloorAction';
import { LoadAction } from '../../editor/editor/actions/LoadAction';
import { readPlanFile } from '../../helpers/readPlanFile';
import { SaveAction } from '../../editor/editor/actions/SaveAction';
import { Tool } from '../../editor/editor/constants';
import { PrintAction } from '../../editor/editor/actions/PrintAction';
import { useHistoryStore } from '../../stores/HistoryStore';
import { useInstance } from '../../editor/instance/context';
import { ToggleLabelAction } from '../../editor/editor/actions/ToggleLabelAction';
import { NavbarLink } from '../NavbarLink';

const FurnitureAddPanel = lazy(() =>
  import('../FurnitureControls/FurnitureAddPanel/FurnitureAddPanel').then(
    (m) => ({ default: m.FurnitureAddPanel })
  )
);
const HelpDialog = lazy(() =>
  import('../HelpDialog').then((m) => ({ default: m.HelpDialog }))
);
const AxonometricView = lazy(() =>
  import('../AxonometricView').then((m) => ({ default: m.AxonometricView }))
);
// three.js is only downloaded when the 3D view is first opened.
const ThreeDView = lazy(() =>
  import('../ThreeDView').then((m) => ({ default: m.ThreeDView }))
);
import { DeleteFloorAction } from '../../editor/editor/actions/DeleteFloorAction';
import { useFurnitureStore } from '../../stores/FurnitureStore';

// The toolbar runs the full height of the editor. Taller than the editor, it
// scrolls itself rather than pushing Save and Load out of reach.
const navbar = {
  boxSizing: 'border-box',
  height: '100%',
  width: 70,
  p: 2,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto'
} as const;

// The current-floor number, sized like a tool button.
const floorNumber = {
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'text.secondary'
} as const;

const modes = [
  { icon: IconEye, label: 'View', tool: Tool.View },
  { icon: IconPencil, label: 'Edit', tool: Tool.Edit },
  { icon: IconEraser, label: 'Erase', tool: Tool.Remove }
];

const UNIT_NAMES: { unit: LengthUnit; label: string }[] = [
  { unit: 'mm', label: 'Millimetres' },
  { unit: 'cm', label: 'Centimetres' },
  { unit: 'm', label: 'Metres' },
  { unit: 'in', label: 'Inches' },
  { unit: 'ft-in', label: 'Feet and inches' }
];

// How lengths are shown and typed; saved with the plan.
function UnitsMenu() {
  const inst = useInstance();
  const units = useUnitsStore((s) => s.units);
  return (
    <ToolMenu
      name="Units"
      icon={<IconRulerMeasure />}
      items={UNIT_NAMES.map(({ unit, label }) => ({
        label: `${label} (${unit})`,
        // A blank box keeps the labels aligned beside the tick.
        icon:
          unit === units ? (
            <IconCheck size={18} aria-label="selected" />
          ) : (
            <Box sx={{ width: 18 }} />
          ),
        divider: unit === 'in',
        onClick: () => new SetUnitsAction(inst, unit).execute()
      }))}
    />
  );
}

function AddMenu() {
  const inst = useInstance();
  const setTool = useStore((s) => s.setTool);
  const [drawerOpened, setDrawerOpened] = useState(false);
  const getCategories = useFurnitureStore((s) => s.getCategories);

  return (
    <>
      <SidePanel
        open={drawerOpened}
        onClose={() => {
          getCategories();
          setDrawerOpened(false);
        }}
        title="Add furniture"
      >
        <Suspense fallback={null}>
          <FurnitureAddPanel />
        </Suspense>
      </SidePanel>
      <ToolMenu
        name="Add"
        icon={<IconPlus />}
        offset={22}
        items={[
          {
            label: 'Add furniture',
            icon: <IconArmchair size={18} />,
            onClick: () => {
              inst.notifier.clear();
              setDrawerOpened(true);
            }
          },
          {
            label: 'Draw wall',
            icon: <IconBorderLeft size={18} />,
            divider: true,
            onClick: () => {
              setTool(Tool.WallAdd);
              inst.notifier.clear();
              inst.notify({
                title: '✏️ Wall drawing mode',
                message:
                  'Click to draw walls. Double click on wall node to end sequence.',
                severity: 'info'
              });
            }
          },
          {
            label: 'Add window',
            icon: <IconWindow size={18} />,
            onClick: () => {
              setTool(Tool.FurnitureAddWindow);
              inst.notifier.clear();
              inst.notify({
                title: '🪟 Add window',
                message: 'Click on wall to add window',
                severity: 'info'
              });
            }
          },
          {
            label: 'Add door',
            icon: <IconDoor size={18} />,
            onClick: () => {
              setTool(Tool.FurnitureAddDoor);
              inst.notifier.clear();
              inst.notify({
                title: '🚪 Add door',
                message:
                  'Click on wall to add door. Right click to change orientation',
                severity: 'info'
              });
            }
          }
        ]}
      />
    </>
  );
}

export function ToolNavbar() {
  const inst = useInstance();
  // Follows the tool, however it was chosen (toolbar or keyboard).
  const activeTool = useStore((s) => s.activeTool);
  const active = modes.findIndex((m) => m.tool === activeTool);

  const setTool = useStore((s) => s.setTool);
  const setShortcutsOpen = useStore((s) => s.setShortcutsOpen);
  const floor = useFloorPlanStore((s) => s.currentFloor);
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const [axonometricOpen, setAxonometricOpen] = useState(false);
  const [threeDOpen, setThreeDOpen] = useState(false);
  const canRedo = useHistoryStore((s) => s.future.length > 0);
  const setSnap = useStore((s) => s.setSnap);
  const snap = useStore((s) => s.snap);

  const fileRef = useRef<HTMLInputElement>(null);

  const toolModes = modes.map((link, index) => (
    <NavbarLink
      {...link}
      key={link.label}
      active={index === active}
      onClick={() => {
        // The previous tool's hint (e.g. wall drawing) no longer applies.
        inst.notifier.clear();
        setTool(link.tool);
      }}
    />
  ));

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const resultText = await readPlanFile(e.target.files?.[0]);
    if (!resultText) {
      return;
    }
    const action = new LoadAction(inst, resultText);
    action.execute();
  };

  return (
    <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0 }}>
      <Box sx={navbar}>
        <Box sx={{ flexGrow: 1 }}>
          <Stack sx={{ alignItems: 'center' }}>
            <AddMenu />
            {toolModes}
          </Stack>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Stack sx={{ alignItems: 'center' }}>
            <Tooltip title="Current floor" placement="right" arrow>
              <Box sx={floorNumber}>{floor}</Box>
            </Tooltip>

            <NavbarLink
              icon={IconStairsUp}
              label="Go to next floor"
              onClick={() => {
                const action = new ChangeFloorAction(inst, 1);
                action.execute();
              }}
            />
            <NavbarLink
              icon={IconStairsDown}
              label="Go to previous floor"
              onClick={() => {
                const action = new ChangeFloorAction(inst, -1);
                action.execute();
              }}
            />
            <NavbarLink
              icon={IconSquareX}
              label="Delete floor"
              onClick={() => {
                const action = new DeleteFloorAction(inst);
                action.execute();
              }}
            />
          </Stack>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Stack sx={{ alignItems: 'center' }}>
            <NavbarLink
              icon={IconArrowBackUp}
              label="Undo"
              disabled={!canUndo}
              onClick={() => {
                if (inst.edits.undo()) inst.commands.pruneSelection();
              }}
            />
            <NavbarLink
              icon={IconArrowForwardUp}
              label="Redo"
              disabled={!canRedo}
              onClick={() => {
                if (inst.edits.redo()) inst.commands.pruneSelection();
              }}
            />
            <NavbarLink
              icon={IconRuler2}
              label="Measure tool"
              onClick={() => {
                setTool(Tool.Measure);
                inst.notifier.clear();
                inst.notify({
                  title: '📐 Measure tool',
                  message: 'Click and drag to measure areas'
                });
              }}
            />
            <NavbarLink
              icon={IconArrowDownSquare}
              label="Snap to grid"
              onClick={() => {
                const next = !snap;
                setSnap(next);
                inst.notifier.clear();
                inst.notify({
                  message: 'Snap to grid now ' + (next ? 'On' : 'Off'),
                  icon: next ? <IconTable /> : <IconTableOff />
                });
              }}
            />
            <NavbarLink
              icon={IconDimensions}
              label="Toggle size labels"
              onClick={() => {
                const action = new ToggleLabelAction(inst);
                action.execute();
                inst.notifier.clear();
                inst.notify({
                  message: 'Toggled size labels',
                  icon: <IconTag />
                });
              }}
            />
            <UnitsMenu />
            <NavbarLink
              icon={IconCube}
              label="Axonometric view"
              onClick={() => setAxonometricOpen(true)}
            />
            {axonometricOpen && (
              <Suspense fallback={null}>
                <AxonometricView
                  opened
                  onClose={() => setAxonometricOpen(false)}
                />
              </Suspense>
            )}
            <NavbarLink
              icon={IconView360}
              label="3D view"
              onClick={() => setThreeDOpen(true)}
            />
            {threeDOpen && (
              <Suspense fallback={null}>
                <ThreeDView opened onClose={() => setThreeDOpen(false)} />
              </Suspense>
            )}
            <Suspense fallback={null}>
              <HelpDialog />
            </Suspense>
            <NavbarLink
              icon={IconKeyboard}
              label="Keyboard shortcuts"
              onClick={() => setShortcutsOpen(true)}
            />
          </Stack>
        </Box>
        <Box sx={{ flexGrow: 0 }}>
          <Stack sx={{ alignItems: 'center' }}>
            <NavbarLink
              icon={IconPrinter}
              label="Save plan image"
              onClick={() => {
                const action = new PrintAction(inst);
                action.execute();
              }}
            />
            <NavbarLink
              icon={IconDeviceFloppy}
              label="Save plan"
              onClick={() => {
                const action = new SaveAction(inst);
                action.execute();
              }}
            />

            <NavbarLink
              onClick={() => fileRef.current?.click()}
              icon={IconUpload}
              label="Load plan"
            />
            <input
              ref={fileRef}
              onChange={handleChange}
              accept=".json,application/json,text/plain"
              multiple={false}
              type="file"
              hidden
            />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
