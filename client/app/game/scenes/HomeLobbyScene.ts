import Phaser from "phaser";
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
const PLAYER_SPEED = 180;
const SEND_INTERVAL_MS = 80;
const DIRECTIONS: LobbyDirection[] = ["down", "left", "right", "up"];

const DIRECTION_ROWS: Record<LobbyDirection, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

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
    this.load.spritesheet("player", "/assets/game/player_32.png", {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
  }

  create() {
    this.ensurePlayerTexture();
    this.createAnimations();
    this.drawWorld();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.localPlayer = this.physics.add.sprite(512, 512, "player", 0);
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
    const graphics = this.add.graphics();

    for (let y = 0; y < WORLD_HEIGHT; y += TILE_SIZE) {
      for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
        const road = Math.abs(x - WORLD_WIDTH / 2) < 96 || Math.abs(y - WORLD_HEIGHT / 2) < 96;
        const plaza = Math.abs(x - WORLD_WIDTH / 2) < 192 && Math.abs(y - WORLD_HEIGHT / 2) < 192;
        const color = plaza ? 0x475569 : road ? 0x334155 : (x + y) / TILE_SIZE % 2 === 0 ? 0x14532d : 0x166534;
        graphics.fillStyle(color, 1);
        graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }

    graphics.lineStyle(1, 0x0f172a, 0.35);
    for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
      graphics.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
      graphics.lineBetween(0, y, WORLD_WIDTH, y);
    }

    graphics.setDepth(0);
  }

  private ensurePlayerTexture() {
    if (this.textures.exists("player")) return;

    const texture = this.textures.createCanvas("player", TILE_SIZE * 4, TILE_SIZE * 4);
    if (!texture) {
      throw new Error("Could not create fallback player texture");
    }

    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, TILE_SIZE * 4, TILE_SIZE * 4);

    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        const x = column * TILE_SIZE;
        const y = row * TILE_SIZE;
        context.fillStyle = column === 0 ? "#22d3ee" : "#67e8f9";
        context.fillRect(x + 10, y + 8, 12, 18);
        context.fillStyle = "#0f172a";
        context.fillRect(x + 12, y + 11, 3, 3);
        context.fillRect(x + 17, y + 11, 3, 3);
        context.fillStyle = "#f8fafc";
        context.fillRect(x + 13, y + 26, 3, 4);
        context.fillRect(x + 16, y + 26, 3, 4);
      }
    }

    texture.refresh();
  }

  private createAnimations() {
    for (const direction of DIRECTIONS) {
      const row = DIRECTION_ROWS[direction];
      const key = `walk-${direction}`;
      if (this.anims.exists(key)) continue;

      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("player", {
          start: row * 4 + 1,
          end: row * 4 + 3,
        }),
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
      this.localPlayer.setFrame(DIRECTION_ROWS[this.direction] * 4);
    }
  }

  private updateLocalLabel() {
    if (!this.localPlayer || !this.localLabel) return;
    this.localLabel.setPosition(this.localPlayer.x, this.localPlayer.y - 32);
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

    const sprite = this.physics.add.sprite(player.x, player.y, "player", DIRECTION_ROWS[player.direction] * 4);
    sprite.setDepth(9);
    sprite.setTint(0xb4fffb);

    const label = this.add
      .text(player.x, player.y - 32, player.username, {
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
      remote.label.setPosition(remote.sprite.x, remote.sprite.y - 32);

      if (remote.target.moving) {
        remote.sprite.anims.play(`walk-${remote.target.direction}`, true);
      } else {
        remote.sprite.anims.stop();
        remote.sprite.setFrame(DIRECTION_ROWS[remote.target.direction] * 4);
      }
    }
  }
}
