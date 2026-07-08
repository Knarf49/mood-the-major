import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "../app/components/AuthProvider";
import { useAuth } from "../utils/authStore";

beforeEach(() => {
  useAuth.setState({ user: null, accessToken: null, isLoading: true });
  vi.restoreAllMocks();
});

describe("AuthProvider", () => {
  it("shows a loading state before the /refresh call resolves", () => {
    // fetch that never resolves during this test — keeps isLoading true
    global.fetch = vi.fn(
      () => new Promise(() => {}),
    ) as unknown as typeof fetch;

    render(
      <AuthProvider>
        <div>App content</div>
      </AuthProvider>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("App content")).not.toBeInTheDocument();
  });

  it("calls /refresh with credentials: include on mount", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: "1", username: "frank", role: "user" },
        accessToken: "new-access-token",
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AuthProvider>
        <div>App content</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/refresh"),
        expect.objectContaining({ method: "POST", credentials: "include" }),
      );
    });
  });

  it("stores the user and token in Zustand when /refresh succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: "1", username: "frank", role: "user" },
        accessToken: "new-access-token",
      }),
    }) as unknown as typeof fetch;

    render(
      <AuthProvider>
        <div>App content</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(useAuth.getState().user).toEqual({
        id: "1",
        username: "frank",
        role: "user",
      });
    });
    expect(useAuth.getState().accessToken).toBe("new-access-token");
    expect(useAuth.getState().isLoading).toBe(false);
  });

  it("renders children once loading finishes and session is restored", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: "1", username: "frank", role: "user" },
        accessToken: "new-access-token",
      }),
    }) as unknown as typeof fetch;

    render(
      <AuthProvider>
        <div>App content</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("App content")).toBeInTheDocument();
    });
  });

  it("clears auth state when /refresh returns not-ok (no valid session)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No refresh token" }),
    }) as unknown as typeof fetch;

    render(
      <AuthProvider>
        <div>App content</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(useAuth.getState().isLoading).toBe(false);
    });
    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().accessToken).toBeNull();
    // children still render even when logged out — routing/guards handle that separately
    expect(screen.getByText("App content")).toBeInTheDocument();
  });

  it("clears auth state when the fetch itself throws (network error)", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    render(
      <AuthProvider>
        <div>App content</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(useAuth.getState().isLoading).toBe(false);
    });
    expect(useAuth.getState().user).toBeNull();
  });
});
