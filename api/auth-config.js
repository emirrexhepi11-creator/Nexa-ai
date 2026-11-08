export default function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  const url=process.env.SUPABASE_URL;
  const publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!url||!publishableKey)return res.status(503).json({error:"Supabase config is missing"});
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({url,publishableKey});
}
