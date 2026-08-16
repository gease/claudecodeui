import type { LLMProvider } from '@/shared/types.js';

/**
 * Global (not per-provider) in-memory lock: at most one provider login can be
 * in flight at a time, system-wide. This is what lets the credential file
 * watcher attribute a file change to a specific user without matching
 * anything — whatever this lock currently says is the login in progress.
 *
 * No persistence: a server restart is an implicit release, which is correct
 * — nothing survives a restart to attribute a resulting file change to.
 */
type LoginLock = { provider: LLMProvider; userId: number; startedAt: number } | null;

const MAX_LOCK_DURATION_MS = 5 * 60 * 1000;

let currentLock: LoginLock = null;
let failsafeTimer: ReturnType<typeof setTimeout> | null = null;

function clearFailsafeTimer(): void {
  if (failsafeTimer) {
    clearTimeout(failsafeTimer);
    failsafeTimer = null;
  }
}

export const providerLoginLockService = {
  /** Returns false without acquiring if another login is already in progress. */
  acquire(provider: LLMProvider, userId: number): boolean {
    if (currentLock) {
      return false;
    }

    currentLock = { provider, userId, startedAt: Date.now() };
    clearFailsafeTimer();
    // Last-resort backstop, independent of both the watcher's happy-path
    // release and the shell process's exit-handler failsafe — covers a login
    // that neither completes nor ever exits its shell process.
    failsafeTimer = setTimeout(() => {
      console.warn(
        `Provider login lock for "${provider}" (user ${userId}) timed out after ${MAX_LOCK_DURATION_MS}ms; releasing.`
      );
      currentLock = null;
      failsafeTimer = null;
    }, MAX_LOCK_DURATION_MS);

    return true;
  },

  /**
   * Releases only if the lock still belongs to the given (provider, userId) —
   * a no-op otherwise, so it's always safe to call from multiple release
   * paths (watcher happy path, shell exit failsafe) without coordination.
   */
  release(provider?: LLMProvider, userId?: number): void {
    if (!currentLock) {
      return;
    }

    if (provider !== undefined && currentLock.provider !== provider) {
      return;
    }

    if (userId !== undefined && currentLock.userId !== userId) {
      return;
    }

    currentLock = null;
    clearFailsafeTimer();
  },

  getStatus(): LoginLock {
    return currentLock;
  },
};
