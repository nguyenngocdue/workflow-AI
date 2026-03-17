import { z } from "zod";

export type UserPreferences = {
  displayName?: string;
  profession?: string;
  responseStyleExample?: string;
  botName?: string;
};

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  preferences: UserPreferences | null;
  lastLogin?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BasicUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
};

export interface BasicUserWithLastLogin extends BasicUser {
  lastLogin: Date | null;
}

export type UserSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
  };
};

export type UserSessionUser = UserSession["user"];

export const UserPreferencesZodSchema = z.object({
  displayName: z.string().optional(),
  profession: z.string().optional(),
  responseStyleExample: z.string().optional(),
  botName: z.string().optional(),
});
