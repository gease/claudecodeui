import { useNavigate } from 'react-router-dom';

import AppShell from '../../app/AppShell';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { useDeviceSettings } from '../../../hooks/useDeviceSettings';
import { useSessionProtection } from '../../../hooks/useSessionProtection';
import { useProjectsState } from '../../../hooks/useProjectsState';

import CreateUser from './CreateUser';

/**
 * Standalone page for /create-user. Deliberately does not share AppContent:
 * it only needs the sidebar shell (via AppShell), not AppContent's
 * chat/session machinery (websocket message handling, running-sessions
 * polling, command palette). The sidebar still needs live project/session
 * data, so this pulls the same useProjectsState wiring AppContent uses to
 * produce it.
 */
export default function CreateUserPage() {
  const navigate = useNavigate();
  const { isMobile } = useDeviceSettings({ trackPWA: false });
  const { subscribe } = useWebSocket();
  const { processingSessions } = useSessionProtection();

  const { sidebarOpen, setSidebarOpen, sidebarSharedProps } = useProjectsState({
    navigate,
    subscribe,
    isMobile,
    activeSessions: processingSessions,
  });

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
