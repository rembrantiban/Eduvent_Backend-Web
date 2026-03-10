import express from "express"
import {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
} from "./department.controller";

const router = express.Router()

router.post("/createDepartment", createDepartment);
router.get("/getDepartments", getDepartments);
router.put("/updateDepartment/:id", updateDepartment);
router.delete("/deleteDepartment/:id", deleteDepartment);

export default router