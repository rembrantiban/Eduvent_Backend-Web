import express, { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../common/middleware/authmiddleware";
import { createLocation, 
        updateLocation, 
        deleteLocation, 
        getLocation
     } from "./location.Controller";

const router = express.Router()

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can manage locations." });
  }
  next();
};


router.post("/createLocation", requireAuth, requireAdmin, createLocation);
router.get("/getLocations", getLocation);
router.put("/updateLocation/:id", requireAuth, requireAdmin, updateLocation);
router.delete("/deleteLocation/:id", requireAuth, requireAdmin, deleteLocation);

export default router;