import { useActionState, useState, useEffect } from "react";
import { Input } from "./ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Link } from "react-router";
import { type FormState, initialState, extractError } from "./LoginForm";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) alert("backend URL not found!");

async function forgotPasswordAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = formData.get("email") as string;

  try {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: extractError(data.error) || "Request failed", success: null, email: null };
    }

    return { error: null, success: data.message, email };
  } catch {
    return {
      error: "Could not reach the server. Is the backend running?",
      success: null,
      email: null,
    };
  }
}

async function resetPasswordAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;
  const newPassword = formData.get("newPassword") as string;

  try {
    const res = await fetch(`${API_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: extractError(data.error) || "Reset failed", success: null, email: null };
    }

    return { error: null, success: data.message, email };
  } catch {
    return {
      error: "Could not reach the server. Is the backend running?",
      success: null,
      email: null,
    };
  }
}

export function ForgotPasswordForm() {
  const [step, setStep] = useState<"email" | "code">("email");

  const [forgotState, forgotAction, forgotPending] = useActionState(
    forgotPasswordAction,
    initialState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  useEffect(() => {
    if (forgotState.success) {
      setStep("code");
    }
  }, [forgotState.success]);

  if (step === "code") {
    const email = forgotState.email ?? "";

    if (resetState.success) {
      return (
        <div className="space-y-4 text-center">
          <p className="text-sm text-emerald-600">{resetState.success}</p>
          <Link to="/login">
            <Button className="w-full">Back to log in</Button>
          </Link>
        </div>
      );
    }

    return (
      <form action={resetAction} className="space-y-4">
        <p className="text-sm text-neutral-600">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium text-neutral-900">{email}</span>{" "}
          and choose a new password.
        </p>

        <input type="hidden" name="email" value={email} />

        <div className="space-y-2">
          <Label>Reset code</Label>
          <InputOTP maxLength={6} name="code" containerClassName="justify-center">
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            placeholder="At least 8 characters"
            required
          />
        </div>

        {resetState.error && (
          <p className="text-sm text-red-500">{resetState.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={resetPending}>
          {resetPending ? "Resetting..." : "Reset password"}
        </Button>

        <button
          type="button"
          onClick={() => setStep("email")}
          className="w-full text-sm text-neutral-500 hover:text-neutral-700"
        >
          Try a different email
        </button>
      </form>
    );
  }

  return (
    <form action={forgotAction} className="space-y-4">
      <p className="text-sm text-neutral-600">
        Enter your email and we&apos;ll send you a code to reset your password.
      </p>

      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>

      {forgotState.error && (
        <p className="text-sm text-red-500">{forgotState.error}</p>
      )}
      {forgotState.success && (
        <p className="text-sm text-emerald-600">{forgotState.success}</p>
      )}

      <Button type="submit" className="w-full" disabled={forgotPending}>
        {forgotPending ? "Sending..." : "Send reset code"}
      </Button>
    </form>
  );
}
