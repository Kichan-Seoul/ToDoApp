import type { Types } from "mongoose";

export function isOwner(doc: { userId: Types.ObjectId | null }, userId: string): boolean {
  return doc.userId != null && doc.userId.toString() === userId;
}
