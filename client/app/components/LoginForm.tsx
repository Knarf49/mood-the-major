import { useActionState, useState } from "react";
import { Link } from "react-router";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) alert("backend URL not found!");

// ---------- Types ----------
export interface FormState {
  error: string | null;
  success: string | null;
  email: string | null;
}

export const initialState: FormState = { error: null, success: null, email: null };

export function extractError(err: unknown): string | null {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "formErrors" in err) {
    const fe = (err as Record<string, unknown>).formErrors;
    if (Array.isArray(fe) && fe.length > 0) return String(fe[0]);
  }
  return null;
}

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
      return { error: extractError(data.error) || "Login failed", success: null, email: null };
    }

    // TODO: store data.accessToken + data.user in your Zustand auth store here
    return { error: null, success: "Logged in successfully", email: null };
  } catch {
    return {
      error: "Could not reach the server. Is the backend running?",
      success: null,
      email: null,
    };
  }
}

// ---------- Login form ----------
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="relative">
          <Input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pr-8"
            required
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-600">{state.success}</p>
      )}

      <div className="text-right">
        <Link to="/forgot-password" className="text-sm text-neutral-500 hover:text-neutral-700">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Logging in..." : "Log in"}
      </Button>
    </form>
  );
}
