import { Request, Response } from "express";
import { Location } from "./location.Model";

export const createLocation = async (req: Request, res: Response) => {
  try {
    const { location, venue } = req.body;

    if (!location || !venue) {
      return res.status(400).json({
        success: false,
        message: "Location and venue are required",
      });
    }

    const existingVenue = await Location.findOne({
      venue: { $regex: `^${venue}$`, $options: "i" },
      location: { $regex: `^${location}$`, $options: "i" }
    });

    if (existingVenue) {
      return res.status(409).json({
        success: false,
        message: "Venue and location already exists",
      });
    }

    const newLocation = new Location({
      venue,
      location,
    });

    const savedLocation = await newLocation.save();

    return res.status(201).json({
      success: true,
      data: savedLocation,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Venue already exists",
      });
    }

    console.error("Create location error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create location",
    });
  }
};


export const updateLocation = async (req: Request, res: Response) => {
       const { id } = req.params;
       const { location, venue } = req.body;

       try{
          const updateLocation = await Location.findByIdAndUpdate(
            id, 
            { location, venue }, 
            { new: true });

            const existingLocation = await Location.findOne({
                 venue: { $regex: `^${venue}$`, $options: "i" },
                 location: { $regex: `^${location}$`, $options: "i" }
            })

            if(existingLocation) {
              return res.status(409).json({
                success: false,
                message: "Venue and location already exists"
              })
            }

            if(!location || !venue) {
              return res.status(400).json({
                success: false,
                message: "Location and venue are required"
              })
            }

            if(!updateLocation){
                 return res.status(404).json({
                     success: false,
                     message: "Location not found"
                 })
            }

            return res.status(200).json({
              success: true,
              data: updateLocation
            })
       }
       catch(err){
          console.error("Update location error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to update location",
          });
       }
}

 export const deleteLocation = async (req: Request, res: Response) => {
     const { id } = req.params;

     try{
          const deletedlocation = await Location.findByIdAndDelete(id);

          if(!deletedlocation){
            return res.status(404).json({
                success: false,
                message: "Location not found"
            })
          }

          return res.status(200).json({
            success: true,
            message: "Location deleted successfully"
          })
     }
     catch(err){
          console.error("Delete location error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to delete location",
          });
     }
 }

 export const getLocation = async (req: Request, res: Response) => {
        try{
             const location = await Location.find().sort({ createdAt: -1 });
             return res.status(200).json({
                success: true,
                data: location
             })
        }
        catch(err){
            console.error("Get locations error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to get locations",
            });
        }
 }