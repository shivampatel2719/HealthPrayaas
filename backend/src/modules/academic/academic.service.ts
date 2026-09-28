import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { classes, sections, students } from "../../db/schema.js";
import { NotFoundError } from "../../lib/errors.js";
import type { CreateClassInput, CreateSectionInput, CreateStudentInput, UpdateStudentInput } from "./academic.schema.js";

export function listClasses() {
  return db.select().from(classes).orderBy(asc(classes.gradeLevel));
}

export async function createClass(input: CreateClassInput) {
  const [created] = await db.insert(classes).values(input).returning();
  return created;
}

export function listSectionsByClass(classId: string) {
  return db.select().from(sections).where(eq(sections.classId, classId)).orderBy(asc(sections.name));
}

export async function createSection(classId: string, input: CreateSectionInput) {
  const [created] = await db
    .insert(sections)
    .values({ classId, name: input.name })
    .returning();
  return created;
}

export function listStudentsBySection(sectionId: string) {
  return db
    .select()
    .from(students)
    .where(and(eq(students.sectionId, sectionId), eq(students.isActive, true)))
    .orderBy(asc(students.rollNumber));
}

export async function createStudent(input: CreateStudentInput) {
  const [created] = await db.insert(students).values(input).returning();
  return created;
}

export async function getStudent(id: string) {
  const [student] = await db.select().from(students).where(eq(students.id, id));
  if (!student) {
    throw new NotFoundError("Student not found");
  }
  return student;
}

export async function updateStudent(id: string, input: UpdateStudentInput) {
  const [updated] = await db
    .update(students)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(students.id, id))
    .returning();
  if (!updated) {
    throw new NotFoundError("Student not found");
  }
  return updated;
}

export async function deactivateStudent(id: string) {
  const [updated] = await db
    .update(students)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(students.id, id))
    .returning();
  if (!updated) {
    throw new NotFoundError("Student not found");
  }
  return updated;
}
