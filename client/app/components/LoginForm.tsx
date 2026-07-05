import { useActionState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) alert("backend URL not found!");

// ---------- Types ----------
export interface FormState {
  error: string | null;
  success: string | null;
}

export const initialState: FormState = { error: null, success: null };

// ---------- Login ----------
export async function loginAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      credentials: "include", // required so the browser stores the httpOnly refresh cookie
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || "Login failed", success: null };
    }

    // TODO: store data.accessToken + data.user in your Zustand auth store here
    return { error: null, success: "Logged in successfully" };
  } catch {
    return {
      error: "Could not reach the server. Is the backend running?",
      success: null,
    };
  }
}

// ---------- Login form ----------
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
        />
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-600">{state.success}</p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Logging in..." : "Log in"}
      </Button>
    </form>
  );
}
