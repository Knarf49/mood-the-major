process.env.RESEND_API_KEY = "re_test_dummy";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.FRONTEND_URL = "http://localhost:5173";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app";
import { User } from "../models/user";
import { hashCode } from "../utils/email";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

function uniqueUser() {
  const id = `${Date.now()}_${Math.random()}`;
  return {
    username: `user_${id}`,
    email: `${id}@test.com`,
    password: "password123",
  };
}

// ---------- POST /signup ----------
describe("POST /signup", () => {
  it("creates a new unverified user and returns 201", async () => {
    const body = uniqueUser();
    const res = await request(app).post("/signup").send(body);

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe(body.username);
    expect(res.body.user).not.toHaveProperty("passwordHash");

    const stored = await User.findOne({ email: body.email });
    expect(stored?.isVerified).toBe(false);
  });

  it("rejects duplicate username/email with 409", async () => {
    const body = uniqueUser();
    await request(app).post("/signup").send(body);

    const res = await request(app).post("/signup").send(body);
    expect(res.status).toBe(409);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const body = { ...uniqueUser(), password: "short" };
    const res = await request(app).post("/signup").send(body);
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email format", async () => {
    const body = { ...uniqueUser(), email: "not-an-email" };
    const res = await request(app).post("/signup").send(body);
    expect(res.status).toBe(400);
  });
});

// ---------- POST /verify-email ----------
describe("POST /verify-email", () => {
  async function signupAndGetCode() {
    const body = uniqueUser();
    await request(app).post("/signup").send(body);
    // simulate "reading the email" by reaching into the DB for the real code
    // (we can't intercept the actual Resend call in tests, so we set our own known code)
    const user = await User.findOne({ email: body.email }).select("+verificationCodeHash");
    const knownCode = "123456";
    user!.verificationCodeHash = hashCode(knownCode);
    await user!.save();
    return { ...body, code: knownCode };
  }

  it("verifies the account with the correct code", async () => {
    const { email, code } = await signupAndGetCode();

    const res = await request(app).post("/verify-email").send({ email, code });
    expect(res.status).toBe(200);

    const user = await User.findOne({ email });
    expect(user?.isVerified).toBe(true);
  });

  it("rejects an incorrect code", async () => {
    const { email } = await signupAndGetCode();

    const res = await request(app).post("/verify-email").send({ email, code: "000000" });
    expect(res.status).toBe(400);
  });

  it("rejects an expired code", async () => {
    const { email, code } = await signupAndGetCode();
    const user = await User.findOne({ email }).select("+verificationExpires");
    user!.verificationExpires = new Date(Date.now() - 1000); // already expired
    await user!.save();

    const res = await request(app).post("/verify-email").send({ email, code });
    expect(res.status).toBe(400);
  });

  it("code is single-use — fails on second attempt with the same code", async () => {
    const { email, code } = await signupAndGetCode();

    await request(app).post("/verify-email").send({ email, code });
    const res = await request(app).post("/verify-email").send({ email, code });

    expect(res.status).toBe(400);
  });
});

// ---------- POST /login ----------
describe("POST /login", () => {
  async function signupAndVerify() {
    const body = uniqueUser();
    await request(app).post("/signup").send(body);
    await User.updateOne({ email: body.email }, { isVerified: true });
    return body;
  }

  it("rejects login for an unverified account with 403", async () => {
    const body = uniqueUser();
    await request(app).post("/signup").send(body);

    const res = await request(app)
      .post("/login")
      .send({ email: body.email, password: body.password });

    expect(res.status).toBe(403);
  });

  it("logs in a verified user and sets a refresh cookie", async () => {
    const body = await signupAndVerify();

    const res = await request(app)
      .post("/login")
      .send({ email: body.email, password: body.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects an incorrect password with a generic error", async () => {
    const body = await signupAndVerify();

    const res = await request(app)
      .post("/login")
      .send({ email: body.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("rejects a non-existent email with the same generic error (no user enumeration)", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "nobody@test.com", password: "whatever123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });
});

// ---------- POST /refresh ----------
describe("POST /refresh", () => {
  async function loginAndGetCookie() {
    const body = uniqueUser();
    await request(app).post("/signup").send(body);
    await User.updateOne({ email: body.email }, { isVerified: true });

    const loginRes = await request(app)
      .post("/login")
      .send({ email: body.email, password: body.password });

    const cookie = loginRes.headers["set-cookie"];
    return { cookie, body };
  }

  it("issues a new access token given a valid refresh cookie", async () => {
    const { cookie } = await loginAndGetCookie();

    const res = await request(app).post("/refresh").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it("rejects when no refresh cookie is present", async () => {
    const res = await request(app).post("/refresh");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid/tampered refresh token", async () => {
    const res = await request(app)
      .post("/refresh")
      .set("Cookie", ["refreshToken=not.a.valid.jwt"]);
    expect(res.status).toBe(401);
  });
});

// ---------- POST /logout ----------
describe("POST /logout", () => {
  it("clears the refresh cookie and returns success message", async () => {
    const res = await request(app).post("/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logout successfully");
    expect(res.headers["set-cookie"]?.[0]).toMatch(/refreshToken=;/);
  });
});

// ---------- POST /forgot-password ----------
describe("POST /forgot-password", () => {
  it("returns 200 even for a non-existent email (no user enumeration)", async () => {
    const res = await request(app)
      .post("/forgot-password")
      .send({ email: "nobody@test.com" });
    expect(res.status).toBe(200);
  });

  it("sets a reset code hash on the user when the email exists", async () => {
    const body = uniqueUser();
    await request(app).post("/signup").send(body);

    const res = await request(app).post("/forgot-password").send({ email: body.email });
    expect(res.status).toBe(200);

    const user = await User.findOne({ email: body.email }).select("+resetPasswordCodeHash");
    expect(user?.resetPasswordCodeHash).toBeDefined();
  });
});

// ---------- POST /reset-password ----------
describe("POST /reset-password", () => {
  async function signupAndSetResetCode() {
    const body = uniqueUser();
    await request(app).post("/signup").send(body);
    const knownCode = "654321";
    const user = await User.findOne({ email: body.email }).select("+resetPasswordCodeHash");
    user!.resetPasswordCodeHash = hashCode(knownCode);
    user!.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user!.save();
    return { ...body, code: knownCode };
  }

  it("resets the password with a valid code", async () => {
    const { email, code } = await signupAndSetResetCode();

    const res = await request(app)
      .post("/reset-password")
      .send({ email, code, newPassword: "newpassword456" });

    expect(res.status).toBe(200);

    // old password should no longer work, new one should
    await User.updateOne({ email }, { isVerified: true });
    const loginOld = await request(app)
      .post("/login")
      .send({ email, password: "password123" });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app)
      .post("/login")
      .send({ email, password: "newpassword456" });
    expect(loginNew.status).toBe(200);
  });

  it("rejects an incorrect code", async () => {
    const { email } = await signupAndSetResetCode();

    const res = await request(app)
      .post("/reset-password")
      .send({ email, code: "111111", newPassword: "newpassword456" });

    expect(res.status).toBe(400);
  });

  it("rejects an expired code", async () => {
    const { email, code } = await signupAndSetResetCode();
    const user = await User.findOne({ email }).select("+resetPasswordExpires");
    user!.resetPasswordExpires = new Date(Date.now() - 1000);
    await user!.save();

    const res = await request(app)
      .post("/reset-password")
      .send({ email, code, newPassword: "newpassword456" });

    expect(res.status).toBe(400);
  });

  it("code is single-use — fails on second attempt", async () => {
    const { email, code } = await signupAndSetResetCode();

    await request(app)
      .post("/reset-password")
      .send({ email, code, newPassword: "newpassword456" });

    const res = await request(app)
      .post("/reset-password")
      .send({ email, code, newPassword: "anotherpassword789" });

    expect(res.status).toBe(400);
  });
});
