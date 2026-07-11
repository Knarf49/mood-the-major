import { describe, expect, it } from "vitest";
import {
  CHARACTER_FRAME_URLS,
  TILE_TEXTURE_URLS,
  getDirectionIdleFrame,
  getDirectionWalkFrames,
} from "../app/game/assets";
import type { LobbyDirection } from "../app/game/types";

const directions: LobbyDirection[] = ["down", "left", "right", "up"];

describe("game asset manifest", () => {
  it("exposes idle and walk frames for every lobby direction", () => {
    for (const direction of directions) {
      expect(CHARACTER_FRAME_URLS[direction].idle).toMatch(/\.png/);
      expect(CHARACTER_FRAME_URLS[direction].walk.length).toBeGreaterThanOrEqual(4);
      expect(getDirectionIdleFrame(direction)).toBe(CHARACTER_FRAME_URLS[direction].idle);
      expect(getDirectionWalkFrames(direction)).toEqual(CHARACTER_FRAME_URLS[direction].walk);
    }
  });

  it("exposes tile and object textures used by the lobby scene", () => {
    expect(Object.keys(TILE_TEXTURE_URLS)).toEqual(
      expect.arrayContaining([
        "grass",
        "asphalt",
        "concrete",
        "roadLine",
        "crosswalk",
        "tree",
        "bench",
        "lamp",
        "trashBin",
        "bush",
        "planter",
        "signpost",
      ]),
    );

    for (const url of Object.values(TILE_TEXTURE_URLS)) {
      expect(url).toMatch(/\.png/);
    }
  });
});
