import { useAuth } from '../context/useAuth';

// The shell (sidebar / tab bar) now provides the logo, navigation and Log out,
// so this page only holds its own content.
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-bold text-ink">Hello, {user.name}</h1>
      <p className="mt-2 text-ink-soft">
        Role: {user.role}. The real dashboard comes later.
      </p>
    </div>
  );
}
