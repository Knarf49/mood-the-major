import type { LobbyDirection } from "./types";

type CharacterFrames = Record<LobbyDirection, { idle: string; walk: string[] }>;

const idleUrls = import.meta.glob("../../assets/chracter_clean/idle/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const moveDownUrls = import.meta.glob("../../assets/chracter_clean/move_down/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const moveLeftUrls = import.meta.glob("../../assets/chracter_clean/move_left/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const moveRightUrls = import.meta.glob("../../assets/chracter_clean/move_right/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const moveUpUrls = import.meta.glob("../../assets/chracter_clean/move_up/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const tileUrls = import.meta.glob("../../assets/tilemap/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

function sortedUrls(urls: Record<string, string>) {
  return Object.entries(urls)
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([, url]) => url);
}

const WALK_FRAMES: Record<LobbyDirection, string[]> = {
  down: sortedUrls(moveDownUrls),
  left: sortedUrls(moveLeftUrls),
  right: sortedUrls(moveRightUrls),
  up: sortedUrls(moveUpUrls),
};

function requiredFirst(urls: string[], label: string) {
  const first = urls[0];
  if (!first) throw new Error(`Missing game asset: ${label}`);
  return first;
}

function requiredTile(fileName: string) {
  const entry = Object.entries(tileUrls).find(([path]) => path.endsWith(`/${fileName}`));
  if (!entry) throw new Error(`Missing tile asset: ${fileName}`);
  return entry[1];
}

const idleFrames = sortedUrls(idleUrls);

export const CHARACTER_FRAME_URLS: CharacterFrames = {
  down: {
    idle: requiredFirst(idleFrames, "idle/down"),
    walk: WALK_FRAMES.down,
  },
  left: {
    idle: requiredFirst(WALK_FRAMES.left, "idle/left"),
    walk: WALK_FRAMES.left,
  },
  right: {
    idle: requiredFirst(WALK_FRAMES.right, "idle/right"),
    walk: WALK_FRAMES.right,
  },
  up: {
    idle: requiredFirst(WALK_FRAMES.up, "idle/up"),
    walk: WALK_FRAMES.up,
  },
};

export const TILE_TEXTURE_URLS = {
  grass: requiredTile("pixelated_grassy_tile_with_flowers.png"),
  asphalt: requiredTile("gray_asphalt_pixel_texture.png"),
  concrete: requiredTile("concrete_tile_pattern_with_seams.png"),
  roadLine: requiredTile("mottled_asphalt_with_yellow_dashed_line.png"),
  crosswalk: requiredTile("pixelated_zebra_crossing_on_asphalt.png"),
  tree: requiredTile("pixel_art_tree_design.png"),
  bench: requiredTile("pixel_art_park_bench_icon.png"),
  lamp: requiredTile("pixel_art_street_lamp_design.png"),
  trashBin: requiredTile("pixel_art_trash_bin_design.png"),
  bush: requiredTile("pixel_art_bush_sprite_detail.png"),
  planter: requiredTile("pixel_art_concrete_planter_with_plant.png"),
  signpost: requiredTile("pixel_art_directional_signpost_asset.png"),
} as const;

export type TileTextureKey = keyof typeof TILE_TEXTURE_URLS;

export function getDirectionIdleFrame(direction: LobbyDirection) {
  return CHARACTER_FRAME_URLS[direction].idle;
}

export function getDirectionWalkFrames(direction: LobbyDirection) {
  return CHARACTER_FRAME_URLS[direction].walk;
}
