/**
 * Formatea una sección como `3° Secundaria "A"`.
 * Nota: gradeLevel.name ya incluye el nivel (ej: "3° Secundaria"),
 * por eso NO agregamos el nivel nuevamente.
 */
export const formatSection = (section: {
  name: string;
  gradeLevel?: { name: string } | null;
}): string => {
  if (!section.gradeLevel?.name) return section.name;
  return `${section.gradeLevel.name} "${section.name}"`;
};

/**
 * Formatea una sección con año: `3° Secundaria "A" (2026)`.
 */
export const formatSectionWithYear = (section: {
  name: string;
  gradeLevel?: { name: string } | null;
  academicYear?: { year: number } | null;
}): string => {
  const base = formatSection(section);
  if (!section.academicYear?.year) return base;
  return `${base} (${section.academicYear.year})`;
};

/**
 * Formatea un curso completo: `Matemática 3° Secundaria "A" 2026`.
 */
export const formatCourse = (course: {
  subject: { name: string };
  section: {
    name: string;
    gradeLevel?: { name: string; code?: string } | null;
  };
  academicYear?: { year: number } | null;
}): string => {
  const grade = course.section.gradeLevel?.name ?? '';
  const sectionName = course.section.name;
  const year = course.academicYear?.year;

  return `${course.subject.name} ${grade} "${sectionName}"${year ? ` ${year}` : ''}`;
};