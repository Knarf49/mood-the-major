import Phaser from "phaser";
import {
  CHARACTER_FRAME_URLS,
  TILE_TEXTURE_URLS,
  getDirectionIdleFrame,
  getDirectionWalkFrames,
  type TileTextureKey,
} from "../assets";
import { createLobbySocket, type LobbySocket } from "../socket";
import type { GameSession, LobbyDirection, LobbyMovePayload, LobbyPlayer } from "../types";

interface RemotePlayerRender {
  sprite: Phaser.Physics.Arcade.Sprite;
  label: Phaser.GameObjects.Text;
  target: LobbyPlayer;
}

const WORLD_WIDTH = 2048;
const WORLD_HEIGHT = 2048;
const TILE_SIZE = 32;
const PLAYER_DISPLAY_SIZE = 64;
const PLAYER_LABEL_OFFSET = 48;
const PLAYER_SPEED = 180;
const SEND_INTERVAL_MS = 80;
const DIRECTIONS: LobbyDirection[] = ["down", "left", "right", "up"];

const TILE_ENTRIES = Object.entries(TILE_TEXTURE_URLS) as [TileTextureKey, string][];

function idleTextureKey(direction: LobbyDirection) {
  return `player-${direction}-idle`;
}

function walkTextureKey(direction: LobbyDirection, index: number) {
  return `player-${direction}-walk-${index}`;
}

function tileTextureKey(key: TileTextureKey) {
  return `tile-${key}`;
}

export class HomeLobbyScene extends Phaser.Scene {
  private readonly session: GameSession;
  private socket: LobbySocket | null = null;
  private localPlayer?: Phaser.Physics.Arcade.Sprite;
  private localLabel?: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private direction: LobbyDirection = "down";
  private moving = false;
  private lastSentAt = 0;
  private remotePlayers = new Map<string, RemotePlayerRender>();

  constructor(session: GameSession) {
    super("HomeLobbyScene");
    this.session = session;
  }

  preload() {
    for (const direction of DIRECTIONS) {
      this.load.image(idleTextureKey(direction), getDirectionIdleFrame(direction));
      CHARACTER_FRAME_URLS[direction].walk.forEach((url, index) => {
        this.load.image(walkTextureKey(direction, index), url);
      });
    }

    for (const [key, url] of TILE_ENTRIES) {
      this.load.image(tileTextureKey(key), url);
    }
  }

  create() {
    this.createAnimations();
    this.drawWorld();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.localPlayer = this.physics.add.sprite(512, 512, idleTextureKey("down"));
    this.localPlayer.setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);
    this.localPlayer.setCollideWorldBounds(true);
    this.localPlayer.setDepth(10);

    this.localLabel = this.add
      .text(512, 480, this.session.user.username, {
        color: "#e0f2fe",
        fontFamily: "monospace",
        fontSize: "12px",
        stroke: "#020617",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.cameras.main.startFollow(this.localPlayer, true, 0.12, 0.12);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;

    this.connectLobby();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.disconnectLobby());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.disconnectLobby());
  }

  update(_time: number, delta: number) {
    if (!this.localPlayer) return;

    this.updateLocalMovement();
    this.updateLocalLabel();
    this.updateRemotePlayers(delta);
    this.emitMoveIfNeeded();
  }

  private drawWorld() {
    this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, tileTextureKey("grass"))
      .setDepth(0);
    this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 192, WORLD_HEIGHT, tileTextureKey("asphalt"))
      .setDepth(1);
    this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, 192, tileTextureKey("asphalt"))
      .setDepth(1);
    this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 384, 384, tileTextureKey("concrete"))
      .setDepth(2);

    this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, TILE_SIZE, WORLD_HEIGHT, tileTextureKey("roadLine"))
      .setDepth(3);
    this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 160, 192, 64, tileTextureKey("crosswalk"))
      .setDepth(4);
    this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 160, 192, 64, tileTextureKey("crosswalk"))
      .setDepth(4)
      .setFlipY(true);

    this.addDecorations();
  }

  private addDecorations() {
    const centerX = WORLD_WIDTH / 2;
    const centerY = WORLD_HEIGHT / 2;
    const objects: { key: TileTextureKey; x: number; y: number }[] = [
      { key: "tree", x: centerX - 280, y: centerY - 280 },
      { key: "tree", x: centerX + 280, y: centerY - 280 },
      { key: "tree", x: centerX - 280, y: centerY + 280 },
      { key: "tree", x: centerX + 280, y: centerY + 280 },
      { key: "bench", x: centerX - 144, y: centerY - 224 },
      { key: "bench", x: centerX + 144, y: centerY + 224 },
      { key: "lamp", x: centerX - 224, y: centerY - 96 },
      { key: "lamp", x: centerX + 224, y: centerY + 96 },
      { key: "trashBin", x: centerX - 224, y: centerY + 96 },
      { key: "bush", x: centerX + 224, y: centerY - 96 },
      { key: "planter", x: centerX - 96, y: centerY + 224 },
      { key: "signpost", x: centerX + 96, y: centerY - 224 },
    ];

    for (const object of objects) {
      this.add.image(object.x, object.y, tileTextureKey(object.key)).setDepth(5);
    }
  }

  private createAnimations() {
    for (const direction of DIRECTIONS) {
      const key = `walk-${direction}`;
      if (this.anims.exists(key)) continue;

      this.anims.create({
        key,
        frames: getDirectionWalkFrames(direction).map((_url, index) => ({
          key: walkTextureKey(direction, index),
        })),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  private updateLocalMovement() {
    if (!this.localPlayer?.body) return;

    const left = this.cursors?.left.isDown || this.wasd?.A.isDown;
    const right = this.cursors?.right.isDown || this.wasd?.D.isDown;
    const up = this.cursors?.up.isDown || this.wasd?.W.isDown;
    const down = this.cursors?.down.isDown || this.wasd?.S.isDown;

    let velocityX = 0;
    let velocityY = 0;

    if (left) velocityX -= 1;
    if (right) velocityX += 1;
    if (up) velocityY -= 1;
    if (down) velocityY += 1;

    if (velocityX !== 0 || velocityY !== 0) {
      const length = Math.hypot(velocityX, velocityY);
      velocityX = (velocityX / length) * PLAYER_SPEED;
      velocityY = (velocityY / length) * PLAYER_SPEED;
    }

    this.localPlayer.setVelocity(velocityX, velocityY);
    this.moving = velocityX !== 0 || velocityY !== 0;

    if (Math.abs(velocityX) > Math.abs(velocityY)) {
      this.direction = velocityX < 0 ? "left" : "right";
    } else if (velocityY !== 0) {
      this.direction = velocityY < 0 ? "up" : "down";
    }

    if (this.moving) {
      this.localPlayer.anims.play(`walk-${this.direction}`, true);
    } else {
      this.localPlayer.anims.stop();
      this.localPlayer.setTexture(idleTextureKey(this.direction));
    }
  }

  private updateLocalLabel() {
    if (!this.localPlayer || !this.localLabel) return;
    this.localLabel.setPosition(this.localPlayer.x, this.localPlayer.y - PLAYER_LABEL_OFFSET);
  }

  private connectLobby() {
    if (!this.session.apiUrl || this.socket) return;

    this.socket = createLobbySocket(this.session.apiUrl, this.session.accessToken);

    this.socket.on("lobby:snapshot", (players) => {
      for (const player of players) {
        if (player.id !== this.socket?.id) this.upsertRemotePlayer(player);
      }
    });

    this.socket.on("player:joined", (player) => this.upsertRemotePlayer(player));
    this.socket.on("player:moved", (player) => this.upsertRemotePlayer(player));
    this.socket.on("player:left", ({ id }) => this.removeRemotePlayer(id));
  }

  private disconnectLobby() {
    this.socket?.disconnect();
    this.socket = null;
  }

  private emitMoveIfNeeded() {
    if (!this.socket?.connected || !this.localPlayer) return;

    const now = Date.now();
    if (now - this.lastSentAt < SEND_INTERVAL_MS) return;
    this.lastSentAt = now;

    const payload: LobbyMovePayload = {
      x: Math.round(this.localPlayer.x),
      y: Math.round(this.localPlayer.y),
      direction: this.direction,
      moving: this.moving,
    };
    this.socket.emit("player:move", payload);
  }

  private upsertRemotePlayer(player: LobbyPlayer) {
    if (player.id === this.socket?.id) return;

    const existing = this.remotePlayers.get(player.id);
    if (existing) {
      existing.target = player;
      return;
    }

    const sprite = this.physics.add.sprite(player.x, player.y, idleTextureKey(player.direction));
    sprite.setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);
    sprite.setDepth(9);
    sprite.setTint(0xb4fffb);

    const label = this.add
      .text(player.x, player.y - PLAYER_LABEL_OFFSET, player.username, {
        color: "#bae6fd",
        fontFamily: "monospace",
        fontSize: "12px",
        stroke: "#020617",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.remotePlayers.set(player.id, { sprite, label, target: player });
  }

  private removeRemotePlayer(id: string) {
    const remote = this.remotePlayers.get(id);
    if (!remote) return;

    remote.sprite.destroy();
    remote.label.destroy();
    this.remotePlayers.delete(id);
  }

  private updateRemotePlayers(delta: number) {
    const lerp = Math.min(1, delta / 100);

    for (const remote of this.remotePlayers.values()) {
      remote.sprite.x = Phaser.Math.Linear(remote.sprite.x, remote.target.x, lerp);
      remote.sprite.y = Phaser.Math.Linear(remote.sprite.y, remote.target.y, lerp);
      remote.label.setPosition(remote.sprite.x, remote.sprite.y - PLAYER_LABEL_OFFSET);

      if (remote.target.moving) {
        remote.sprite.anims.play(`walk-${remote.target.direction}`, true);
      } else {
        remote.sprite.anims.stop();
        remote.sprite.setTexture(idleTextureKey(remote.target.direction));
      }
    }
  }
}
