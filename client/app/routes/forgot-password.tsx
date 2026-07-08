import type { Route } from "./+types/forgot-password";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";
import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Forgot password — mood-the-major" },
    { name: "description", content: "Reset your mood-the-major account password." },
  ];
}

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>
            We'll send a reset code to your email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
        <CardFooter className="justify-center">
          <Link to="/login" className="text-sm text-neutral-500">
            Back to{" "}
            <span className="text-neutral-900 font-medium underline underline-offset-4">
              log in
            </span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
