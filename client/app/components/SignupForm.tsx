import { useActionState, useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { type FormState, initialState, extractError } from "./LoginForm";
import { useNavigate } from "react-router";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) alert("backend URL not found!");

export async function signupAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        error: extractError(data.error) || "Signup failed",
        success: null,
        email: null,
      };
    }

    return {
      error: null,
      success: "Account created — check your email to verify it.",
      email,
    };
  } catch {
    return {
      error: "Could not reach the server. Is the backend running?",
      success: null,
      email: null,
    };
  }
}

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState,
  );
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.success && state.email) {
      navigate(`/verify-email?email=${encodeURIComponent(state.email)}`);
    }
  }, [state.success, state.email, navigate]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-username">Username</Label>
        <Input
          id="signup-username"
          name="username"
          type="text"
          placeholder="janedoe"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 8 characters"
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

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating account..." : "Sign up"}
      </Button>
    </form>
  );
}
