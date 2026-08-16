import { authenticatedFetch } from '../../../utils/api';
import type { LLMProvider } from '../../../types/app';

type LoginLockStatus = {
  locked: boolean;
  provider: LLMProvider | null;
  userId: number | null;
};

type LoginLockStatusApiResponse = {
  success: boolean;
  data: LoginLockStatus;
};

const IDLE_STATUS: LoginLockStatus = { locked: false, provider: null, userId: null };

/** One-shot check of the global provider-login lock, so at most one login is ever attempted at once. */
export async function fetchLoginLockStatus(): Promise<LoginLockStatus> {
  try {
    const response = await authenticatedFetch('/api/providers/login-lock/status');
    if (!response.ok) {
      return IDLE_STATUS;
    }

    const payload = await response.json() as LoginLockStatusApiResponse;
    return {
      locked: Boolean(payload.data?.locked),
      provider: payload.data?.provider ?? null,
      userId: payload.data?.userId ?? null,
    };
  } catch (error) {
    console.error('Error checking login lock status:', error);
    return IDLE_STATUS;
  }
}
