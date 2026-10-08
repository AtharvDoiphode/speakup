import { useAuth } from '../context/useAuth';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-cloud p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">
          Hello, {user.name}
        </h1>
        <button
          onClick={logout}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-cloud"
        >
          Log out
        </button>
      </div>
      <p className="mt-2 text-ink-soft">
        Role: {user.role}. The real dashboard comes later.
      </p>
    </div>
  );
}
