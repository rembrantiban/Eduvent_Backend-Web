import express from "express"
import {
    createSection,
    getSections,
    updateSection,
    deleteSection
} from "./section.Controller";

const router = express.Router()

router.post("/create", createSection);
router.get("/getall", getSections);
router.put("/update/:id", updateSection);
router.delete("/delete/:id", deleteSection);
export default router
