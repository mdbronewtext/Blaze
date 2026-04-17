export default function handler(req: any, res: any) {
  res.json({ status: "ok", environment: process.env.VERCEL ? "vercel" : "local" });
}
