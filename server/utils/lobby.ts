import { Server } from "socket.io";
import { TokenPayload, verifyAccessToken } from "./jwt";

export type LobbyDirection = "down" | "left" | "right" | "up";

export interface LobbyPlayer {
  id: string;
  userId: string;
  username: string;
  x: number;
  y: number;
  direction: LobbyDirection;
  moving: boolean;
}

export interface LobbyMoveInput {
  x?: unknown;
  y?: unknown;
  direction?: unknown;
  moving?: unknown;
}

const SPAWN_X = 512;
const SPAWN_Y = 512;
const DIRECTIONS = new Set<LobbyDirection>(["down", "left", "right", "up"]);

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readDirection(value: unknown, fallback: LobbyDirection): LobbyDirection {
  return typeof value === "string" && DIRECTIONS.has(value as LobbyDirection)
    ? (value as LobbyDirection)
    : fallback;
}

export function createLobbyStore() {
  const players = new Map<string, LobbyPlayer>();

  return {
    join(socketId: string, user: TokenPayload): LobbyPlayer {
      const player: LobbyPlayer = {
        id: socketId,
        userId: user.id,
        username: user.username,
        x: SPAWN_X,
        y: SPAWN_Y,
        direction: "down",
        moving: false,
      };
      players.set(socketId, player);
      return player;
    },

    move(socketId: string, input: LobbyMoveInput): LobbyPlayer | undefined {
      const current = players.get(socketId);
      if (!current) return undefined;

      const updated: LobbyPlayer = {
        ...current,
        x: readNumber(input.x, current.x),
        y: readNumber(input.y, current.y),
        direction: readDirection(input.direction, current.direction),
        moving: typeof input.moving === "boolean" ? input.moving : current.moving,
      };
      players.set(socketId, updated);
      return updated;
    },

    leave(socketId: string): LobbyPlayer | undefined {
      const player = players.get(socketId);
      players.delete(socketId);
      return player;
    },

    snapshot(): LobbyPlayer[] {
      return Array.from(players.values());
    },
  };
}

export function attachLobbyNamespace(io: Server) {
  const store = createLobbyStore();
  const lobby = io.of("/lobby");

  lobby.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") {
      next(new Error("Unauthorized"));
      return;
    }

    try {
      socket.data.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  lobby.on("connection", (socket) => {
    const user = socket.data.user as TokenPayload;
    const player = store.join(socket.id, user);

    socket.emit("lobby:snapshot", store.snapshot());
    socket.broadcast.emit("player:joined", player);

    socket.on("player:move", (input: LobbyMoveInput) => {
      const moved = store.move(socket.id, input);
      if (moved) {
        socket.broadcast.emit("player:moved", moved);
      }
    });

    socket.on("disconnect", () => {
      const left = store.leave(socket.id);
      if (left) {
        socket.broadcast.emit("player:left", { id: left.id });
      }
    });
  });
}
