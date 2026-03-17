 // this for mobile AuthCookie middleware

import jwt from "jsonwebtoken";
import { User } from "../modules/User/user.Model";
import { Request, Response, NextFunction } from "express";

export const MobileAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    const authHeader = req.headers.authorization;

    console.log("AUTH HEADER:", authHeader);

    if (!authHeader) {
      return res.status(401).json({ message: "Unauthorized: No header" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: Token missing" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret"
    ) as { id: string };

    console.log("DECODED TOKEN:", decoded);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user as any;

    next();

  } catch (error) {
    console.error("JWT ERROR:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default MobileAuth