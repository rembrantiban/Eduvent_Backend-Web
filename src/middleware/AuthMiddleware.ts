import jwt from "jsonwebtoken";
import { User } from "../modules/User/user.Model";
import { Request, Response, NextFunction } from "express";

export const AuthCookieMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies["user_token"]; // ✅ match cookie name

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret"
    ) as { id: string };

    const user = await User.findById(decoded.id).select("-password");

    if (!user || user.isDeleted) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user as any; // full user object
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
