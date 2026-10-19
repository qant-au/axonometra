import { useState, type MouseEvent, type ReactNode } from 'react';
import { Box, Button, Tooltip, type TooltipProps } from '@mui/material';

export interface ToolButtonProps {
  name: string;
  icon: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltipPosition?: TooltipProps['placement'];
  // For a button that opens a menu.
  hasPopup?: boolean;
  expanded?: boolean;
}

// A square icon button with a tooltip: one tool on a toolbar.
export const ToolButton = ({
  name,
  icon,
  onClick,
  isActive,
  disabled = false,
  tooltipPosition = 'bottom',
  hasPopup,
  expanded
}: ToolButtonProps) => {
  // Palette roles rather than fixed greys, so both light and dark read.
  const iconColor = isActive
    ? 'primary.contrastText'
    : disabled
      ? 'action.disabled'
      : 'text.secondary';
  // A tap fires the browser's compatibility mouseover and never a
  // mouseleave, so the hover tooltip opened after a tap and stayed up
  // (UI sweep 2026-09-30, a toolbar button at 390px). A
  // touch or pen pointer gets MUI's long-press tooltip only; a mouse over
  // the button turns hover back on.
  const [touch, setTouch] = useState(false);

  return (
    <Tooltip
      title={name}
      placement={tooltipPosition}
      enterDelay={1000}
      enterNextDelay={1000}
      arrow
      // The button carries its own aria-label; this stops the tooltip from
      // naming the wrapper too.
      describeChild
      disableHoverListener={touch}
      disableFocusListener={touch}
    >
      {/* A disabled button fires no events, so the tooltip hangs on a wrapper. */}
      <Box
        component="span"
        sx={{ display: 'inline-flex' }}
        onPointerOver={(e) => {
          setTouch(e.pointerType !== 'mouse');
        }}
        onPointerDown={(e) => {
          setTouch(e.pointerType !== 'mouse');
        }}
      >
        <Button
          variant="text"
          onClick={onClick}
          disabled={disabled}
          aria-label={name}
          {...(isActive !== undefined ? { 'aria-pressed': isActive } : {})}
          {...(hasPopup
            ? { 'aria-haspopup': 'menu' as const, 'aria-expanded': !!expanded }
            : {})}
          sx={(theme) => ({
            borderRadius: 0,
            height: theme.customVars.toolMenu.height,
            width: theme.customVars.toolMenu.height,
            maxWidth: '100%',
            minWidth: 'auto',
            p: 0,
            m: 0,
            // primary.main: white on primary.light was 2.6:1.
            bgcolor: isActive ? 'primary.main' : undefined,
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2
            }
          })}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: iconColor,
              svg: { color: iconColor }
            }}
          >
            {icon}
          </Box>
        </Button>
      </Box>
    </Tooltip>
  );
};
