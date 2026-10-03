import { Request } from "express";
import { prisma } from "../../config/prisma";
import { teachersRepository } from "../teachers/teachers.repository";

export const canManageSection = async (
  req: Request,
  sectionId: string,
): Promise<{ allowed: boolean; reason?: string }> => {
  const user = req.user!;
  const schema = req.tenant!.schemaName;

  if (user.role === "ceo") {
    return { allowed: true };
  }

  if (user.role === "docente") {
    const teacher = await teachersRepository.findByUserId(schema, user.userId);
    if (!teacher) {
      return { allowed: false, reason: "No estas registrado como docente" };
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ tutor_user_id: string | null }>>(
      `SELECT tutor_user_id FROM "${schema}".sections WHERE id = $1::uuid LIMIT 1`,
      sectionId,
    );

    if (!rows[0]) {
      return { allowed: false, reason: "Seccion no encontrada" };
    }

    if (rows[0].tutor_user_id !== user.userId) {
      return {
        allowed: false,
        reason: "Solo el tutor de la seccion o el CEO pueden gestionar la asistencia",
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Rol no autorizado para gestionar asistencia" };
};
