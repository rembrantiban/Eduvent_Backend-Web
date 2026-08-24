import { Request, Response } from "express";
import { Location } from "./location.Model";

export const createLocation = async (req: Request, res: Response) => {
  try {
    const { venue, location, latitude, longitude } = req.body;

    if (!venue || !location || latitude === undefined ||  longitude === undefined ) {
      return res.status(400).json({
        success: false,
        message: "Venue, location, latitude and longitude are required",
      });
    }

    const newLocation = await Location.create({
      venue,
      location,
      latitude,
      longitude,
    });

    return res.status(201).json({
      success: true,
      data: newLocation,
    });

  } catch (error: any) {

    console.error("Create location error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A location with this venue and location already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create location",
    });
  }
};


export const updateLocation = async (req: Request, res: Response) => {

  const { id } = req.params;
  const { venue, location, latitude, longitude } = req.body;

  try {

    if (!venue || !location || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Venue, location, latitude and longitude are required"
      });
    }

    const updatedLocation = await Location.findByIdAndUpdate(
      id,
      { venue, location, latitude, longitude },
      { new: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({
        success: false,
        message: "Location not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedLocation
    });

  } catch (err) {

    console.error("Update location error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update location"
    });
  }
};

export const deleteLocation = async (req: Request, res: Response) => {

  const { id } = req.params;

  try {

    const deletedLocation = await Location.findByIdAndDelete(id);

    if (!deletedLocation) {
      return res.status(404).json({
        success: false,
        message: "Location not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Location deleted successfully"
    });

  } catch (err) {

    console.error("Delete location error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to delete location"
    });
  }
};


export const getLocation = async (req: Request, res: Response) => {

  try {

    const locations = await Location.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: locations
    });

  } catch (err) {

    console.error("Get locations error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to get locations"
    });
  }
};