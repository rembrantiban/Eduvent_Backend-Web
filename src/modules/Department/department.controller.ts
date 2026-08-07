import { Request, Response } from "express";
import { Course } from "./department.Model";

/* CREATE COURSE */
export const createCourse = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, description, majors } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        message: "Course name and description are required",
      });
    }

    const existingCourse = await Course.findOne({
      name,
    });

    if (existingCourse) {
      return res.status(409).json({
        message: "Course already exists",
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

      const existingMajor = await Course.findOne({
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

    const course = await Course.create({
      name,
      description,
      majors: majors || [],
    });

    return res.status(201).json({
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* GET ALL COURSES */
export const getCourses = async (
  _req: Request,
  res: Response
) => {
  try {
    const courses = await Course.find().sort({
      createdAt: -1,
    });

    return res.json(courses);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* UPDATE COURSE */
export const updateCourse = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const {
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

    const existingCourse = await Course.findOne({
      name,
      _id: { $ne: id },
    });

    if (existingCourse) {
      return res.status(409).json({
        message: "Course name already exists",
      });
    }

    const course = await Course.findByIdAndUpdate(
      id,
      {
        name,
        description,
        majors,
      },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    return res.json({
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* DELETE COURSE */
export const deleteCourse = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndDelete(
      id
    );

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    return res.json({
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};