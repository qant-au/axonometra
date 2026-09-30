import { type Icon as TablerIcon } from '@tabler/icons-react';
import { ToolButton } from '@accurona/ui';

interface NavbarLinkProps {
  icon: TablerIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?(): void;
}

// One tool on the left toolbar: Accurona's shared ToolButton.
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
