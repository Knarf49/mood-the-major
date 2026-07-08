import { describe, it, expect, beforeEach } from "vitest";
import { useAuth } from "../utils/authStore";

// Zustand stores persist between tests since they're module-level singletons —
// reset to the known initial shape before each test so tests don't leak state.
beforeEach(() => {
  useAuth.setState({ user: null, accessToken: null, isLoading: true });
});

describe("useAuth", () => {
  it("starts with no user, no token, and isLoading true", () => {
    const state = useAuth.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isLoading).toBe(true);
  });

  it("setAuth stores the user and token, and clears isLoading", () => {
    const user = { id: "1", username: "frank", role: "user" as const };

    useAuth.getState().setAuth(user, "fake-access-token");

    const state = useAuth.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe("fake-access-token");
    expect(state.isLoading).toBe(false);
  });

  it("clearAuth resets user and token to null and clears isLoading", () => {
    const user = { id: "1", username: "frank", role: "user" as const };
    useAuth.getState().setAuth(user, "fake-access-token");

    useAuth.getState().clearAuth();

    const state = useAuth.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("setLoading toggles isLoading independently of user/token", () => {
    useAuth.getState().setLoading(false);
    expect(useAuth.getState().isLoading).toBe(false);

    useAuth.getState().setLoading(true);
    expect(useAuth.getState().isLoading).toBe(true);
    // user/token should be untouched by setLoading alone
    expect(useAuth.getState().user).toBeNull();
  });

  it("setAuth overwrites a previous user (e.g. switching accounts)", () => {
    const userA = { id: "1", username: "alice", role: "user" as const };
    const userB = { id: "2", username: "bob", role: "admin" as const };

    useAuth.getState().setAuth(userA, "token-a");
    useAuth.getState().setAuth(userB, "token-b");

    const state = useAuth.getState();
    expect(state.user).toEqual(userB);
    expect(state.accessToken).toBe("token-b");
  });
});
