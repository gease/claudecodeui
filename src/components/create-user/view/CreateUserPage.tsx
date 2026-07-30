import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Sidebar from '../../sidebar/view/Sidebar';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { useDeviceSettings } from '../../../hooks/useDeviceSettings';
import { useSessionProtection } from '../../../hooks/useSessionProtection';
import { useProjectsState } from '../../../hooks/useProjectsState';

import CreateUser from './CreateUser';

/**
 * Standalone page for /create-user. Deliberately does not share AppContent:
 * it only needs the sidebar shell, not AppContent's chat/session machinery
 * (websocket message handling, running-sessions polling, command palette).
 * The sidebar still needs live project/session data, so this pulls the same
 * useProjectsState wiring AppContent uses to produce it.
 */
export default function CreateUserPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
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
    <div className="fixed inset-0 flex bg-background" style={{ bottom: 'var(--keyboard-height, 0px)' }}>
      {!isMobile ? (
        <div className="h-full flex-shrink-0 border-r border-border/50">
          <Sidebar {...sidebarSharedProps} />
        </div>
      ) : (
        <div
          className={`fixed inset-0 z-50 flex transition-all duration-150 ease-out ${sidebarOpen ? 'visible opacity-100' : 'invisible opacity-0'
            }`}
        >
          <button
            className="fixed inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-150 ease-out"
            onClick={(event) => {
              event.stopPropagation();
              setSidebarOpen(false);
            }}
            onTouchStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSidebarOpen(false);
            }}
            aria-label={t('versionUpdate.ariaLabels.closeSidebar')}
          />
          <div
            className={`relative h-full w-[85vw] max-w-sm transform border-r border-border/40 bg-card transition-transform duration-150 ease-out sm:w-80 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <Sidebar {...sidebarSharedProps} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <CreateUser />
      </div>
    </div>
  );
}
