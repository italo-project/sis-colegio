type RawEntry = {
  score: number | null;
  evaluationMaxScore: number;
  evaluationWeight: number;
  categoryId: string;
  categoryName: string;
  categoryWeight: number;
};

export type CategoryAverage = {
  categoryId: string;
  categoryName: string;
  categoryWeight: number;
  average: number | null;
  totalWeightUsed: number; // suma de pesos de evaluaciones con nota
  totalWeightPossible: number; // suma de pesos de todas las evaluaciones con nota esperada
};

export type CourseAverage = {
  categories: CategoryAverage[];
  finalAverage: number | null;
};

/**
 * Calcula el promedio de cada categoría y el promedio final del curso.
 * Escala: la nota se normaliza a 20 para el cálculo final.
 *
 * Fórmula por categoría:
 *   average = Σ (peso_eval × nota_normalizada) / Σ peso_eval
 *
 * Fórmula final del curso:
 *   final = Σ (peso_cat × average_cat) / Σ peso_cat
 *
 * Solo se consideran evaluaciones con nota registrada (score NOT NULL).
 * Si una categoría no tiene notas, su average es null y se excluye del final.
 */
export const computeAverages = (entries: RawEntry[], scale: number = 20): CourseAverage => {
  // Agrupar por categoría
  const byCategory = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      categoryWeight: number;
      entries: RawEntry[];
    }
  >();

  for (const e of entries) {
    if (!byCategory.has(e.categoryId)) {
      byCategory.set(e.categoryId, {
        categoryId: e.categoryId,
        categoryName: e.categoryName,
        categoryWeight: e.categoryWeight,
        entries: [],
      });
    }
    byCategory.get(e.categoryId)!.entries.push(e);
  }

  const categories: CategoryAverage[] = [];

  for (const cat of byCategory.values()) {
    const graded = cat.entries.filter((e) => e.score !== null);
    const totalWeightPossible = cat.entries.reduce((sum, e) => sum + e.evaluationWeight, 0);
    const totalWeightUsed = graded.reduce((sum, e) => sum + e.evaluationWeight, 0);

    let average: number | null = null;
    if (graded.length > 0 && totalWeightUsed > 0) {
      const weightedSum = graded.reduce((sum, e) => {
        // Normalizar la nota a la escala (por defecto 20)
        const normalized = ((e.score as number) / e.evaluationMaxScore) * scale;
        return sum + e.evaluationWeight * normalized;
      }, 0);
      average = round(weightedSum / totalWeightUsed, 2);
    }

    categories.push({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      categoryWeight: cat.categoryWeight,
      average,
      totalWeightUsed,
      totalWeightPossible,
    });
  }

  // Promedio final: solo categorías con promedio calculado
  const withAverage = categories.filter((c) => c.average !== null);
  const totalCatWeight = withAverage.reduce((sum, c) => sum + c.categoryWeight, 0);

  let finalAverage: number | null = null;
  if (withAverage.length > 0 && totalCatWeight > 0) {
    const weightedSum = withAverage.reduce(
      (sum, c) => sum + c.categoryWeight * (c.average as number),
      0,
    );
    finalAverage = round(weightedSum / totalCatWeight, 2);
  }

  return { categories, finalAverage };
};

const round = (n: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
};