import type { UserDTO } from "../../../shared/schemas.js";

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

export interface LobbyMovePayload {
  x: number;
  y: number;
  direction: LobbyDirection;
  moving: boolean;
}

export interface GameSession {
  accessToken: string;
  apiUrl: string | undefined;
  user: UserDTO;
}
