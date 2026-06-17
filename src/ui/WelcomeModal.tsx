import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Modal, Button, Image, Stack } from '@mantine/core';
import {
  IconDatabase,
  IconPlus,
  IconRotateClockwise
} from '@tabler/icons-react';
import { LoadAction } from '../editor/editor/actions/LoadAction';
import AxonometraLogo from '../res/logo.png';
import { FloorPlan } from '../editor/editor/objects/FloorPlan';
import { notifications } from '@mantine/notifications';
import { readPlanFile } from '../helpers/readPlanFile';

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
        style={{ padding: 4 }}
        closeOnClickOutside={true}
        closeOnEscape={true}
        opened={opened}
        withCloseButton={false}
        overlayProps={{
          backgroundOpacity: 0.55,
          color:
            'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-9))'
        }}
        centered
        onClose={() => {
          setOpened(false);
          notifications.show(notification);
        }}
      >
        <Stack gap="xs">
          {image}
          <Button
            onClick={() => {
              setOpened(false);
              notifications.show(notification);
            }}
            leftSection={<IconPlus />}
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
            leftSection={<IconDatabase />}
            variant="white"
          >
            Load from disk
          </Button>
          <Button
            onClick={() => {
              const saved = localStorage.getItem('autosave');
              if (saved == null) {
                notifications.show({
                  title: 'No autosave found',
                  message: 'There is no local autosave to load.',
                  color: 'yellow'
                });
                return;
              }
              FloorPlan.Instance.load(saved);
              setOpened(false);
            }}
            leftSection={<IconRotateClockwise />}
            variant="white"
          >
            Load from local save
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
