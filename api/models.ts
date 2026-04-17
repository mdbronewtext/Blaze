import { getModelsByRole } from "../server/model_roles.js";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userPlan = req.query.plan || "FREE";
  const allowedModels = getModelsByRole(userPlan);
  
  res.status(200).json({ models: allowedModels });
}
