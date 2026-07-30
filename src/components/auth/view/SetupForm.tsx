import AuthScreenLayout from './AuthScreenLayout';
import CredentialsForm from './CredentialsForm';

/**
 * Account setup / registration screen, shown pre-login when no user exists yet.
 */
export default function SetupForm() {
  return (
    <AuthScreenLayout
      title="Welcome to CloudCLI"
      description="Set up your account to get started"
      footerText="This is a single-user system. Only one account can be created."
    >
      <CredentialsForm />
    </AuthScreenLayout>
  );
}
