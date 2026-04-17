import type { Request, Response } from "express";
import { getModelsByRole } from "./model_roles.js";

export async function handleGetModels(req: Request, res: Response) {
  const userPlan = req.query.plan as string | undefined || req.body.userPlan || "FREE";
  
  const allowedModels = getModelsByRole(userPlan);
  
  res.json({ models: allowedModels });
}
