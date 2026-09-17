import { Request, Response } from "express";
import { Section } from "./section.Model";

/* CREATE SECTION */
export const createSection = async (
  req: Request,
  res: Response
) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Section name is required",
      });
    }

    const existingSection = await Section.findOne({
      name,
    });

    if (existingSection) {
      return res.status(409).json({
        message: "Section already exists",
      });
    }

    const section = await Section.create({ name });

    return res.status(201).json({
      message: "Section created successfully",
      section,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* GET ALL SECTIONS */
export const getSections = async (
  _req: Request,
  res: Response
) => {
  try {
    const sections = await Section.find().sort({
      createdAt: -1,
    });

    return res.json(sections);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* UPDATE SECTION */
export const updateSection = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const existingSection = await Section.findOne({
      name,
      _id: { $ne: id },
    });

    if (existingSection) {
      return res.status(409).json({
        message: "Section name already exists",
      });
    }

    const section = await Section.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!section) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    return res.json({
      message: "Section updated successfully",
      section,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* DELETE SECTION */
export const deleteSection = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const section = await Section.findByIdAndDelete(id);

    if (!section) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    return res.json({
      message: "Section deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};
