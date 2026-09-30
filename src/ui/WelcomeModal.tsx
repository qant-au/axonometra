import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogContent, Stack } from '@mui/material';
import { NotificationHost } from '@accurona/ui';
import {
  IconDatabase,
  IconPlus,
  IconRotateClockwise
} from '@tabler/icons-react';
import { LoadAction } from '../editor/editor/actions/LoadAction';
import AxonometraLogo from '../res/axonometra-logo.svg';
import { useInstance } from '../editor/instance/context';
import { readPlanFile } from '../helpers/readPlanFile';
import { useStore } from '../stores/EditorStore';

/** A dialog that leaves the notifications showing on a phone (Axonometra). */
export const KEEPS_NOTIFICATIONS = 'axo-keeps-notifications';

export function WelcomeModal() {
  const inst = useInstance();
  // The host keeps the last save (EditorConfig.loadSaved), if it does.
  const { loadSaved } = inst.config;
  const [opened, setOpened] = useState(true);
  const setWelcomeOpen = useStore((s) => s.setWelcomeOpen);
  useEffect(() => {
    setWelcomeOpen(opened);
    return () => setWelcomeOpen(false);
  }, [opened, setWelcomeOpen]);
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
    const resultText = await readPlanFile(e.target.files?.[0], (options) =>
      inst.notify(options)
    );
    // The same file can be chosen again after a load that failed.
    e.target.value = '';

    // A load that failed leaves the dialog open, to try another file or
    // start a new plan.
    if (resultText && new LoadAction(inst, resultText).execute()) {
      setOpened(false);
    }
  };

  const notification = {
    title: 'Welcome to Axonometra! 🎉',
    message:
      '⚒️ Use the tools on the left to create your floor plan. For detailed instructions, press the Help button on the left.'
  };
  // The dialog stays on screen while it fades out, and a click then (a second
  // click on New plan, or one on the backdrop) must not welcome twice.
  const startNewPlan = () => {
    if (!opened) return;
    setOpened(false);
    inst.notify(notification);
  };
  return (
    <>
      <Dialog
        open={opened}
        className={KEEPS_NOTIFICATIONS}
        fullWidth
        maxWidth="xs"
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgb(233 236 239 / 55%)' } }
        }}
        onClose={startNewPlan}
      >
        <DialogContent>
          <Stack spacing={1}>
            {image}
            <Button
              onClick={startNewPlan}
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
            {loadSaved && (
              <Button
                onClick={() => {
                  const saved = loadSaved();
                  if (saved == null) {
                    inst.notify({
                      title: 'No autosave found',
                      message: 'There is no local autosave to load.',
                      severity: 'warning'
                    });
                    return;
                  }
                  if (inst.serializer.load(saved)) setOpened(false);
                }}
                startIcon={<IconRotateClockwise />}
                variant="text"
              >
                Load from local save
              </Button>
            )}
          </Stack>
        </DialogContent>
        {/* The dialog hides everything outside it from screen readers, so
            the notifications it raises (a load that failed) are shown here,
            inside it, while it is open; the editor's own host steps aside.
            Only one host is ever rendered, so each notification is one
            element. */}
        {opened && <NotificationHost notifier={inst.notifier} />}
      </Dialog>
    </>
  );
}
