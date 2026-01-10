import { IUser } from "../modules/User/user.Model";

declare global {
  namespace Express {
    interface Request {
      user: IUser & { _id: string };
    }
  }
}