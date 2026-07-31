import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, Loader2, Lock, ShieldCheck, User } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import AuthErrorAlert from './AuthErrorAlert';
import AuthInputField from './AuthInputField';

type CredentialsFormState = {
  username: string;
  password: string;
  confirmPassword: string;
};

const initialState: CredentialsFormState = {
  username: '',
  password: '',
  confirmPassword: '',
};

type CredentialsFormProps = {
  /**
   * 'setup' (default) signs the caller into the newly created account, as
   * used by the pre-login bootstrap screen. 'create-user' is for the primary
   * user creating an additional account from a page they're already signed
   * into — it must not touch their own session, so it stays on the form and
   * shows a success message instead.
   */
  variant?: 'setup' | 'create-user';
};

/**
 * Validates the account-setup form state.
 * @returns An error message string if validation fails, or `null` when the
 *   form is valid.
 */
function validateCredentialsForm(formState: CredentialsFormState): string | null {
  if (!formState.username.trim() || !formState.password || !formState.confirmPassword) {
    return 'Please fill in all fields.';
  }

  if (formState.username.trim().length < 3) {
    return 'Username must be at least 3 characters long.';
  }

  if (formState.password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }

  if (formState.password !== formState.confirmPassword) {
    return 'Passwords do not match.';
  }

  return null;
}

/**
 * Username/password/confirm-password fields shared by the initial account
 * setup screen (SetupForm) and the create-user page. Both submit through the
 * same `register` call; SetupForm is reachable only pre-login (needsSetup),
 * so in practice this is the same "create the one account" action either way.
 * Uses `autoComplete="new-password"` on password fields so that password
 * managers recognise this as a registration flow and offer to save the new
 * credentials after submission.
 */
export default function CredentialsForm({ variant = 'setup' }: CredentialsFormProps) {
  const { register, createUser } = useAuth();

  const [formState, setFormState] = useState<CredentialsFormState>(initialState);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: keyof CredentialsFormState, value: string) => {
    setFormState((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMessage('');
      setSuccessMessage('');

      const validationError = validateCredentialsForm(formState);
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      setIsSubmitting(true);
      const username = formState.username.trim();
      const result = variant === 'create-user'
        ? await createUser(username, formState.password)
        : await register(username, formState.password);

      if (!result.success) {
        setErrorMessage(result.error);
      } else if (variant === 'create-user') {
        setFormState(initialState);
        setSuccessMessage(`Account "${username}" created.`);
      }
      setIsSubmitting(false);
    },
    [createUser, formState, register, variant],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInputField
        id="username"
        name="username"
        label="Username"
        value={formState.username}
        onChange={(value) => updateField('username', value)}
        placeholder="Choose a username"
        isDisabled={isSubmitting}
        autoComplete="username"
        icon={User}
      />

      <AuthInputField
        id="password"
        name="password"
        label="Password"
        value={formState.password}
        onChange={(value) => updateField('password', value)}
        placeholder="Create a password"
        isDisabled={isSubmitting}
        type="password"
        autoComplete="new-password"
        icon={Lock}
      />

      <AuthInputField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm Password"
        value={formState.confirmPassword}
        onChange={(value) => updateField('confirmPassword', value)}
        placeholder="Re-enter your password"
        isDisabled={isSubmitting}
        type="password"
        autoComplete="new-password"
        icon={ShieldCheck}
      />

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        At least 3 characters for username, 6 for password.
      </p>

      <AuthErrorAlert errorMessage={errorMessage} />

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-sm leading-relaxed">{successMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-primary/30 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-card active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {variant === 'create-user' ? 'Creating...' : 'Setting up...'}
          </>
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  );
}
