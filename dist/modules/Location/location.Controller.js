"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocation = exports.deleteLocation = exports.updateLocation = exports.createLocation = void 0;
const location_Model_1 = require("./location.Model");
const createLocation = async (req, res) => {
    try {
        const { venue, location, latitude, longitude } = req.body;
        if (!venue || !location || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: "Venue, location, latitude and longitude are required",
            });
        }
        const newLocation = await location_Model_1.Location.create({
            venue,
            location,
            latitude,
            longitude,
        });
        return res.status(201).json({
            success: true,
            data: newLocation,
        });
    }
    catch (error) {
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
exports.createLocation = createLocation;
const updateLocation = async (req, res) => {
    const { id } = req.params;
    const { venue, location, latitude, longitude } = req.body;
    try {
        if (!venue || !location || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: "Venue, location, latitude and longitude are required"
            });
        }
        const updatedLocation = await location_Model_1.Location.findByIdAndUpdate(id, { venue, location, latitude, longitude }, { new: true });
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
    }
    catch (err) {
        console.error("Update location error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update location"
        });
    }
};
exports.updateLocation = updateLocation;
const deleteLocation = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedLocation = await location_Model_1.Location.findByIdAndDelete(id);
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
    }
    catch (err) {
        console.error("Delete location error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete location"
        });
    }
};
exports.deleteLocation = deleteLocation;
const getLocation = async (req, res) => {
    try {
        const locations = await location_Model_1.Location.find()
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: locations
        });
    }
    catch (err) {
        console.error("Get locations error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to get locations"
        });
    }
};
exports.getLocation = getLocation;
//# sourceMappingURL=location.Controller.js.map