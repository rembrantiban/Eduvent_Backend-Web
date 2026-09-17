import express from "express"
import {
    createYearLevel,
    getYearLevels,
    updateYearLevel,
    deleteYearLevel
} from "./yearLevel.Controller";

const router = express.Router()

router.post("/create", createYearLevel);
router.get("/getall", getYearLevels);
router.put("/update/:id", updateYearLevel);
router.delete("/delete/:id", deleteYearLevel);
export default router
