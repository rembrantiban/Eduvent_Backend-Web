import express from "express"
import {
    createCourse,
    getCourses,
    updateCourse,
    deleteCourse
} from "./department.controller";

const router = express.Router()

router.post("/create", createCourse);
router.get("/getall", getCourses);
router.put("/update/:id", updateCourse);
router.delete("/delete/:id", deleteCourse);
export default router