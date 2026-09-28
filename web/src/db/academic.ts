import { db, type ClassRow, type Gender, type SectionRow, type StudentRow } from '@/db/db';

export async function listClasses(): Promise<ClassRow[]> {
  return db.classes.orderBy('gradeLevel').toArray();
}

export async function createClass(name: string, gradeLevel: number): Promise<ClassRow> {
  const row: ClassRow = { id: crypto.randomUUID(), name, gradeLevel, createdAt: new Date().toISOString() };
  await db.classes.add(row);
  return row;
}

export async function listSectionsByClass(classId: string): Promise<SectionRow[]> {
  return db.sections.where('classId').equals(classId).sortBy('name');
}

export async function createSection(classId: string, name: string): Promise<SectionRow> {
  const row: SectionRow = { id: crypto.randomUUID(), classId, name, createdAt: new Date().toISOString() };
  await db.sections.add(row);
  return row;
}

export async function listStudentsBySection(sectionId: string): Promise<StudentRow[]> {
  const rows = await db.students.where('sectionId').equals(sectionId).toArray();
  return rows.filter((row) => row.isActive).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
}

export async function getStudent(studentId: string): Promise<StudentRow | undefined> {
  return db.students.get(studentId);
}

export async function createStudent(input: {
  sectionId: string;
  rollNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
}): Promise<StudentRow> {
  const row: StudentRow = { id: crypto.randomUUID(), isActive: true, createdAt: new Date().toISOString(), ...input };
  await db.students.add(row);
  return row;
}
