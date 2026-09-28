import { apiRequest } from '@/lib/api-client';

export type ClassDto = { id: string; name: string; gradeLevel: number; createdAt: string };
export type SectionDto = { id: string; classId: string; name: string; createdAt: string };
export type StudentDto = {
  id: string;
  sectionId: string;
  rollNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function listClasses(token: string) {
  return apiRequest<ClassDto[]>('/api/classes', { token });
}

export function listSectionsByClass(token: string, classId: string) {
  return apiRequest<SectionDto[]>(`/api/classes/${classId}/sections`, { token });
}

export function listStudentsBySection(token: string, sectionId: string) {
  return apiRequest<StudentDto[]>(`/api/sections/${sectionId}/students`, { token });
}

export function getStudent(token: string, studentId: string) {
  return apiRequest<StudentDto>(`/api/students/${studentId}`, { token });
}

export type CreateStudentInput = {
  sectionId: string;
  rollNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
};

export function createStudent(token: string, input: CreateStudentInput) {
  return apiRequest<StudentDto>('/api/students', { method: 'POST', token, body: input });
}
