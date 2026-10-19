import type { ReactNode } from 'react';
import {
  Box,
  Divider,
  Stack,
  Typography,
  type SxProps,
  type Theme
} from '@mui/material';

// The inside of a properties panel: an optional header that stays put while
// the sections under it scroll.
export const Panel = ({
  header,
  children
}: {
  header?: ReactNode;
  children: ReactNode;
}) => (
  <Box
    sx={{
      position: 'relative',
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      pb: 2
    }}
  >
    {header && (
      <Box
        sx={{
          width: '100%',
          zIndex: 1,
          position: 'sticky',
          bgcolor: 'background.paper',
          top: 0
        }}
      >
        {header}
        <Divider />
      </Box>
    )}
    <Box sx={{ width: '100%', flexGrow: 1 }}>
      <Box sx={{ width: '100%' }}>{children}</Box>
    </Box>
  </Box>
);

// A group of controls, with an optional small uppercase title.
export const PanelSection = ({
  children,
  title,
  sx
}: {
  children: ReactNode;
  title?: string;
  sx?: SxProps<Theme>;
}) => (
  <Box sx={[{ pt: 3, px: 3 }, ...(Array.isArray(sx) ? sx : [sx])]}>
    <Stack>
      {title && (
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', textTransform: 'uppercase', pb: 1 }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Stack>
  </Box>
);

// The line at the top of a panel naming what is being edited.
export const PanelHeader = ({ title }: { title: string }) => (
  <PanelSection sx={{ py: 3 }}>
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {title}
    </Typography>
  </PanelSection>
);
