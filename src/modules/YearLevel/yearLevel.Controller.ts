import { Request, Response } from "express";
import { YearLevel } from "./yearLevel.Model";

/* CREATE YEAR LEVEL */
export const createYearLevel = async (
  req: Request,
  res: Response
) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Year level name is required",
      });
    }

    const existingYearLevel = await YearLevel.findOne({
      name,
    });

    if (existingYearLevel) {
      return res.status(409).json({
        message: "Year level already exists",
      });
    }

    const yearLevel = await YearLevel.create({ name });

    return res.status(201).json({
      message: "Year level created successfully",
      yearLevel,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* GET ALL YEAR LEVELS */
export const getYearLevels = async (
  _req: Request,
  res: Response
) => {
  try {
    const yearLevels = await YearLevel.find().sort({
      createdAt: -1,
    });

    return res.json(yearLevels);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* UPDATE YEAR LEVEL */
export const updateYearLevel = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const existingYearLevel = await YearLevel.findOne({
      name,
      _id: { $ne: id },
    });

    if (existingYearLevel) {
      return res.status(409).json({
        message: "Year level name already exists",
      });
    }

    const yearLevel = await YearLevel.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!yearLevel) {
      return res.status(404).json({
        message: "Year level not found",
      });
    }

    return res.json({
      message: "Year level updated successfully",
      yearLevel,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* DELETE YEAR LEVEL */
export const deleteYearLevel = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const yearLevel = await YearLevel.findByIdAndDelete(id);

    if (!yearLevel) {
      return res.status(404).json({
        message: "Year level not found",
      });
    }

    return res.json({
      message: "Year level deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};
