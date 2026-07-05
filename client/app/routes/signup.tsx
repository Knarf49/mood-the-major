import type { Route } from "./+types/signup";
import { SignupForm } from "../components/SignupForm";
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
    { title: "Sign up — mood-the-major" },
    { name: "description", content: "Create a mood-the-major account." },
  ];
}

export default function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Join the board and start sharing sticky notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
        <CardFooter className="justify-center">
          <Link to="/login" className="text-sm text-neutral-500">
            Already have an account?{" "}
            <span className="text-neutral-900 font-medium underline underline-offset-4">
              Log in
            </span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
