import type { CSSProperties, ReactNode } from 'react';
import { Card, type SxProps, type Theme } from '@mui/material';

interface Props {
  children: ReactNode;
  sx?: SxProps<Theme>;
  style?: CSSProperties;
}

// The card every floating toolbar and panel sits on.
export const Surface = ({ children, sx, style }: Props) => (
  <Card
    sx={[
      { borderRadius: 2, boxShadow: 1, borderColor: 'grey.400' },
      ...(Array.isArray(sx) ? sx : [sx])
    ]}
    style={style}
  >
    {children}
  </Card>
);
