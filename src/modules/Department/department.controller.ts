import { Request, Response } from "express";
import { Department } from "./department.Model";

/* CREATE DEPARTMENT */
export const createDepartment = async (
  req: Request,
  res: Response
) => {
  try {
    const { code, name, description, majors } = req.body;

    if (!code || !name || !description) {
      return res.status(400).json({
        message: "Code, name, and description are required",
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

    if (majors && majors.length > 0) {
      const majorNames = majors.map((m: any) =>
        m.name.trim().toLowerCase()
      );

      const duplicateMajors = majorNames.filter(
        (item: string, index: number) =>
          majorNames.indexOf(item) !== index
      );

      if (duplicateMajors.length > 0) {
        return res.status(400).json({
          message: "Duplicate majors are not allowed",
        });
      }

      const existingMajor = await Department.findOne({
        "majors.name": {
          $in: majors.map((m: any) => m.name),
        },
      });

      if (existingMajor) {
        return res.status(409).json({
          message: "One or more majors already exist",
        });
      }
    }

    const department = await Department.create({
      code,
      name,
      description,
      majors: majors || [],
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

export const getDepartments = async (
  _req: Request,
  res: Response
) => {
  try {
    const departments = await Department.find().sort({
      createdAt: -1,
    });

    return res.json(departments);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const updateDepartment = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const {
      code,
      name,
      description,
      majors,
    } = req.body;

    if (majors && majors.length > 0) {
      const majorNames = majors.map((m: any) =>
        m.name.trim().toLowerCase()
      );

      const duplicateMajors = majorNames.filter(
        (item: string, index: number) =>
          majorNames.indexOf(item) !== index
      );

      if (duplicateMajors.length > 0) {
        return res.status(400).json({
          message: "Duplicate majors are not allowed",
        });
      }
    }

    const department = await Department.findByIdAndUpdate(
      id,
      {
        code,
        name,
        description,
        majors,
      },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    return res.json({
      message: "Department updated successfully",
      department,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const deleteDepartment = async (
  req: Request,
  res: Response
) => {
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