import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../../modules/User/user.Model";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 🔥 HEADER ONLY
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret"
    ) as { id: string };

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      ...user.toObject(),
      _id: user._id.toString(),
    } as unknown as IUser & { _id: string };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};