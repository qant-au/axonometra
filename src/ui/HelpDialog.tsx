import { ReactNode, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useStore } from '../stores/EditorStore';
import { NavbarLink } from './NavbarLink';
import {
  IconArrowNarrowRight,
  IconClick,
  IconEdit,
  IconGitFork,
  IconHelp,
  IconLayoutAlignMiddle,
  IconMultiplier2x,
  IconRuler,
  IconTrash,
  IconVector,
  IconZoomIn
} from '@tabler/icons-react';
import { Tool } from '../editor/editor/constants';
import { FloatingPanel } from '../vendor/accurona-ui';

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

  const activeTool = useStore((s) => s.activeTool);
  const helpBody: IHelpBody[] = [];

  helpBody[Tool.View] = {
    title: 'View Mode',
    body: (
      <>
        <Row>
          <IconClick /> <p>Click and drag to move around the plan</p>
        </Row>
        <Row>
          <IconZoomIn /> <p>Use scroll wheel to zoom in or out</p>
        </Row>
      </>
    )
  };

  helpBody[Tool.Remove] = {
    title: 'Erase Mode',
    body: (
      <>
        <Picture src={helpDelete} />
        <Row>
          <IconClick /> <IconArrowNarrowRight /> <IconTrash />{' '}
          <p> Click on object to remove from plan</p>
        </Row>
        <Row nowrap>
          <IconVector /> <p>Wall nodes may only be removed if disconnected</p>
        </Row>
      </>
    )
  };
  helpBody[Tool.Edit] = {
    title: 'Edit Mode',
    body: (
      <>
        <Picture src={helpEditFurniture} />
        <Row>
          <IconClick /> <IconArrowNarrowRight /> <IconEdit />{' '}
          <p> Click on furniture to enable edit controls</p>
        </Row>
        <Picture src={helpEditWall} />
        <Row nowrap>
          <IconVector /> <p>Click and drag wall nodes to edit walls</p>
        </Row>
        <Row nowrap>
          <IconRuler /> <p>Double-click a wall to type its length</p>
        </Row>
      </>
    )
  };
  helpBody[Tool.WallAdd] = {
    title: 'Add Wall',
    body: (
      <>
        <Picture src={helpAddWall} />
        <Row nowrap>
          <IconClick /> <p>Click to add connected wall chain</p>
        </Row>
        <Row nowrap>
          <IconMultiplier2x /> <p>Double click on wall node to end chain</p>
        </Row>
        <Row nowrap>
          <IconGitFork /> <p>Click on existing walls to connect</p>
        </Row>
      </>
    )
  };

  helpBody[Tool.FurnitureAddWindow] = {
    title: 'Add Window',
    body: (
      <>
        <Picture src={helpAddWindow} />
        <Row nowrap>
          <IconClick /> <p>Click on wall to add window</p>
        </Row>
      </>
    )
  };
  helpBody[Tool.FurnitureAddDoor] = {
    title: 'Add Door',
    body: (
      <>
        <Picture src={helpAddDoor} />
        <Row nowrap>
          <IconClick /> <p>Click on wall to add door</p>
        </Row>
        <Row nowrap>
          <IconLayoutAlignMiddle />{' '}
          <p>Middle click to change door orientation</p>
        </Row>
      </>
    )
  };
  helpBody[Tool.Measure] = {
    title: 'Measure tool',
    body: (
      <>
        <Picture src={helpMeasure} />
        <Row nowrap>
          <IconClick /> <p>Click and drag to measure distances</p>
        </Row>
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
      <NavbarLink
        onClick={() => setOpened((o) => !o)}
        icon={IconHelp}
        label="Help"
      />

      <FloatingPanel
        open={opened}
        onClose={() => setOpened(false)}
        label={`Help: ${body.title}`}
      >
        <Typography component="div" sx={{ fontWeight: 500 }}>
          <b>{body.title}</b>
          {body.body}
        </Typography>
      </FloatingPanel>
    </>
  );
}

function Row({ children, nowrap }: { children: ReactNode; nowrap?: boolean }) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        columnGap: 1.5,
        flexWrap: nowrap ? 'nowrap' : 'wrap'
      }}
    >
      {children}
    </Stack>
  );
}

function Picture({ src }: { src: string }) {
  return (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{ display: 'block', maxWidth: '100%', my: 1 }}
    />
  );
}
