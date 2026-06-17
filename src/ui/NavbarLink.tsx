import { type Icon as TablerIcon } from '@tabler/icons-react';

import { Tooltip, UnstyledButton } from '@mantine/core';
import classes from './NavbarLink.module.css';

interface NavbarLinkProps {
  icon: TablerIcon;
  label?: string;
  active?: boolean;
  onClick?(): void;
}

export function NavbarLink({
  icon: Icon,
  label,
  active,
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
        aria-label={label}
        className={`${classes.link}${active ? ` ${classes.active}` : ''}`}
      >
        <Icon />
      </UnstyledButton>
    </Tooltip>
  );
}
