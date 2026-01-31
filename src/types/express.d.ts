import { IUser } from "../modules/User/user.Model";
import { IEvent } from "../modules/Event/event.Model";

declare global {
  namespace Express {
    interface Request {
      user: IUser & { _id: string };
      event: IEvent & { _id: string };
    }
  }
}

export {};