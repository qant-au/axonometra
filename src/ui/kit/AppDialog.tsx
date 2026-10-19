import type { ReactNode } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  type Breakpoint
} from '@mui/material';
import { CloseButton } from './CloseButton';

interface Props {
  open: boolean;
  onClose: () => void;
  // Shown in the header and names the dialog; leave out for a bare card.
  title?: string;
  children: ReactNode;
  // Buttons along the bottom. A submit button for a form in the content
  // names it with its `form` attribute.
  actions?: ReactNode;
  fullScreen?: boolean;
  maxWidth?: Breakpoint | false;
}

// A modal dialog with a titled header and a named close button. Full screen,
// the content fills the space under the header as a column.
export const AppDialog = ({
  open,
  onClose,
  title,
  children,
  actions,
  fullScreen = false,
  maxWidth = 'xs'
}: Props) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullScreen={fullScreen}
    fullWidth={!fullScreen}
    maxWidth={maxWidth}
  >
    {title && (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 2
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <CloseButton onClick={onClose} />
      </Box>
    )}
    <DialogContent
      sx={
        fullScreen
          ? {
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              minHeight: 0
            }
          : title
            ? undefined
            : { pt: 3 }
      }
    >
      {children}
    </DialogContent>
    {actions && <DialogActions>{actions}</DialogActions>}
  </Dialog>
);
