import { Router } from "express";
import { authMiddleware } from "../controller/middleware";
import * as postController from "../controller/post.controller";

const router = Router();

router.get("/", postController.listPosts);
router.post("/", authMiddleware, postController.createPost);
router.patch("/:id", authMiddleware, postController.updatePost);
router.delete("/:id", authMiddleware, postController.deletePost);

export default router;
