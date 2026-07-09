import type { Route } from "./+types/home";
import { Link } from "react-router";
import { GameClient } from "../game/GameClient";
import { useAuth } from "../../utils/authStore";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mood Lobby" },
    { name: "description", content: "Multiplayer top-down pixel lobby" },
  ];
}

export default function Home() {
  const { user, accessToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white grid place-items-center">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Loading lobby...</p>
      </main>
    );
  }

  if (!user || !accessToken) {
    return (
      <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
        <section className="max-w-md rounded-2xl border border-cyan-300/30 bg-slate-900/80 p-8 text-center shadow-2xl shadow-cyan-950/40">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-cyan-200">Home Lobby</p>
          <h1 className="text-3xl font-black">Log in to enter the lobby</h1>
          <p className="mt-4 text-sm text-slate-300">
            Multiplayer lobby is only open to logged-in users.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-lg bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200"
          >
            Log in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <GameClient
      accessToken={accessToken}
      apiUrl={import.meta.env.VITE_API_URL}
      user={user}
    />
  );
}
