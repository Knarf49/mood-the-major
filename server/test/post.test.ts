import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcrypt";
import app from "../src/app";
import { User } from "../models/user";
import { Post } from "../models/post";
import { signAccessToken } from "../utils/jwt";

let mongoServer: MongoMemoryServer;

// ---------- Test setup: spin up an in-memory MongoDB, no real DB needed ----------
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // reset collections between tests so they don't leak state into each other
  await User.deleteMany({});
  await Post.deleteMany({});
});

// ---------- Helpers ----------
async function createUser(overrides: Partial<{ role: "user" | "admin" }> = {}) {
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await User.create({
    username: `user_${Date.now()}_${Math.random()}`,
    email: `${Date.now()}_${Math.random()}@test.com`,
    passwordHash,
    role: overrides.role ?? "user",
    isVerified: true,
  });
  const token = signAccessToken({ id: user.id, username: user.username, role: user.role });
  return { user, token };
}

async function createPost(ownerId: string, overrides: Partial<{ content: string }> = {}) {
  return Post.create({
    content: overrides.content ?? "Feeling okay about finals",
    major: "Software Engineering",
    moodType: "neutral",
    ownerId,
  });
}

// ---------- GET /posts ----------
describe("GET /posts", () => {
  it("returns an empty list when no posts exist", async () => {
    const res = await request(app).get("/posts");
    expect(res.status).toBe(200);
    expect(res.body.posts).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it("returns posts with pagination metadata", async () => {
    const { user } = await createUser();
    await createPost(user.id);
    await createPost(user.id);

    const res = await request(app).get("/posts?page=1&limit=1");
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ total: 2, page: 1, limit: 1, totalPages: 2 });
  });

  it("filters by major and moodType", async () => {
    const { user } = await createUser();
    await Post.create({ content: "a", major: "CS", moodType: "happy", ownerId: user.id });
    await Post.create({ content: "b", major: "SE", moodType: "sad", ownerId: user.id });

    const res = await request(app).get("/posts?major=CS");
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts[0].major).toBe("CS");
  });

  it("does not leak internal fields like ownerId as an ObjectId type", async () => {
    const { user } = await createUser();
    await createPost(user.id);

    const res = await request(app).get("/posts");
    expect(typeof res.body.posts[0].ownerId).toBe("string");
    expect(res.body.posts[0]).not.toHaveProperty("__v");
  });
});

// ---------- POST /posts ----------
describe("POST /posts", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/posts")
      .send({ content: "hi", major: "CS", moodType: "happy" });
    expect(res.status).toBe(401);
  });

  it("creates a post for the authenticated user", async () => {
    const { user, token } = await createUser();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Excited for the hackathon", major: "SE", moodType: "excited" });

    expect(res.status).toBe(201);
    expect(res.body.post.content).toBe("Excited for the hackathon");
    expect(res.body.post.ownerId).toBe(user.id);
  });

  it("ignores a client-supplied ownerId and uses the token's user instead", async () => {
    const { user, token } = await createUser();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        content: "trying to spoof owner",
        major: "SE",
        moodType: "happy",
        ownerId: "000000000000000000000000", // should be ignored — not in createPostSchema
      });

    expect(res.status).toBe(201);
    expect(res.body.post.ownerId).toBe(user.id); // not the spoofed id
  });

  it("rejects invalid moodType", async () => {
    const { token } = await createUser();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "hi", major: "CS", moodType: "furious" });

    expect(res.status).toBe(400);
  });

  it("rejects empty content", async () => {
    const { token } = await createUser();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "", major: "CS", moodType: "happy" });

    expect(res.status).toBe(400);
  });
});

// ---------- PATCH /posts/:id ----------
describe("PATCH /posts/:id", () => {
  it("rejects unauthenticated requests", async () => {
    const { user } = await createUser();
    const post = await createPost(user.id);

    const res = await request(app).patch(`/posts/${post.id}`).send({ content: "edited" });
    expect(res.status).toBe(401);
  });

  it("allows the owner to update their own post", async () => {
    const { user, token } = await createUser();
    const post = await createPost(user.id);

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "updated content" });

    expect(res.status).toBe(200);
    expect(res.body.post.content).toBe("updated content");
  });

  it("blocks a different user from editing someone else's post", async () => {
    const { user: owner } = await createUser();
    const { token: otherToken } = await createUser();
    const post = await createPost(owner.id);

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ content: "hijacked" });

    expect(res.status).toBe(403);
  });

  it("allows an admin to edit someone else's post", async () => {
    const { user: owner } = await createUser();
    const { token: adminToken } = await createUser({ role: "admin" });
    const post = await createPost(owner.id);

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "moderated by admin" });

    expect(res.status).toBe(200);
    expect(res.body.post.content).toBe("moderated by admin");
  });

  it("returns 404 for a non-existent post id", async () => {
    const { token } = await createUser();
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/posts/${fakeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "edited" });

    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed post id", async () => {
    const { token } = await createUser();

    const res = await request(app)
      .patch(`/posts/not-a-valid-objectid`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "edited" });

    expect(res.status).toBe(400);
  });
});

// ---------- DELETE /posts/:id ----------
describe("DELETE /posts/:id", () => {
  it("rejects unauthenticated requests", async () => {
    const { user } = await createUser();
    const post = await createPost(user.id);

    const res = await request(app).delete(`/posts/${post.id}`);
    expect(res.status).toBe(401);
  });

  it("allows the owner to delete their own post", async () => {
    const { user, token } = await createUser();
    const post = await createPost(user.id);

    const res = await request(app)
      .delete(`/posts/${post.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(await Post.findById(post.id)).toBeNull();
  });

  it("blocks a different user from deleting someone else's post", async () => {
    const { user: owner } = await createUser();
    const { token: otherToken } = await createUser();
    const post = await createPost(owner.id);

    const res = await request(app)
      .delete(`/posts/${post.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(await Post.findById(post.id)).not.toBeNull(); // still exists
  });

  it("allows an admin to delete someone else's post", async () => {
    const { user: owner } = await createUser();
    const { token: adminToken } = await createUser({ role: "admin" });
    const post = await createPost(owner.id);

    const res = await request(app)
      .delete(`/posts/${post.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
    expect(await Post.findById(post.id)).toBeNull();
  });

  it("returns 404 for a non-existent post id", async () => {
    const { token } = await createUser();
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/posts/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
