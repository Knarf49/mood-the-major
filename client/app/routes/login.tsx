import type { Route } from "./+types/login";
import { LoginForm } from "../components/LoginForm";
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
    { title: "Log in — mood-the-major" },
    { name: "description", content: "Log in to your mood-the-major account." },
  ];
}

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Welcome back to mood-the-major.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="justify-center">
          <Link to="/signup" className="text-sm text-neutral-500">
            Don't have an account?{" "}
            <span className="text-neutral-900 font-medium underline underline-offset-4">
              Sign up
            </span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
