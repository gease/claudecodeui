import AppShell from '../../app/AppShell';
import { useAppShellState } from '../../../hooks/useAppShellState';

import CreateUser from './CreateUser';

/**
 * Standalone page for /create-user. Deliberately does not share AppContent:
 * it only needs the sidebar shell (via AppShell), not AppContent's
 * chat/session machinery (websocket message handling, running-sessions
 * polling, command palette). It reuses the same useAppShellState wiring
 * AppContent uses to produce the sidebar's live project/session data, and
 * only destructures the subset it actually needs.
 */
export default function CreateUserPage() {
  const { isMobile, sidebarOpen, setSidebarOpen, sidebarSharedProps } = useAppShellState();

  return (
    <AppShell
      isMobile={isMobile}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      sidebarSharedProps={sidebarSharedProps}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <CreateUser />
      </div>
    </AppShell>
  );
}
