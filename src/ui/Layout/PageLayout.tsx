import { EditorRoot } from '../../editor/EditorRoot';
import { WelcomeModal } from '../WelcomeModal';
import { ToolNavbar } from './ToolNavbar';
import { WallLengthDialog } from '../WallLengthDialog';
import { embedConfig } from '../../embed/embedConfig';
import { ShortcutsDialog } from '../ShortcutsDialog';
import { FindBar } from '../FindBar';
import { PlanContextMenu } from '../PlanContextMenu';

export function PageLayout() {
  // Embedded host loads the plan via postMessage; the welcome modal
  // would block that flow. Readonly mode hides the toolbar.
  const showWelcomeModal = !embedConfig.embedded;
  const showToolbar = !embedConfig.readonly;

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
