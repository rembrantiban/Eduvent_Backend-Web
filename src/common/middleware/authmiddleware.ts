import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../../modules/User/user.Model";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    // Reserve 401 for actual token problems; other failures (e.g. a transient
    // DB error) must not masquerade as an expired session.
    if (
      err instanceof jwt.JsonWebTokenError ||
      err instanceof jwt.TokenExpiredError
    ) {
      console.error("Auth error:", err);
      return res.status(401).json({ message: "Invalid token" });
    }

    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Authentication check failed" });
  }
};