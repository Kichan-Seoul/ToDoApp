import { Schema, model, models, Types } from "mongoose";

export interface AnnualGoalDoc {
  _id: Types.ObjectId;
  title: string;
  targetYear: number;
  annualProgress: number;
  userId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AnnualGoalSchema = new Schema<AnnualGoalDoc>(
  {
    title: { type: String, required: true },
    targetYear: { type: Number, required: true },
    annualProgress: { type: Number, default: 0 },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default models.AnnualGoal || model<AnnualGoalDoc>("AnnualGoal", AnnualGoalSchema);
