import { Request, Response } from 'express';
import { z } from 'zod';
import { getStringParam } from '../../utils/params';
import { closeYearService } from './close-year.service';
import {
  closeYearSchema,
  listCandidatesQuerySchema,
  preloadNextYearSchema,
} from './close-year.schemas';

const assignNextSectionsSchema = z.object({
  academicYearId: z.string().uuid(),
  assignments: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        nextSectionId: z.string().uuid(),
      }),
    )
    .min(1)
    .max(2000),
});

export const closeYearController = {
  /**
   * GET /api/academic/close-year/candidates?academicYearId=...
   */
  async listCandidates(req: Request, res: Response) {
    const parsed = listCandidatesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }

    try {
      const result = await closeYearService.listCandidates(
        req.tenant!.schemaName,
        parsed.data.academicYearId,
      );
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      return res.status(404).json({ error: msg });
    }
  },

  /**
   * POST /api/academic/close-year
   */
  async closeYear(req: Request, res: Response) {
    const parsed = closeYearSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const result = await closeYearService.closeYear(
      req.tenant!.schemaName,
      parsed.data,
      req.user!.userId,
    );

    if ('error' in result) {
      return res.status(409).json(result);
    }

    return res.status(201).json(result);
  },

  /**
   * POST /api/academic/preload-next-year
   */
  async preloadNextYear(req: Request, res: Response) {
    const parsed = preloadNextYearSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const result = await closeYearService.preloadNextYear(
      req.tenant!.schemaName,
      parsed.data,
    );

    if ('error' in result) {
      return res.status(409).json(result);
    }

    return res.status(201).json(result);
  },

  /**
   * POST /api/academic/assign-next-sections
   */
  async assignNextSections(req: Request, res: Response) {
    const parsed = assignNextSectionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const result = await closeYearService.assignNextSections(
      req.tenant!.schemaName,
      parsed.data.academicYearId,
      parsed.data.assignments,
    );

    return res.json(result);
  },

  /**
   * GET /api/academic/students/:id/year-history
   */
  async getStudentHistory(req: Request, res: Response) {
    const studentId = getStringParam(req, res, 'id');
    if (!studentId) return;

    const history = await closeYearService.getStudentHistory(
      req.tenant!.schemaName,
      studentId,
    );

    res.json({ items: history, total: history.length });
  },
};