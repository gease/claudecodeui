import { useNavigate } from 'react-router-dom';

import { useWebSocket } from '../contexts/WebSocketContext';

import { useDeviceSettings } from './useDeviceSettings';
import { useSessionProtection } from './useSessionProtection';
import { useProjectsState } from './useProjectsState';

type UseAppShellStateArgs = {
  sessionId?: string;
};

/**
 * Wiring shared by every page that renders the app shell (sidebar + a main
 * panel): device/mobile detection, the websocket connection, session
 * processing state, and the project/session list that feeds the sidebar.
 * AppContent consumes the full result (chat surface needs all of it);
 * CreateUserPage only destructures the sidebar-facing subset.
 */
export function useAppShellState({ sessionId }: UseAppShellStateArgs = {}) {
  const navigate = useNavigate();
  const { isMobile } = useDeviceSettings({ trackPWA: false });
  const { ws, sendMessage, subscribe } = useWebSocket();
  const sessionProtection = useSessionProtection();

  const projectsState = useProjectsState({
    sessionId,
    navigate,
    subscribe,
    isMobile,
    activeSessions: sessionProtection.processingSessions,
  });

  return {
    navigate,
    isMobile,
    ws,
    sendMessage,
    subscribe,
    ...sessionProtection,
    ...projectsState,
  };
}
