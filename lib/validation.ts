import { z } from "zod";
import { STATUSES } from "@/lib/statuses";

export const statusSchema = z.enum(STATUSES);
export const idSchema = z.number().int().positive();

export const applicationSchema = z.object({
  company: z
    .string()
    .trim()
    .min(1, "Company is required")
    .max(100, "Company is too long"),
  position: z
    .string()
    .trim()
    .min(1, "Position is required")
    .max(150, "Position is too long"),
  url: z.string().trim().url("Enter a valid URL").or(z.literal("")),
  status: statusSchema,
});

export type FormValues = {
  company: string;
  position: string;
  url: string;
  status: string;
};

export type FormState = {
  errors?: Partial<Record<keyof FormValues, string[]>>;
  values?: FormValues;
};
