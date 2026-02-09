import express from "express";
import { createLocation, 
        updateLocation, 
        deleteLocation, 
        getLocation
     } from "./location.Controller";

const router = express.Router()


router.post("/createLocation", createLocation);
router.get("/getLocations", getLocation);
router.put("/updateLocation/:id", updateLocation);
router.delete("/deleteLocation/:id", deleteLocation);

export default router;