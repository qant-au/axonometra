import { EditorRoot } from '../../editor/EditorRoot';
import { WelcomeModal } from '../WelcomeModal';
import { ToolNavbar } from './ToolNavbar';
import { WallLengthDialog } from '../WallLengthDialog';
import { useInstance } from '../../editor/instance/context';
import { ShortcutsDialog } from '../ShortcutsDialog';
import { FindBar } from '../FindBar';
import { PlanContextMenu } from '../PlanContextMenu';

export function PageLayout() {
  const { config } = useInstance();
  // A host that loads the plan itself has no use for the welcome box.
  // Read-only hides the toolbar.
  const showWelcomeModal = config.showWelcome;
  const showToolbar = !config.readOnly;

  return (
    <>
      {showWelcomeModal && <WelcomeModal />}
      {showToolbar && <ToolNavbar></ToolNavbar>}
      {showToolbar && <WallLengthDialog />}
      <ShortcutsDialog />
      <FindBar />
      <PlanContextMenu />

      <EditorRoot />
    </>
  );
}
