import { IconButton, SvgIcon, type SxProps, type Theme } from '@mui/material';

interface Props {
  onClick: () => void;
  // Screen readers need a name; every close in both tools is "Close".
  label?: string;
  sx?: SxProps<Theme>;
}

export const CloseButton = ({ onClick, label = 'Close', sx }: Props) => (
  <IconButton aria-label={label} size="small" onClick={onClick} sx={sx}>
    <SvgIcon fontSize="small">
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </SvgIcon>
  </IconButton>
);
