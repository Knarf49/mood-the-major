import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "../app/routes/home";
import { useAuth } from "../utils/authStore";

beforeEach(() => {
  useAuth.setState({ user: null, accessToken: null, isLoading: false });
});

describe("Home", () => {
  it("asks logged-out users to log in before entering the lobby", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.getByText("Log in to enter the lobby")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
