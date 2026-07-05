import { Schema, model, Document, Types } from "mongoose";

export type MoodType = "happy" | "sad" | "neutral" | "anxious" | "excited";

export interface IPost extends Document {
  id: string;
  content: string;
  major: string;
  moodType: MoodType;
  ownerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    major: { type: String, required: true, trim: true },
    moodType: {
      type: String,
      enum: ["happy", "sad", "neutral", "anxious", "excited"],
      required: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true } // adds createdAt + updatedAt
);

// supports Discovery page filtering by major/moodType
postSchema.index({ major: 1, moodType: 1 });
// supports full-text search on content
postSchema.index({ content: "text" });

export const Post = model<IPost>("Post", postSchema);
