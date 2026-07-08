import { Router } from "express";
import { authRequired } from "../controller/middleware";
import * as postController from "../controller/post.controller";

const router = Router();

router.get("/", postController.listPosts);
router.post("/", authRequired, postController.createPost);
router.patch("/:id", authRequired, postController.updatePost);
router.delete("/:id", authRequired, postController.deletePost);

export default router;
