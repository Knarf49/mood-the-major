import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginAction } from "../app/components/LoginForm";
import { useAuth } from "../utils/authStore";

beforeEach(() => {
  useAuth.setState({ user: null, accessToken: null, isLoading: true });
  vi.restoreAllMocks();
});

describe("loginAction", () => {
  it("stores user and access token when login succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: "1", username: "frank", role: "user" },
        accessToken: "access-token",
      }),
    }) as unknown as typeof fetch;

    const formData = new FormData();
    formData.set("email", "frank@example.com");
    formData.set("password", "password123");

    const result = await loginAction(
      { error: null, success: null, email: null },
      formData,
    );

    expect(result).toEqual({
      error: null,
      success: "Logged in successfully",
      email: null,
    });
    expect(useAuth.getState().user).toEqual({
      id: "1",
      username: "frank",
      role: "user",
    });
    expect(useAuth.getState().accessToken).toBe("access-token");
    expect(useAuth.getState().isLoading).toBe(false);
  });
});
