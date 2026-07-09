import { createLobbyStore } from "../utils/lobby";

describe("createLobbyStore", () => {
  it("tracks joined players, movement, and disconnects by socket id", () => {
    const lobby = createLobbyStore();

    const player = lobby.join("socket-1", {
      id: "user-1",
      username: "frank",
      role: "user",
    });

    expect(player).toMatchObject({
      id: "socket-1",
      userId: "user-1",
      username: "frank",
      x: 512,
      y: 512,
      direction: "down",
      moving: false,
    });
    expect(lobby.snapshot()).toHaveLength(1);

    const moved = lobby.move("socket-1", {
      x: 640,
      y: 704,
      direction: "right",
      moving: true,
    });

    expect(moved).toMatchObject({
      id: "socket-1",
      x: 640,
      y: 704,
      direction: "right",
      moving: true,
    });
    expect(lobby.leave("socket-1")?.id).toBe("socket-1");
    expect(lobby.snapshot()).toEqual([]);
  });
});
