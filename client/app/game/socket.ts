import { io, type Socket } from "socket.io-client";
import type { LobbyMovePayload, LobbyPlayer } from "./types";

export interface LobbyServerToClientEvents {
  "lobby:snapshot": (players: LobbyPlayer[]) => void;
  "player:joined": (player: LobbyPlayer) => void;
  "player:moved": (player: LobbyPlayer) => void;
  "player:left": (payload: { id: string }) => void;
}

export interface LobbyClientToServerEvents {
  "player:move": (payload: LobbyMovePayload) => void;
}

export type LobbySocket = Socket<LobbyServerToClientEvents, LobbyClientToServerEvents>;

export function createLobbySocket(apiUrl: string, token: string): LobbySocket {
  return io(`${apiUrl}/lobby`, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
}
