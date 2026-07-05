import { Error as MongooseError } from "mongoose";
import { Response } from "express";

// ---------- Duplicate key / validation error handling ----------
// MongoDB duplicate key errors don't come through as MongooseError.ValidationError,
// they're raw driver errors with code 11000. Handle both in one place.
export function handleMongoError(err: unknown, res: Response) {
  // Duplicate key (e.g. unique username/email already exists)
  if (typeof err === "object" && err !== null && "code" in err && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern ?? {})[0] ?? "field";
    return res.status(409).json({ error: `${field} already in use` });
  }

  // Mongoose schema validation errors
  if (err instanceof MongooseError.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages });
  }

  // Invalid ObjectId cast (e.g. malformed :id param)
  if (err instanceof MongooseError.CastError) {
    return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` });
  }

  console.error("[mongo] Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error" });
}

// ---------- Pagination ----------
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPagination(query: { page?: string; limit?: string }): PaginationParams {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20", 10) || 20)); // cap at 100
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(total: number, { page, limit }: PaginationParams) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
  };
}

// ---------- Escape user input before using in a $regex query ----------
// Prevents ReDoS and unintended regex behavior from raw user search input (e.g. Discovery page search)
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
