import { ChangeEvent, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogContent, Stack } from '@mui/material';
import {
  IconDatabase,
  IconPlus,
  IconRotateClockwise
} from '@tabler/icons-react';
import { LoadAction } from '../editor/editor/actions/LoadAction';
import AxonometraLogo from '../res/axonometra-logo.svg';
import { serializer } from '../editor/editor/persistence/Serializer';
import { notify } from '../vendor/accurona-ui';
import { readPlanFile } from '../helpers/readPlanFile';

export function WelcomeModal() {
  const [opened, setOpened] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const image = (
    <Box
      component="img"
      src={AxonometraLogo}
      alt="Axonometra"
      sx={{ display: 'block', width: '100%' }}
    />
  );

  const loadFromDisk = async (e: ChangeEvent<HTMLInputElement>) => {
    const resultText = await readPlanFile(e.target.files?.[0]);

    if (resultText) {
      const action = new LoadAction(resultText);
      action.execute();
      setOpened(false);
    }
  };

  const notification = {
    title: 'Welcome to Axonometra! 🎉',
    message:
      '⚒️ Use the tools on the left to create your floor plan. For detailed instructions, press the Help button on the left.'
  };
  return (
    <>
      <Dialog
        open={opened}
        fullWidth
        maxWidth="xs"
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgb(233 236 239 / 55%)' } }
        }}
        onClose={() => {
          setOpened(false);
          notify(notification);
        }}
      >
        <DialogContent>
          <Stack spacing={1}>
            {image}
            <Button
              onClick={() => {
                setOpened(false);
                notify(notification);
              }}
              startIcon={<IconPlus />}
              variant="text"
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
              startIcon={<IconDatabase />}
              variant="text"
            >
              Load from disk
            </Button>
            <Button
              onClick={() => {
                const saved = localStorage.getItem('autosave');
                if (saved == null) {
                  notify({
                    title: 'No autosave found',
                    message: 'There is no local autosave to load.',
                    severity: 'warning'
                  });
                  return;
                }
                serializer.load(saved);
                setOpened(false);
              }}
              startIcon={<IconRotateClockwise />}
              variant="text"
            >
              Load from local save
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
