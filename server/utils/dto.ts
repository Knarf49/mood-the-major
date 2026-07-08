import { IUser } from "../models/user";
import { IPost } from "../models/post";
import {
  userDTOSchema,
  postDTOSchema,
  type UserDTO,
  type PostDTO,
} from "../../shared/schemas.js";

// ---------- User ----------
// schema.parse() both builds AND validates the DTO in one step —
// if a field is ever wrong/missing, this throws immediately instead of
// silently shipping a malformed response to the client
export function UserDTO(user: IUser): UserDTO {
  return userDTOSchema.parse({
    id: user.id,
    username: user.username,
    role: user.role,
  });
}

// ---------- Post ----------
export function PostDTO(post: IPost): PostDTO {
  return postDTOSchema.parse({
    id: post.id,
    content: post.content,
    major: post.major,
    moodType: post.moodType,
    ownerId: post.ownerId.toString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
}

export function PostDTOList(posts: IPost[]): PostDTO[] {
  return posts.map(PostDTO);
}
