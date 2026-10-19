import { useId, type ReactNode } from 'react';
import { Box, Drawer, Typography } from '@mui/material';
import { CloseButton } from './CloseButton';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

// A panel that slides in from the right: a library to pick from, a list of
// settings. Escape or a click on the canvas closes it.
export const SidePanel = ({
  open,
  onClose,
  title,
  children,
  width = 440
}: Props) => {
  const titleId = useId();
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { invisible: true },
        paper: {
          role: 'dialog',
          'aria-labelledby': titleId,
          sx: {
            width,
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column'
          }
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2
        }}
      >
        <Typography id={titleId} variant="h6" component="h2">
          {title}
        </Typography>
        <CloseButton onClick={onClose} />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 3, pb: 3 }}>
        {children}
      </Box>
    </Drawer>
  );
};
