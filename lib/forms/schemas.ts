// Zod schemas shared between client-side validation (react-hook-form) and
// server-action contracts. New forms should add their schema here so the
// validation rules are written once.

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const bootstrapSchema = z.object({
  organisation_name: z.string().min(1, "Organisation name is required"),
  full_name: z.string().min(1, "Your name is required"),
  email: z.string().email("Enter a valid email"),
  position: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type BootstrapInput = z.infer<typeof bootstrapSchema>;

export const createMissionSchema = z.object({
  camp_id: z.string().uuid("Pick a camp"),
  mission_number: z
    .string()
    .min(1, "Mission number is required")
    .max(64, "Mission number is too long"),
  mission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
});
export type CreateMissionInput = z.infer<typeof createMissionSchema>;
