import { Request, Response, NextFunction } from "express";


export const requireCompleteProfile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (
    req.user.role === "student" &&
    (!req.user.yearLevel ||
     !req.user.course ||
     !req.user.section)
  ) {
    return res.status(403).json({
      message: "Please complete your profile first",
    });
  }

  next();
};
