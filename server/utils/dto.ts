import { IUser } from "../models/user";
import { IPost } from "../models/post";

// ---------- User ----------
export interface UserDTO {
  id: string;
  username: string;
  role: "user" | "admin";
}

export function toUserDTO(user: IUser): UserDTO {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

// ---------- Post ----------
export interface PostDTO {
  id: string;
  content: string;
  major: string;
  moodType: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toPostDTO(post: IPost): PostDTO {
  return {
    id: post.id,
    content: post.content,
    major: post.major,
    moodType: post.moodType,
    ownerId: post.ownerId.toString(),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export function toPostDTOList(posts: IPost[]): PostDTO[] {
  return posts.map(toPostDTO);
}
