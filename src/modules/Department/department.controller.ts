import { Request, Response } from "express";
import { Department } from "./department.Model";

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code || !description) {
      return res.status(400).json({
        message: "Department name, code, and description are required",
      });
    }

    const existingDepartment = await Department.findOne({
      $or: [{ name }, { code }],
    });

    if (existingDepartment) {
      return res.status(409).json({
        message: "Department already exists",
      });
    }

    const department = await Department.create({
      name,
      code,
      description
    });

    return res.status(201).json({
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* GET ALL DEPARTMENTS */
export const getDepartments = async (_req: Request, res: Response) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });

    return res.json(departments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* UPDATE DEPARTMENT */
export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;

    const department = await Department.findByIdAndUpdate(
      id,
      { name, code, description },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    return res.json({
      message: "Department updated",
      department,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* DELETE DEPARTMENT */
export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    return res.json({
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};