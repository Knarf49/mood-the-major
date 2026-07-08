import { z } from "zod";

export const userDTOSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(["user", "admin"]),
});

export type UserDTO = z.infer<typeof userDTOSchema>;

// ---------- Post DTO ----------
export const postDTOSchema = z.object({
  id: z.string(),
  content: z.string(),
  major: z.string(),
  moodType: z.enum(["happy", "sad", "neutral", "anxious", "excited"]),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PostDTO = z.infer<typeof postDTOSchema>;

export const createPostSchema = z.object({
  content: z.string().min(1).max(1000),
  major: z.string().min(1).max(100),
  moodType: z.enum(["happy", "sad", "neutral", "anxious", "excited"]),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = createPostSchema.partial();

export type UpdatePostInput = z.infer<typeof updatePostSchema>;
