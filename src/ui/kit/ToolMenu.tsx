import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Box,
  ClickAwayListener,
  Divider,
  ListItemIcon,
  ListItemText,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  type PopperPlacementType
} from '@mui/material';
import { ToolButton } from './ToolButton';

export interface ToolMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  // Draw a divider above this item.
  divider?: boolean;
}

interface Props {
  name: string;
  icon: ReactNode;
  items: ToolMenuItem[];
  // Open on hover as well as on click (a toolbar's "Add" menu). Off, it
  // opens on click only (a main menu).
  openOnHover?: boolean;
  // Shown under the items, after a divider, such as a version number.
  footer?: ReactNode;
  placement?: PopperPlacementType;
  // Gap between the button and the menu, in px.
  offset?: number;
  minWidth?: number;
  // How long a hover menu stays after the pointer leaves, in ms.
  closeDelay?: number;
  // Controlled: the host keeps the open state (to suppress shortcuts while it
  // is open, say). Leave out to let the menu keep its own.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// A toolbar button that opens a menu. The menu is not modal: a click outside
// closes it and still reaches whatever was clicked.
export const ToolMenu = ({
  name,
  icon,
  items,
  openOnHover = true,
  footer,
  placement = 'right-start',
  offset = 8,
  minWidth,
  closeDelay = 500,
  open: openProp,
  onOpenChange
}: Props) => {
  const anchor = useRef<HTMLSpanElement>(null);
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  // Opened from the keyboard or a click: move focus into the menu.
  const [focusItems, setFocusItems] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancelClose = () => clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    if (!openOnHover) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), closeDelay);
  };
  const show = (focus: boolean) => {
    cancelClose();
    setFocusItems(focus);
    setOpen(true);
  };
  const close = () => {
    cancelClose();
    setOpen(false);
  };
  // Closed from the keyboard: focus goes back to the button.
  const closeToButton = () => {
    close();
    anchor.current?.querySelector('button')?.focus();
  };
  useEffect(() => cancelClose, []);

  const hover = openOnHover
    ? { onMouseEnter: () => show(false), onMouseLeave: scheduleClose }
    : {};

  return (
    <>
      <Box
        component="span"
        ref={anchor}
        sx={{ display: 'inline-flex' }}
        {...hover}
      >
        <ToolButton
          name={name}
          icon={icon}
          hasPopup
          expanded={open}
          onClick={() =>
            open && (focusItems || !openOnHover) ? close() : show(true)
          }
        />
      </Box>
      <Popper
        open={open}
        // A function, so the ref is read when the menu opens, not in render.
        anchorEl={() => anchor.current as HTMLElement}
        placement={placement}
        modifiers={[{ name: 'offset', options: { offset: [0, offset] } }]}
        sx={{ zIndex: (theme) => theme.zIndex.modal }}
      >
        <ClickAwayListener
          onClickAway={(e) => {
            // The button toggles the menu itself.
            if (anchor.current?.contains(e.target as Node)) return;
            close();
          }}
        >
          <Paper
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            sx={{ boxShadow: 3, minWidth }}
          >
            <MenuList
              aria-label={name}
              autoFocusItem={focusItems}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  closeToButton();
                } else if (e.key === 'Tab') close();
              }}
            >
              {items.map((item, i) => (
                <Fragment key={item.label}>
                  {item.divider && i > 0 && <Divider />}
                  <MenuItem
                    onClick={() => {
                      close();
                      item.onClick();
                    }}
                  >
                    {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                    <ListItemText>{item.label}</ListItemText>
                  </MenuItem>
                </Fragment>
              ))}
            </MenuList>
            {footer && (
              <>
                <Divider />
                <Box sx={{ px: 2, py: 1 }}>{footer}</Box>
              </>
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
};
