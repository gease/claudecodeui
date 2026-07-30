import { Navigate } from 'react-router-dom';

import { useAuth } from '../../auth';

export default function CreateUser() {
  const { user } = useAuth();

  if (Number(user?.id) !== 1) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background text-foreground">
      <p className="text-2xl font-semibold">Hello World</p>
    </div>
  );
}
