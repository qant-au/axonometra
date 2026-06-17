import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  Suspense,
  lazy,
  useRef,
  useState
} from 'react';
import {
  Box,
  Tooltip,
  UnstyledButton,
  Stack,
  Menu,
  Divider,
  Drawer
} from '@mantine/core';
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
  IconTag
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useStore } from '../../stores/EditorStore';
import { ChangeFloorAction } from '../../editor/editor/actions/ChangeFloorAction';
import { LoadAction } from '../../editor/editor/actions/LoadAction';
import { readPlanFile } from '../../helpers/readPlanFile';
import { SaveAction } from '../../editor/editor/actions/SaveAction';
import { Tool } from '../../editor/editor/constants';
import { PrintAction } from '../../editor/editor/actions/PrintAction';
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

  const [_modalOpened, _setModalOpened] = useState(false);
  const getCategories = useFurnitureStore((s) => s.getCategories);

  const addButton = (
    <UnstyledButton className={classes.link}>
      <IconPlus />
    </UnstyledButton>
  );

  return (
    <>
      <Drawer
        opened={drawerOpened}
        position="right"
        onClose={() => {
          getCategories();
          setDrawerOpened(false);
        }}
        title="Add furniture"
        padding="xl"
        size="lg"
        overlayProps={{ backgroundOpacity: 0 }}
      >
        <Suspense fallback={null}>
          <FurnitureAddPanel />
        </Suspense>
      </Drawer>
      <Menu position="right" offset={22} trigger="hover" closeDelay={500}>
        <Menu.Target>{addButton}</Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconArmchair size={18} />}
            onClick={() => {
              setDrawerOpened(true);
              // -1 = no active toolbar tool (deselect while the drawer is open)
              setter(-1);
            }}
          >
            Add furniture
          </Menu.Item>
          <Divider />
          <Menu.Item
            leftSection={<IconBorderLeft size={18} />}
            onClick={() => {
              setter(-1);
              setTool(Tool.WallAdd);
              notifications.clean();
              notifications.show({
                title: '✏️ Wall drawing mode',
                message:
                  'Click to draw walls. Double click on wall node to end sequence.',
                color: 'blue'
              });
            }}
          >
            Draw wall
          </Menu.Item>
          <Menu.Item
            leftSection={<IconWindow size={18} />}
            onClick={() => {
              setTool(Tool.FurnitureAddWindow);
              setter(-1);
              notifications.clean();

              notifications.show({
                title: '🪟 Add window',
                message: 'Click on wall to add window',
                color: 'blue'
              });
            }}
          >
            Add window
          </Menu.Item>
          <Menu.Item
            leftSection={<IconDoor size={18} />}
            onClick={() => {
              setTool(Tool.FurnitureAddDoor);
              setter(-1);
              notifications.clean();

              notifications.show({
                title: '🚪 Add door',
                message:
                  'Click on wall to add door. Right click to change orientation',
                color: 'blue'
              });
            }}
          >
            Add door
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );
}

export function ToolNavbar() {
  const [active, setActive] = useState(0);

  const setTool = useStore((s) => s.setTool);
  const floor = useStore((s) => s.floor);
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
          <Stack align="center" gap={0}>
            <AddMenu setter={setActive} />
            {toolModes}
          </Stack>
        </Box>
        <Box className={classes.sectionGrow}>
          <Stack align="center" gap={0}>
            <Tooltip
              label={'Current floor'}
              position="right"
              withArrow
              transitionProps={{ duration: 0 }}
            >
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
          <Stack align="center" gap={0}>
            <NavbarLink
              icon={IconRuler2}
              label="Measure tool"
              onClick={() => {
                setTool(Tool.Measure);
                notifications.clean();
                notifications.show({
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
                notifications.clean();
                notifications.show({
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
                notifications.clean();
                notifications.show({
                  message: 'Toggled size labels',
                  icon: <IconTag />
                });
              }}
            />
            <Suspense fallback={null}>
              <HelpDialog />
            </Suspense>
          </Stack>
        </Box>
        <Box className={classes.section}>
          <Stack align="center" gap={0}>
            <NavbarLink
              icon={IconPrinter}
              label="Print"
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
