import os from 'node:os';
import path from 'node:path';
import { promises as fsPromises } from 'node:fs';

import chokidar, { type FSWatcher } from 'chokidar';

import { credentialsDb } from '@/modules/database/index.js';
import { providerLoginLockService } from '@/modules/providers/services/provider-login-lock.service.js';
import { readObjectRecord, readOptionalString } from '@/shared/utils.js';

const CLAUDE_CREDENTIALS_PATH = path.join(os.homedir(), '.claude', '.credentials.json');
// Snapshot of the primary user's (user id 1) real credential, taken whenever
// their own login writes the live file. Non-primary logins revert the live
// file to this content afterward — see handleClaudeCredentialsEvent.
const CLAUDE_CREDENTIALS_BACKUP_PATH = path.join(os.homedir(), '.claude', '.credentials.primary.json');

let watcher: FSWatcher | null = null;
// Serializes event handling so overlapping add/change/unlink events on the
// same file can never race each other's read-modify-write.
let processingChain: Promise<void> = Promise.resolve();

async function readCredentialsFile(filePath: string): Promise<string | null> {
  try {
    return await fsPromises.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function extractClaudeAccessToken(fileContent: string): string | null {
  try {
    const parsed = readObjectRecord(JSON.parse(fileContent));
    const oauth = readObjectRecord(parsed?.claudeAiOauth);
    return readOptionalString(oauth?.accessToken) ?? null;
  } catch {
    return null;
  }
}

/**
 * Attribution and revert logic for one add/change/unlink event on Claude's
 * credentials file. Reads the login lock to decide who this event belongs
 * to: no lock (or a lock for a different provider) means this app didn't
 * cause the write, so it's left alone untouched.
 */
async function handleClaudeCredentialsEvent(eventType: 'add' | 'change' | 'unlink'): Promise<void> {
  const lock = providerLoginLockService.getStatus();

  if (!lock || lock.provider !== 'claude') {
    return;
  }

  if (eventType === 'unlink') {
    // Evidence the in-progress login completed via delete+recreate (atomic
    // write) rather than in-place edit — the following 'add' does the actual
    // work. An external `claude logout` while the lock is held would also
    // land here; there's nothing to revert to yet in that case either.
    return;
  }

  const { userId } = lock;

  try {
    if (userId === 1) {
      // Canonical identity: this is the real credential. Snapshot it as the
      // new "true copy" that future non-primary logins get reverted to.
      const content = await readCredentialsFile(CLAUDE_CREDENTIALS_PATH);
      if (content !== null) {
        await fsPromises.writeFile(CLAUDE_CREDENTIALS_BACKUP_PATH, content, 'utf8');
      }
      return;
    }

    const content = await readCredentialsFile(CLAUDE_CREDENTIALS_PATH);
    const accessToken = content ? extractClaudeAccessToken(content) : null;

    if (accessToken) {
      credentialsDb.replaceCredential(userId, 'Claude OAuth Token', 'claude_oauth_token', accessToken);
    } else {
      console.warn(
        `Claude credentials file changed during user ${userId}'s login but no access token was found; nothing captured.`
      );
    }

    const backupContent = await readCredentialsFile(CLAUDE_CREDENTIALS_BACKUP_PATH);
    if (backupContent !== null) {
      // Restore the primary user's real credential.
      await fsPromises.writeFile(CLAUDE_CREDENTIALS_PATH, backupContent, 'utf8');
    } else {
      // Primary user has never logged in — there is nothing to revert to.
      await fsPromises.unlink(CLAUDE_CREDENTIALS_PATH).catch(() => {});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to process Claude credentials file change', { userId, error: message });
  } finally {
    providerLoginLockService.release('claude', userId);
  }
}

function queueClaudeCredentialsEvent(eventType: 'add' | 'change' | 'unlink'): void {
  processingChain = processingChain
    .then(() => handleClaudeCredentialsEvent(eventType))
    .catch((error) => {
      console.error('Unhandled error while processing Claude credentials file event', error);
    });
}

/**
 * Starts watching Claude's credential file for app-initiated login writes.
 * Scoped to Claude only for now — Codex/OpenCode need their own verification
 * spikes (see the implementation plan) before extending this watcher to them.
 */
export async function initializeCredentialFileWatcher(): Promise<void> {
  try {
    await fsPromises.mkdir(path.dirname(CLAUDE_CREDENTIALS_PATH), { recursive: true });

    watcher = chokidar.watch(CLAUDE_CREDENTIALS_PATH, {
      persistent: true,
      ignoreInitial: true,
      usePolling: true,
      interval: 2_000,
      binaryInterval: 2_000,
    });

    watcher
      .on('add', () => queueClaudeCredentialsEvent('add'))
      .on('change', () => queueClaudeCredentialsEvent('change'))
      .on('unlink', () => queueClaudeCredentialsEvent('unlink'))
      .on('error', (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Credential file watcher error', { error: message });
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to initialize credential file watcher', { error: message });
  }
}

export async function closeCredentialFileWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}
