import { IUser } from "../modules/User/user.Model";
import { IEvent } from "../modules/Event/event.Model";
import { ILocation } from "../modules/Location/location.Model"

declare global {
  namespace Express {
    interface Request {
      user: IUser & { _id: string }, any;
      event: IEvent & { _id: string };
      location: ILocation & { _id: string };
    }
  }
}

export {};