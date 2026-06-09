import { EditorRoot } from '../../editor/EditorRoot';
import { WelcomeModal } from '../WelcomeModal';
import { ToolNavbar } from './ToolNavbar';
import _AxonometraLogo from '../../res/logo.png';
import { embedConfig } from '../../embed/embedConfig';

export function PageLayout() {
  // Embedded host loads the plan via postMessage; the welcome modal
  // would block that flow. Readonly mode hides the toolbar.
  const showWelcomeModal = !embedConfig.embedded;
  const showToolbar = !embedConfig.readonly;

  return (
    <>
      {showWelcomeModal && <WelcomeModal />}
      {showToolbar && <ToolNavbar></ToolNavbar>}

      <EditorRoot />
    </>
  );
}
