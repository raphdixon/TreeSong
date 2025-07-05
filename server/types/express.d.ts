import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        teamId: string;
        email: string;
      };
    }
  }
}

export {};