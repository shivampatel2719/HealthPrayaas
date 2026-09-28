import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
