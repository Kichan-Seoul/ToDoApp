import { Schema, model, models, Types } from "mongoose";

export type TaskStatus = "todo" | "doing" | "done";

export interface TaskDoc {
  _id: Types.ObjectId;
  title: string;
  date: Date;
  status: TaskStatus;
  order: number;
  weeklyPlanId: Types.ObjectId | null;
  userId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<TaskDoc>(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["todo", "doing", "done"], default: "todo" },
    order: { type: Number, default: 0 },
    weeklyPlanId: { type: Schema.Types.ObjectId, ref: "WeeklyPlan", default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default models.Task || model<TaskDoc>("Task", TaskSchema);
