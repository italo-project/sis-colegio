/**
 * Formatea una sección como "3° Secundaria "A"".
 */
export const formatSection = (section: {
  name: string;
  gradeLevel?: { name: string } | null;
}): string => {
  if (!section.gradeLevel?.name) return section.name;
  return `${section.gradeLevel.name} "${section.name}"`;
};

/**
 * Formatea una sección con año: "3° Secundaria "A" (2026)".
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
 * Formatea un curso completo: "Matemática 3°A 2026".
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
  const section = course.section.name;
  const year = course.academicYear?.year;

  // Extraer el número del grado: "3° Secundaria" → "3°"
  const gradeNumber = grade.split(' ')[0] ?? grade;

  return `${course.subject.name} ${gradeNumber}${section}${year ? ` ${year}` : ''}`;
};