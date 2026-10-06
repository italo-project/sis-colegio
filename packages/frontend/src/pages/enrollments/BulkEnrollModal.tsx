import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { enrollmentsApi } from '@/api/enrollments.api';
import { coursesApi } from '@/api/courses.api';
import { sectionsApi } from '@/api/sections.api';
import { formatCourse } from '@/lib/format';
import { apiClient, getErrorMessage } from '@/api/client';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
};

export const BulkEnrollModal = ({ open, onClose, onSuccess }: Props) => {
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const { data: sections } = useQuery({
    queryKey: ['sections-for-bulk'],
    queryFn: () => sectionsApi.list({ active: 'true' }),
    enabled: open,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-for-bulk'],
    queryFn: () => coursesApi.list({ active: 'true', limit: 200, offset: 0 }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setSelectedSectionId('');
      setSelectedCourseId('');
      setResult(null);
    }
  }, [open]);

  const handleBulk = async () => {
    if (!selectedSectionId || !selectedCourseId) {
      alert('Selecciona una sección y un curso');
      return;
    }

    setIsWorking(true);
    setResult(null);

    try {
      const { data: coursesOfSection } = await apiClient.get<{ items: any[] }>('/courses', {
        params: { sectionId: selectedSectionId, active: 'true' },
      });

      if (!coursesOfSection.items || coursesOfSection.items.length === 0) {
        alert('Esta sección no tiene cursos aún. Crea al menos un curso primero.');
        setIsWorking(false);
        return;
      }

      // 2. Obtener estudiantes desde el primer curso de la sección
      const firstCourse = coursesOfSection.items[0];
      const { data: studentsInCourse } = await apiClient.get<{
        items: Array<{ student: { id: string; firstName: string; lastName: string } }>;
      }>(`/courses/${firstCourse.id}/students`);

      if (!studentsInCourse.items || studentsInCourse.items.length === 0) {
        alert('Esta sección no tiene estudiantes matriculados en ningún curso.');
        setIsWorking(false);
        return;
      }

      // 3. Matricular a cada uno en el curso seleccionado
      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const item of studentsInCourse.items) {
        try {
          await enrollmentsApi.create({
            courseId: selectedCourseId,
            studentId: item.student.id,
          });
          created++;
        } catch (err) {
          const msg = getErrorMessage(err);
          if (msg.includes('ya está matriculado')) {
            skipped++;
          } else {
            errors.push(`${item.student.firstName} ${item.student.lastName}: ${msg}`);
          }
        }
      }

      setResult({ created, skipped, errors });
      if (created > 0) {
        onSuccess(created);
      }
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Matricular toda una sección"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isWorking}>
            Cerrar
          </Button>
          <Button onClick={handleBulk} loading={isWorking}>
            Matricular sección
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <strong>¿Cómo funciona?</strong>
          <p className="mt-1">
            Selecciona una <strong>sección de origen</strong> (de donde se copiarán los estudiantes)
            y un <strong>curso destino</strong>. Se matricularán todos los estudiantes de la sección
            en el curso elegido.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sección de origen *
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Selecciona...</option>
            {sections?.map((s) => (
              <option key={s.id} value={s.id}>
                Sección "{s.name}"
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Curso destino *
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Selecciona...</option>
            {courses?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCourse(c)}
              </option>
            ))}
          </select>
        </div>

        {result && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="font-medium text-gray-900 mb-2">Resultado:</div>
            <ul className="space-y-1 text-gray-700">
              <li>✅ {result.created} matrícula(s) creada(s)</li>
              {result.skipped > 0 && <li>⏭️ {result.skipped} ya estaban matriculados</li>}
              {result.errors.length > 0 && (
                <li className="text-red-600">
                  ❌ {result.errors.length} error(es):
                  <ul className="ml-4 mt-1 text-xs">
                    {result.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};