import { Menu, MenuItem } from '@mui/material';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
}

interface Props {
  onClose: () => void;
  // Where it opens, in px, offset from the anchor element.
  position: { x: number; y: number };
  anchorEl?: HTMLElement;
  items: ContextMenuItem[];
}

// The right-click menu on the drawing.
export const ContextMenu = ({ onClose, position, anchorEl, items }: Props) => (
  <Menu
    open
    anchorEl={anchorEl}
    style={{ left: position.x, top: position.y }}
    onClose={onClose}
  >
    {items.map((item) => (
      <MenuItem key={item.label} onClick={item.onClick}>
        {item.label}
      </MenuItem>
    ))}
  </Menu>
);
