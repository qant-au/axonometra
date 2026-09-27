import { type Icon as TablerIcon } from '@tabler/icons-react';

import { Tooltip, UnstyledButton } from '@mantine/core';
import classes from './NavbarLink.module.css';

interface NavbarLinkProps {
  icon: TablerIcon;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?(): void;
}

export function NavbarLink({
  icon: Icon,
  label,
  active,
  disabled,
  onClick
}: NavbarLinkProps) {
  return (
    <Tooltip
      label={label}
      position="right"
      withArrow
      transitionProps={{ duration: 0 }}
    >
      <UnstyledButton
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`${classes.link}${active ? ` ${classes.active}` : ''}`}
      >
        <Icon />
      </UnstyledButton>
    </Tooltip>
  );
}
