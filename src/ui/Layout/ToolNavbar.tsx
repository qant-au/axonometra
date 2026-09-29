import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  Suspense,
  lazy,
  useRef,
  useState
} from 'react';
import { Box, Stack, Tooltip } from '@mui/material';
import classes from './ToolNavbar.module.css';
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
  IconView360
} from '@tabler/icons-react';
import {
  clearNotifications,
  notify,
  SidePanel,
  ToolMenu
} from '../../vendor/accurona-ui';
import { useStore } from '../../stores/EditorStore';
import { useFloorPlanStore } from '../../stores/FloorPlanStore';
import { ChangeFloorAction } from '../../editor/editor/actions/ChangeFloorAction';
import { LoadAction } from '../../editor/editor/actions/LoadAction';
import { readPlanFile } from '../../helpers/readPlanFile';
import { SaveAction } from '../../editor/editor/actions/SaveAction';
import { Tool } from '../../editor/editor/constants';
import { PrintAction } from '../../editor/editor/actions/PrintAction';
import { useHistoryStore } from '../../stores/HistoryStore';
import { redo, undo } from '../../editor/editor/history';
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

const modes = [
  { icon: IconEye, label: 'View', tool: Tool.View },
  { icon: IconPencil, label: 'Edit', tool: Tool.Edit },
  { icon: IconEraser, label: 'Erase', tool: Tool.Remove }
];

function AddMenu({ setter }: { setter: Dispatch<SetStateAction<number>> }) {
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
              clearNotifications();
              setDrawerOpened(true);
              // -1 = no active toolbar tool (deselect while the drawer is open)
              setter(-1);
            }
          },
          {
            label: 'Draw wall',
            icon: <IconBorderLeft size={18} />,
            divider: true,
            onClick: () => {
              setter(-1);
              setTool(Tool.WallAdd);
              clearNotifications();
              notify({
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
              setter(-1);
              clearNotifications();
              notify({
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
              setter(-1);
              clearNotifications();
              notify({
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
  const [active, setActive] = useState(0);

  const setTool = useStore((s) => s.setTool);
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
        setActive(index);
        // The previous tool's hint (e.g. wall drawing) no longer applies.
        clearNotifications();
        setTool(link.tool);
      }}
    />
  ));

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const resultText = await readPlanFile(e.target.files?.[0]);
    if (!resultText) {
      return;
    }
    const action = new LoadAction(resultText);
    action.execute();
  };

  return (
    <div style={{ position: 'absolute' }}>
      <Box className={classes.navbar}>
        <Box className={classes.sectionGrow}>
          <Stack sx={{ alignItems: 'center' }}>
            <AddMenu setter={setActive} />
            {toolModes}
          </Stack>
        </Box>
        <Box className={classes.sectionGrow}>
          <Stack sx={{ alignItems: 'center' }}>
            <Tooltip title="Current floor" placement="right" arrow>
              <div className={classes.link}>{floor}</div>
            </Tooltip>

            <NavbarLink
              icon={IconStairsUp}
              label="Go to next floor"
              onClick={() => {
                const action = new ChangeFloorAction(1);
                action.execute();
              }}
            />
            <NavbarLink
              icon={IconStairsDown}
              label="Go to previous floor"
              onClick={() => {
                const action = new ChangeFloorAction(-1);
                action.execute();
              }}
            />
            <NavbarLink
              icon={IconSquareX}
              label="Delete floor"
              onClick={() => {
                const action = new DeleteFloorAction();
                action.execute();
              }}
            />
          </Stack>
        </Box>
        <Box className={classes.sectionGrow}>
          <Stack sx={{ alignItems: 'center' }}>
            <NavbarLink
              icon={IconArrowBackUp}
              label="Undo"
              disabled={!canUndo}
              onClick={undo}
            />
            <NavbarLink
              icon={IconArrowForwardUp}
              label="Redo"
              disabled={!canRedo}
              onClick={redo}
            />
            <NavbarLink
              icon={IconRuler2}
              label="Measure tool"
              onClick={() => {
                setTool(Tool.Measure);
                clearNotifications();
                notify({
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
                clearNotifications();
                notify({
                  message: 'Snap to grid now ' + (next ? 'On' : 'Off'),
                  icon: next ? <IconTable /> : <IconTableOff />
                });
              }}
            />
            <NavbarLink
              icon={IconDimensions}
              label="Toggle size labels"
              onClick={() => {
                const action = new ToggleLabelAction();
                action.execute();
                clearNotifications();
                notify({
                  message: 'Toggled size labels',
                  icon: <IconTag />
                });
              }}
            />
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
          </Stack>
        </Box>
        <Box className={classes.section}>
          <Stack sx={{ alignItems: 'center' }}>
            <NavbarLink
              icon={IconPrinter}
              label="Save plan image"
              onClick={() => {
                const action = new PrintAction();
                action.execute();
              }}
            />
            <NavbarLink
              icon={IconDeviceFloppy}
              label="Save plan"
              onClick={() => {
                const action = new SaveAction();
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
    </div>
  );
}
