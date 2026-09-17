import { Schema, model, models, Types } from "mongoose";

export interface UserDoc {
  _id: Types.ObjectId;
  githubId: string;
  username: string;
  avatarUrl: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    githubId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default models.User || model<UserDoc>("User", UserSchema);
