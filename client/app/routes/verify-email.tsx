import { useActionState, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { extractError } from "../components/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";

const API_URL = import.meta.env.VITE_API_URL;

interface FormState {
  error: string | null;
  success: boolean;
}

const initialState: FormState = { error: null, success: false };

async function verifyEmailAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;

  try {
    const res = await fetch(`${API_URL}/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: extractError(data.error) || "Invalid or expired code", success: false };
    }

    return { error: null, success: true };
  } catch {
    return {
      error: "Could not reach the server. Is the backend running?",
      success: false,
    };
  }
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(emailFromUrl);
  const navigate = useNavigate();

  const [state, formAction, isPending] = useActionState(
    verifyEmailAction,
    initialState,
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            {email ? (
              <>
                We sent a 6-digit code to{" "}
                <span className="font-medium text-neutral-900">{email}</span>.
                Enter it below.
              </>
            ) : (
              "Enter the 6-digit code we sent to your email."
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {state.success ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-emerald-600">
                Email verified successfully.
              </p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Go to login
              </Button>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-email-input">Email</Label>
                <Input
                  id="verify-email-input"
                  name="email"
                  type="email"
                  value={email}
                  readOnly={!!emailFromUrl}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Verification code</Label>
                <InputOTP maxLength={6} name="code" containerClassName="justify-center">
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {state.error && (
                <p className="text-sm text-red-500">{state.error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Verifying..." : "Verify email"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-sm text-neutral-500"
          >
            Back to{" "}
            <span className="text-neutral-900 font-medium underline underline-offset-4">
              login
            </span>
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
