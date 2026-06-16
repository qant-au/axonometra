import { ReactNode, useState } from 'react';
import { Dialog, Group, Text } from '@mantine/core';
import { useStore } from '../stores/EditorStore';
import { NavbarLink } from './NavbarLink';
import {
  ArrowNarrowRight,
  Click,
  Edit,
  GitFork,
  Help,
  LayoutAlignMiddle,
  Multiplier2x,
  Trash,
  Vector,
  ZoomIn
} from 'tabler-icons-react';
import { Tool } from '../editor/editor/constants';
import { Image } from '@mantine/core';

const helpAddWall = '/help/add-wall.gif';
const helpDelete = '/help/delete.gif';
const helpEditFurniture = '/help/edit-furniture.gif';
const helpEditWall = '/help/edit-walls.gif';
const helpAddWindow = '/help/add-window.gif';
const helpAddDoor = '/help/add-door.gif';
const helpMeasure = '/help/measure-tool.gif';

interface IHelpBody {
  title: string;
  body: ReactNode;
}

export function HelpDialog() {
  const [opened, setOpened] = useState(false);

  const { activeTool } = useStore();
  const helpBody: IHelpBody[] = [];

  helpBody[Tool.View] = {
    title: 'View Mode',
    body: (
      <>
        <Group>
          <Click /> <p>Right click and drag to move around the map </p>
        </Group>
        <Group>
          <ZoomIn /> <p>Use scroll wheel to zoom in or out</p>
        </Group>
      </>
    )
  };

  helpBody[Tool.Remove] = {
    title: 'Erase Mode',
    body: (
      <>
        <Image src={helpDelete}></Image>
        <Group spacing="xs">
          <Click /> <ArrowNarrowRight /> <Trash />{' '}
          <p> Click on object to remove from plan</p>
        </Group>
        <Group noWrap={true}>
          <Vector /> <p>Wall nodes may only be removed if disconnected</p>
        </Group>
      </>
    )
  };
  helpBody[Tool.Edit] = {
    title: 'Edit Mode',
    body: (
      <>
        <Image src={helpEditFurniture}></Image>
        <Group spacing="xs">
          <Click /> <ArrowNarrowRight /> <Edit />{' '}
          <p> Click on furniture to enable edit controls</p>
        </Group>
        <Image src={helpEditWall}></Image>
        <Group noWrap={true}>
          <Vector /> <p>Click and drag wall nodes to edit walls</p>
        </Group>
      </>
    )
  };
  helpBody[Tool.WallAdd] = {
    title: 'Add Wall',
    body: (
      <>
        <Image src={helpAddWall}></Image>
        <Group noWrap={true}>
          <Click /> <p>Click to add connected wall chain</p>
        </Group>
        <Group noWrap={true}>
          <Multiplier2x /> <p>Double click on wall node to end chain</p>
        </Group>
        <Group noWrap={true}>
          <GitFork /> <p>Click on existing walls to connect</p>
        </Group>
      </>
    )
  };

  helpBody[Tool.FurnitureAddWindow] = {
    title: 'Add Window',
    body: (
      <>
        <Image src={helpAddWindow}></Image>
        <Group noWrap={true}>
          <Click /> <p>Click on wall to add window</p>
        </Group>
      </>
    )
  };
  helpBody[Tool.FurnitureAddDoor] = {
    title: 'Add Door',
    body: (
      <>
        <Image src={helpAddDoor}></Image>
        <Group noWrap={true}>
          <Click /> <p>Click on wall to add door</p>
        </Group>
        <Group noWrap={true}>
          <LayoutAlignMiddle /> <p>Middle click to change door orientation</p>
        </Group>
      </>
    )
  };
  helpBody[Tool.Measure] = {
    title: 'Measure tool',
    body: (
      <>
        <Image src={helpMeasure}></Image>
        <Group noWrap={true}>
          <Click /> <p>Click and drag to measure distances</p>
        </Group>
      </>
    )
  };

  // Defensive guard: helpBody only has entries for the eight Tool members.
  // If activeTool ever falls outside that set (external state mutation, a
  // malicious plan file, future code), bail rather than crash on an
  // undefined index access.
  const body = helpBody[activeTool];
  if (!body) {
    return null;
  }

  return (
    <>
      <Group position="center">
        <NavbarLink
          onClick={() => setOpened((o) => !o)}
          icon={Help}
          label="Help"
        />
      </Group>

      <Dialog
        opened={opened}
        withCloseButton
        onClose={() => setOpened(false)}
        size="lg"
        radius="md"
        position={{ top: 20, right: 20 }}
      >
        <Text size="sm" style={{ marginBottom: 10 }} weight={500}>
          <b>{body.title}</b>
          {body.body}
        </Text>
      </Dialog>
    </>
  );
}
