import { Schema, model, models, Types } from "mongoose";

export interface WeeklyPlanDoc {
  _id: Types.ObjectId;
  title: string;
  weekStartDate: Date;
  weekEndDate: Date;
  annualGoalId: Types.ObjectId | null;
  weeklyProgress: number;
  userId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyPlanSchema = new Schema<WeeklyPlanDoc>(
  {
    title: { type: String, required: true },
    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },
    annualGoalId: { type: Schema.Types.ObjectId, ref: "AnnualGoal", default: null },
    weeklyProgress: { type: Number, default: 0 },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default models.WeeklyPlan || model<WeeklyPlanDoc>("WeeklyPlan", WeeklyPlanSchema);
