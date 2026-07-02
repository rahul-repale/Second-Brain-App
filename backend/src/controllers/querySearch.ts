import type { Request, Response } from "express";

export async function querySerach(req: Request, res: Response){
  if(req.userId){
    const query: string = req.body.query;
    
  } else {
    return res.status(500).json({ err: "Session Timeout, Login again" });
  }
}