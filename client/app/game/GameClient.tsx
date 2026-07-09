import { useEffect, useRef, useState } from "react";
import type { GameSession } from "./types";

type PhaserGame = import("phaser").Game;

export function GameClient({ accessToken, apiUrl, user }: GameSession) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<PhaserGame | null>(null);
  const [status, setStatus] = useState("Booting lobby...");

  useEffect(() => {
    if (!apiUrl) {
      setStatus("Missing VITE_API_URL. Set it before opening the lobby.");
      return;
    }

    let cancelled = false;

    async function boot() {
      const [{ default: Phaser }, { HomeLobbyScene }] = await Promise.all([
        import("phaser"),
        import("./scenes/HomeLobbyScene"),
      ]);

      if (cancelled || !containerRef.current) return;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: "#0f172a",
        pixelArt: true,
        roundPixels: true,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        physics: {
          default: "arcade",
          arcade: { debug: false },
        },
        scene: [new HomeLobbyScene({ accessToken, apiUrl, user })],
      });

      gameRef.current = game;
      setStatus("Connected to lobby");
    }

    boot().catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Could not boot lobby");
    });

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [accessToken, apiUrl, user]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <div ref={containerRef} className="h-full w-full [image-rendering:pixelated]" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-cyan-200/30 bg-slate-950/75 px-4 py-3 text-xs shadow-xl">
        <p className="font-bold text-cyan-200">{user.username}</p>
        <p className="mt-1 text-slate-300">{status}</p>
      </div>
    </main>
  );
}
