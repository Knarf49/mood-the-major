import { z } from "zod";
import { Request, Response } from "express";
import { Post } from "../models/post";
import { PostDTO, PostDTOList } from "../utils/dto";
import {
  getPagination,
  buildPaginationMeta,
  handleMongoError,
} from "../utils/mongoose";
import {
  createPostSchema,
  updatePostSchema,
} from "../validator/post.validator";

export async function listPosts(req: Request, res: Response) {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const filter: Record<string, unknown> = {};
    if (req.query.major) filter.major = req.query.major;
    if (req.query.moodType) filter.moodType = req.query.moodType;

    const [posts, total] = await Promise.all([
      Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Post.countDocuments(filter),
    ]);

    return res.json({
      posts: PostDTOList(posts),
      meta: buildPaginationMeta(total, { page, limit, skip }),
    });
  } catch (err) {
    return handleMongoError(err, res);
  }
}

export async function createPost(req: Request, res: Response) {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.flattenError(parsed.error) });
  }

  // ownerId comes from the verified JWT (req.user), never from the client body —
  // otherwise anyone could create a post claiming to be someone else
  const ownerId = req.user!.id;

  try {
    const post = await Post.create({ ...parsed.data, ownerId });
    return res.status(201).json({ post: PostDTO(post) });
  } catch (err) {
    return handleMongoError(err, res);
  }
}

export async function updatePost(req: Request, res: Response) {
  const parsed = updatePostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.flattenError(parsed.error) });
  }

  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const isOwner = post.ownerId.toString() === req.user!.id;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ error: "You do not have permission to edit this post" });
    }

    Object.assign(post, parsed.data);
    await post.save();

    return res.json({ post: PostDTO(post) });
  } catch (err) {
    return handleMongoError(err, res);
  }
}

export async function deletePost(req: Request, res: Response) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const isOwner = post.ownerId.toString() === req.user!.id;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner || !isAdmin) {
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this post" });
    }

    await post.deleteOne();

    return res.status(204).send();
  } catch (err) {
    return handleMongoError(err, res);
  }
}
