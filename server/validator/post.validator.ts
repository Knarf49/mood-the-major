import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().min(1).max(1000),
  major: z.string().min(1).max(100),
  moodType: z.enum(["happy", "sad", "neutral", "anxious", "excited"]),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  major: z.string().min(1).max(100).optional(),
  moodType: z.enum(["happy", "sad", "neutral", "anxious", "excited"]).optional(),
});
