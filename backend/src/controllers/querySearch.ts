import type { Request, Response } from "express";

export async function querySearch(req: Request, res: Response){
  if(req.userId){
    const query: string = req.body.query;
    
  } else {
    return res.status(500).json({ err: "Not Implemented" });
  }
}