import { z } from "zod";
import { genderValues } from "../../db/schema.js";

export const createClassSchema = z.object({
  name: z.string().min(1),
  gradeLevel: z.coerce.number().int(),
});
export type CreateClassInput = z.infer<typeof createClassSchema>;

export const createSectionSchema = z.object({
  name: z.string().min(1),
});
export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const createStudentSchema = z.object({
  sectionId: z.string().uuid(),
  rollNumber: z.string().min(1),
  fullName: z.string().min(1),
  dateOfBirth: z.string().date(),
  gender: z.enum(genderValues),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = createStudentSchema.partial();
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
