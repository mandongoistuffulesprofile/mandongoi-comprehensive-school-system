import { api } from "../lib/api";
import type { Assessment, LearningArea, ReportCard, Strand } from "../types";

export const learningAreasApi = {
  list: () => api.get<LearningArea[]>("/academic"),
  listByLevel: (level: string) => api.get<LearningArea[]>("/academic/by-level", { level }),
  create: (payload: Partial<LearningArea>) => api.post<LearningArea>("/academic", payload),
  update: (id: string, payload: Partial<LearningArea>) => api.put<LearningArea>(`/academic/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/academic/${id}`),
  seed: () => api.post<{ created: number; total: number }>("/academic/seed"),
};

export const strandsApi = {
  listByLearningArea: (learningAreaId: string) =>
    api.get<Strand[]>(`/strands/learning-area/${learningAreaId}`),
  create: (payload: Partial<Strand>) => api.post<Strand>("/strands", payload),
  remove: (id: string) => api.delete<void>(`/strands/${id}`),
};

export const assessmentsApi = {
  create: (payload: {
    studentId: string;
    learningAreaId: string;
    strandId?: string;
    term: number;
    academicYear: number;
    type: "formative" | "summative";
    performanceLevel?: number;
    score?: string;
    remarks?: string;
  }) => api.post<Assessment>("/assessments", payload),
  createBulk: (payload: {
    assessments: {
      studentId: string;
      learningAreaId: string;
      term: number;
      academicYear: number;
      type: "formative" | "summative";
      score?: string;
      performanceLevel?: number;
      remarks?: string;
    }[];
    term: number;
    academicYear: number;
  }) => api.post<Assessment[]>("/assessments/bulk", payload),
  listForStudent: (studentId: string, filters?: { term?: number; academicYear?: number }) =>
    api.get<Assessment[]>(`/assessments/student/${studentId}`, filters as Record<string, string | number>),
  listByClass: (filters: { grade: string; learningAreaId: string; term: number; academicYear: number }) =>
    api.get<Assessment[]>("/assessments/by-class", filters as Record<string, string | number>),
};

export const reportCardsApi = {
  generate: (payload: {
    studentId: string;
    term: number;
    academicYear: number;
    compiledResults: unknown;
    teacherComments?: string;
  }) => api.post<ReportCard>("/report-cards/generate", payload),
  publish: (id: string) => api.patch<ReportCard>(`/report-cards/${id}/publish`),
  listForStudent: (studentId: string) =>
    api.get<ReportCard[]>(`/report-cards/student/${studentId}`),
};
