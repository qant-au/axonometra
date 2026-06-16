import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Button,
  useMantineTheme,
  Image,
  createStyles,
  Stack
} from '@mantine/core';
import { Database, Plus, RotateClockwise } from 'tabler-icons-react';
import { LoadAction } from '../editor/editor/actions/LoadAction';
import AxonometraLogo from '../res/logo.png';
import { FloorPlan } from '../editor/editor/objects/FloorPlan';
import { showNotification } from '@mantine/notifications';
import { readPlanFile } from '../helpers/readPlanFile';

const useStyles = createStyles(() => ({
  padded: {
    padding: '4px'
  }
}));

export function WelcomeModal() {
  const [opened, setOpened] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const image = <Image src={AxonometraLogo} />;

  const loadFromDisk = async (e: ChangeEvent<HTMLInputElement>) => {
    const resultText = await readPlanFile(e.target.files?.[0]);

    if (resultText) {
      const action = new LoadAction(resultText);
      action.execute();
      setOpened(false);
    }
  };

  const theme = useMantineTheme();
  const { classes } = useStyles();
  useEffect(() => {
    setOpened(true);
  }, []);

  const notification = {
    title: 'Welcome to Axonometra! 🎉',
    message:
      '⚒️ Use the tools on the left to create your floor plan. For detailed instructions, press the Help button on the left.'
  };
  return (
    <>
      <Modal
        className={classes.padded}
        closeOnClickOutside={true}
        closeOnEscape={true}
        opened={opened}
        withCloseButton={false}
        overlayColor={
          theme.colorScheme === 'dark'
            ? theme.colors.dark[9]
            : theme.colors.gray[2]
        }
        overlayOpacity={0.55}
        centered
        onClose={() => {
          setOpened(false);
          showNotification(notification);
        }}
      >
        <Stack spacing="xs">
          {image}
          <Button
            onClick={() => {
              setOpened(false);
              showNotification(notification);
            }}
            leftIcon={<Plus />}
            variant="white"
          >
            New plan
          </Button>
          <input
            ref={fileRef}
            onChange={loadFromDisk}
            accept=".json,application/json,text/plain"
            multiple={false}
            type="file"
            hidden
          />
          <Button
            onClick={() => {
              fileRef.current?.click();
            }}
            leftIcon={<Database />}
            variant="white"
          >
            Load from disk
          </Button>
          <Button
            onClick={() => {
              const saved = localStorage.getItem('autosave');
              if (saved == null) {
                showNotification({
                  title: 'No autosave found',
                  message: 'There is no local autosave to load.',
                  color: 'yellow'
                });
                return;
              }
              FloorPlan.Instance.load(saved);
              setOpened(false);
            }}
            leftIcon={<RotateClockwise />}
            variant="white"
          >
            Load from local save
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
