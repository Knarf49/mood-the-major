import { useEffect } from "react";
import { useAuth } from "../../utils/authStore";
0
const API_URL = import.meta.env.VITE_API_URL;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, isLoading } = useAuth();

  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch(`${API_URL}/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("no session");
        const { user, accessToken } = await res.json();
        setAuth(user, accessToken);
      } catch {
        clearAuth();
      }
    }
    restoreSession();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}