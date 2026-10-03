import { Request, Response } from 'express';

/**
 * Extrae un parámetro de ruta como string, validándolo.
 * Si el parámetro no es un string único, responde 400 y devuelve null.
 *
 * Uso:
 *   const id = getStringParam(req, res, 'id');
 *   if (!id) return; // la respuesta ya fue enviada
 */
export const getStringParam = (
  req: Request,
  res: Response,
  name: string,
): string | null => {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    res.status(400).json({ error: `Parámetro inválido: ${name}` });
    return null;
  }
  return value;
};