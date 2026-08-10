import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../../../../../../../shared/view/ui';
import { authenticatedFetch } from '../../../../../../../utils/api';
import type { AgentProvider } from '../../../../../types/types';

type ApiKeyContentProps = {
  agent: AgentProvider;
};

type SaveState = 'idle' | 'saving' | 'success' | 'error';

type CreateCredentialResponse = {
  success?: boolean;
  error?: string;
};

// Metadata-only shape: the backend never returns credential_value here, by
// design (same as the GitHub token list) — the browser can only ever learn
// that a key is saved, not what it is.
type CredentialRow = {
  id: number;
  credential_name: string;
  created_at: string;
  is_active: boolean | number;
};

type ListCredentialsResponse = {
  credentials?: CredentialRow[];
};

const agentDisplayName: Record<AgentProvider, string> = {
  claude: 'Claude',
  cursor: 'Cursor',
  codex: 'Codex',
  opencode: 'OpenCode',
};

export default function ApiKeyContent({ agent }: ApiKeyContentProps) {
  const { t } = useTranslation('settings');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [existingCredential, setExistingCredential] = useState<CredentialRow | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const agentName = agentDisplayName[agent];
  const credentialType = `${agent}_api_key`;

  const fetchExistingCredential = useCallback(async () => {
    setLoadingExisting(true);
    try {
      const response = await authenticatedFetch(
        `/api/settings/credentials?type=${encodeURIComponent(credentialType)}`,
      );
      const payload = await response.json() as ListCredentialsResponse;
      // Rows are ordered created_at DESC, so the first active one is current.
      const active = (payload.credentials ?? []).find((credential) => credential.is_active);
      setExistingCredential(active ?? null);
    } catch {
      setExistingCredential(null);
    } finally {
      setLoadingExisting(false);
    }
  }, [credentialType]);

  useEffect(() => {
    void fetchExistingCredential();
  }, [fetchExistingCredential]);

  const handleSave = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      return;
    }

    setSaveState('saving');
    try {
      const response = await authenticatedFetch('/api/settings/credentials', {
        method: 'POST',
        body: JSON.stringify({
          credentialName: `${agentName} API Key`,
          credentialType,
          credentialValue: trimmedKey,
        }),
      });
      const payload = await response.json() as CreateCredentialResponse;

      if (!response.ok || !payload.success) {
        setSaveState('error');
        return;
      }

      setSaveState('success');
      setApiKey('');
      await fetchExistingCredential();
    } catch {
      setSaveState('error');
    } finally {
      window.setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">
          {t('agents.apiKey.title', { defaultValue: 'API Key' })}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('agents.apiKey.description', {
            agent: agentName,
            defaultValue: `Provide an API key for ${agentName}.`,
          })}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="agent-api-key" className="text-sm font-medium text-foreground">
          {t('agents.apiKey.label', { defaultValue: 'API Key' })}
        </label>
        <div className="relative">
          <Input
            id="agent-api-key"
            // Always type="text": a real type="password" input makes Chrome
            // treat this as a login field and silently autofill its own
            // generated password suggestion. Masking is done with CSS
            // instead, which doesn't trigger that heuristic.
            type="text"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={existingCredential
              ? t('agents.apiKey.placeholderReplace', {
                defaultValue: 'Key is set — enter a new value to replace it',
              })
              : t('agents.apiKey.placeholder', { defaultValue: 'Enter your API key' })}
            autoComplete="off"
            className="pr-10"
            style={showApiKey ? undefined : ({ WebkitTextSecurity: 'disc' } as CSSProperties)}
          />
          <button
            type="button"
            onClick={() => setShowApiKey((previous) => !previous)}
            aria-label={showApiKey
              ? t('agents.apiKey.hide', { defaultValue: 'Hide API key' })
              : t('agents.apiKey.show', { defaultValue: 'Show API key' })}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
          >
            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {!loadingExisting && existingCredential && (
          <p className="text-xs text-muted-foreground">
            {t('agents.apiKey.currentlySet', {
              date: new Date(existingCredential.created_at).toLocaleDateString(),
              defaultValue: `API key saved on ${new Date(existingCredential.created_at).toLocaleDateString()}`,
            })}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={!apiKey.trim() || saveState === 'saving'}
          onClick={() => void handleSave()}
        >
          {saveState === 'saving'
            ? t('agents.apiKey.saving', { defaultValue: 'Saving...' })
            : t('agents.apiKey.save', { defaultValue: 'Save key' })}
        </Button>

        {saveState === 'success' && (
          <span className="text-sm text-green-600 dark:text-green-400">
            {t('agents.apiKey.saveSuccess', { defaultValue: 'Saved' })}
          </span>
        )}
        {saveState === 'error' && (
          <span className="text-sm text-red-600 dark:text-red-400">
            {t('agents.apiKey.saveError', { defaultValue: 'Failed to save' })}
          </span>
        )}
      </div>
    </div>
  );
}
