import { Navigate } from 'react-router-dom';

import { useAuth } from '../../auth';
import CredentialsForm from '../../auth/view/CredentialsForm';

export default function CreateUser() {
  const { user } = useAuth();

  if (Number(user?.id) !== 1) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto bg-background p-4 text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold">Create User</h1>
        <CredentialsForm />
      </div>
    </div>
  );
}
