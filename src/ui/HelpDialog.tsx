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
import { FloatingPanel } from '@accurona/ui';

// Imported, not fetched from /help/: the bundler ships them with the code.
import helpAddWall from '../res/help/add-wall.gif';
import helpDelete from '../res/help/delete.gif';
import helpEditFurniture from '../res/help/edit-furniture.gif';
import helpEditWall from '../res/help/edit-walls.gif';
import helpAddWindow from '../res/help/add-window.gif';
import helpAddDoor from '../res/help/add-door.gif';
import helpMeasure from '../res/help/measure-tool.gif';

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
          <IconZoomIn />{' '}
          <p>Scroll to move around; hold Ctrl or ⌘ and scroll to zoom</p>
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
          <p> Click to select; Shift + click or drag a box to select more</p>
        </Row>
        <Picture src={helpEditWall} />
        <Row nowrap>
          <IconVector /> <p>Click and drag wall nodes to edit walls</p>
        </Row>
        <Row nowrap>
          <IconRuler /> <p>Double-click a wall to type its length</p>
        </Row>
        <Row nowrap>
          <IconClick /> <p>Alt + drag leaves a copy; right-click for more</p>
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
          <p>Right-click a door and choose Turn to change its orientation</p>
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
