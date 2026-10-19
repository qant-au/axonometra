import { type Icon as TablerIcon } from '@tabler/icons-react';
import { ToolButton } from './kit';

interface NavbarLinkProps {
  icon: TablerIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?(): void;
}

// One tool on the left toolbar: the kit's ToolButton (src/ui/kit).
export function NavbarLink({
  icon: Icon,
  label,
  active,
  disabled,
  onClick
}: NavbarLinkProps) {
  return (
    <ToolButton
      name={label}
      icon={<Icon />}
      isActive={active}
      disabled={disabled}
      onClick={onClick}
      tooltipPosition="right"
    />
  );
}
