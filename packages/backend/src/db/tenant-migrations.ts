export type TenantMigration = {
  id: string;
  description: string;
  statements: string[];
};

export const TENANT_MIGRATIONS: TenantMigration[] = [
  {
    id: '001_tenant_info',
    description: 'Tabla de prueba para demostrar aislamiento',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenant_info (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message     TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    id: '002_students',
    description: 'Tabla de estudiantes',
    statements: [
      `CREATE TABLE IF NOT EXISTS students (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name     VARCHAR(100) NOT NULL,
        last_name      VARCHAR(100) NOT NULL,
        dni            VARCHAR(20) UNIQUE NOT NULL,
        birth_date     DATE,
        gender         VARCHAR(10) CHECK (gender IN ('M', 'F', 'X')),
        email          VARCHAR(150),
        phone          VARCHAR(30),
        address        TEXT,
        guardian_name  VARCHAR(200),
        guardian_phone VARCHAR(30),
        is_active      BOOLEAN NOT NULL DEFAULT true,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_students_dni ON students(dni)`,
      `CREATE INDEX IF NOT EXISTS idx_students_last_name ON students(last_name)`,
      `CREATE INDEX IF NOT EXISTS idx_students_active ON students(is_active) WHERE is_active = true`,
    ],
  },
  {
    id: '003_academic_years',
    description: 'Años escolares',
    statements: [
      `CREATE TABLE IF NOT EXISTS academic_years (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        year        INTEGER UNIQUE NOT NULL,
        start_date  DATE NOT NULL,
        end_date    DATE NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (end_date > start_date)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_academic_years_year ON academic_years(year)`,
      `CREATE INDEX IF NOT EXISTS idx_academic_years_active ON academic_years(is_active) WHERE is_active = true`,
    ],
  },
  {
    id: '004_grade_levels',
    description: 'Grados escolares EBR (Inicial, Primaria, Secundaria)',
    statements: [
      `CREATE TABLE IF NOT EXISTS grade_levels (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code        VARCHAR(20) UNIQUE NOT NULL,
        name        VARCHAR(80) NOT NULL,
        level       VARCHAR(20) NOT NULL CHECK (level IN ('inicial', 'primaria', 'secundaria')),
        order_index INTEGER NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_grade_levels_level ON grade_levels(level)`,
      `CREATE INDEX IF NOT EXISTS idx_grade_levels_order ON grade_levels(order_index)`,
    ],
  },
  {
    id: '005_sections',
    description: 'Secciones por grado y año escolar',
    statements: [
      `CREATE TABLE IF NOT EXISTS sections (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        grade_level_id  UUID NOT NULL REFERENCES grade_levels(id) ON DELETE RESTRICT,
        name            VARCHAR(10) NOT NULL,
        capacity        INTEGER,
        is_active       BOOLEAN NOT NULL DEFAULT true,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (academic_year_id, grade_level_id, name)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sections_year ON sections(academic_year_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sections_grade ON sections(grade_level_id)`,
    ],
  },
  {
    id: '006_teachers',
    description: 'Docentes vinculados a usuarios globales',
    statements: [
      `CREATE TABLE IF NOT EXISTS teachers (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID UNIQUE NOT NULL,
        first_name       VARCHAR(100) NOT NULL,
        last_name        VARCHAR(100) NOT NULL,
        dni              VARCHAR(20) UNIQUE NOT NULL,
        email            VARCHAR(150) NOT NULL,
        phone            VARCHAR(30),
        birth_date       DATE,
        hire_date        DATE,
        specialty        VARCHAR(150),
        is_active        BOOLEAN NOT NULL DEFAULT true,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_teachers_dni ON teachers(dni)`,
      `CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_teachers_last_name ON teachers(last_name)`,
      `CREATE INDEX IF NOT EXISTS idx_teachers_active ON teachers(is_active) WHERE is_active = true`,
    ],
  },
  {
    id: '007_subjects',
    description: 'Asignaturas o materias',
    statements: [
      `CREATE TABLE IF NOT EXISTS subjects (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code         VARCHAR(20) UNIQUE NOT NULL,
        name         VARCHAR(150) NOT NULL,
        description  TEXT,
        area         VARCHAR(80),
        is_active    BOOLEAN NOT NULL DEFAULT true,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code)`,
      `CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name)`,
      `CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active) WHERE is_active = true`,
    ],
  },
  {
    id: '008_courses',
    description: 'Cursos: asignatura + sección + año + docente',
    statements: [
      `CREATE TABLE IF NOT EXISTS courses (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
        section_id       UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
        subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
        teacher_id       UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
        weekly_hours     INTEGER,
        is_active        BOOLEAN NOT NULL DEFAULT true,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (academic_year_id, section_id, subject_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_courses_year ON courses(academic_year_id)`,
      `CREATE INDEX IF NOT EXISTS idx_courses_section ON courses(section_id)`,
      `CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject_id)`,
      `CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id)`,
      `CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(is_active) WHERE is_active = true`,
    ],
  },
  {
    id: '009_enrollments',
    description: 'Matrículas de estudiantes en cursos',
    statements: [
      `CREATE TABLE IF NOT EXISTS enrollments (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        status       VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'withdrawn', 'completed')),
        notes        TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (course_id, student_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id)`,
      `CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status) WHERE status = 'active'`,
    ],
  },
  {
    id: '010_students_user_id',
    description: 'Vinculación de estudiantes a cuentas de usuario',
    statements: [
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id) WHERE user_id IS NOT NULL`,
    ],
  },
  {
    id: '011_parents',
    description: 'Padres/tutores con cuenta de usuario',
    statements: [
      `CREATE TABLE IF NOT EXISTS parents (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        UUID UNIQUE NOT NULL,
        first_name     VARCHAR(100) NOT NULL,
        last_name      VARCHAR(100) NOT NULL,
        dni            VARCHAR(20) UNIQUE NOT NULL,
        email          VARCHAR(150) NOT NULL,
        phone          VARCHAR(30),
        occupation     VARCHAR(150),
        address        TEXT,
        is_active      BOOLEAN NOT NULL DEFAULT true,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_parents_dni ON parents(dni)`,
      `CREATE INDEX IF NOT EXISTS idx_parents_user_id ON parents(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_parents_last_name ON parents(last_name)`,
      `CREATE INDEX IF NOT EXISTS idx_parents_active ON parents(is_active) WHERE is_active = true`,
    ],
  },
  {
    id: '012_student_parents',
    description: 'Vinculación N:M entre estudiantes y padres/tutores',
    statements: [
      `CREATE TABLE IF NOT EXISTS student_parents (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        parent_id     UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
        relationship  VARCHAR(30) NOT NULL DEFAULT 'tutor'
                      CHECK (relationship IN ('padre', 'madre', 'tutor', 'apoderado', 'otro')),
        is_primary    BOOLEAN NOT NULL DEFAULT false,
        notes         TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (student_id, parent_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_student_parents_student ON student_parents(student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON student_parents(parent_id)`,
      `CREATE INDEX IF NOT EXISTS idx_student_parents_primary ON student_parents(student_id, is_primary) WHERE is_primary = true`,
    ],
  },
  {
    id: '013_grade_categories',
    description: 'Categorías de evaluación por curso',
    statements: [
      `CREATE TABLE IF NOT EXISTS grade_categories (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        name         VARCHAR(100) NOT NULL,
        description  TEXT,
        weight       NUMERIC(5,2) NOT NULL DEFAULT 0,
        order_index  INTEGER NOT NULL DEFAULT 0,
        is_active    BOOLEAN NOT NULL DEFAULT true,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (course_id, name),
        CHECK (weight >= 0 AND weight <= 100)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_grade_categories_course ON grade_categories(course_id)`,
      `CREATE INDEX IF NOT EXISTS idx_grade_categories_active ON grade_categories(course_id, is_active) WHERE is_active = true`,
    ],
  },
  {
    id: '014_evaluations',
    description: 'Evaluaciones dentro de cada categoría',
    statements: [
      `CREATE TABLE IF NOT EXISTS evaluations (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id   UUID NOT NULL REFERENCES grade_categories(id) ON DELETE CASCADE,
        name          VARCHAR(150) NOT NULL,
        description   TEXT,
        evaluation_date DATE,
        weight        NUMERIC(5,2) NOT NULL DEFAULT 0,
        max_score     NUMERIC(5,2) NOT NULL DEFAULT 20,
        is_active     BOOLEAN NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (weight >= 0 AND weight <= 100),
        CHECK (max_score > 0)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_evaluations_category ON evaluations(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_evaluations_active ON evaluations(category_id, is_active) WHERE is_active = true`,
    ],
  },
  {
    id: '015_grade_entries',
    description: 'Notas por estudiante y evaluación',
    statements: [
      `CREATE TABLE IF NOT EXISTS grade_entries (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_id   UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
        student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        score           NUMERIC(5,2),
        feedback        TEXT,
        graded_by       UUID,
        graded_at       TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (evaluation_id, student_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_grade_entries_evaluation ON grade_entries(evaluation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_grade_entries_student ON grade_entries(student_id)`,
    ],
  },
  {
    id: '016_add_section_tutor',
    description: 'Docente tutor por sección',
    statements: [
      `ALTER TABLE sections ADD COLUMN IF NOT EXISTS tutor_user_id UUID`,
      `CREATE INDEX IF NOT EXISTS idx_sections_tutor ON sections(tutor_user_id) WHERE tutor_user_id IS NOT NULL`,
    ],
  },
  {
    id: '017_attendance_sessions',
    description: 'Sesiones de asistencia por sección y fecha',
    statements: [
      `CREATE TABLE IF NOT EXISTS attendance_sessions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        section_id   UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        session_date DATE NOT NULL,
        topic        VARCHAR(200),
        notes        TEXT,
        taken_by     UUID NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (section_id, session_date)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_sessions_section ON attendance_sessions(section_id)`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date DESC)`,
    ],
  },
  {
    id: '018_attendance_records',
    description: 'Registros de asistencia por estudiante y sesión',
    statements: [
      `CREATE TABLE IF NOT EXISTS attendance_records (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id   UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        status       VARCHAR(20) NOT NULL DEFAULT 'present'
                     CHECK (status IN ('present', 'late', 'absent')),
        notes        TEXT,
        recorded_by  UUID NOT NULL,
        recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (session_id, student_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(student_id, status)`,
    ],
  },
  {
    id: '019_fee_concepts',
    description: 'Conceptos de cobro por colegio',
    statements: [
      `CREATE TABLE IF NOT EXISTS fee_concepts (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name           VARCHAR(150) NOT NULL,
        description    TEXT,
        code           VARCHAR(30) UNIQUE NOT NULL,
        default_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        is_active      BOOLEAN NOT NULL DEFAULT true,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (default_amount >= 0)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fee_concepts_active ON fee_concepts(is_active) WHERE is_active = true`,
      `CREATE INDEX IF NOT EXISTS idx_fee_concepts_code ON fee_concepts(code)`,
    ],
  },
  {
    id: '020_fee_amounts',
    description: 'Monto de un concepto por grado (opcional)',
    statements: [
      `CREATE TABLE IF NOT EXISTS fee_amounts (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fee_concept_id UUID NOT NULL REFERENCES fee_concepts(id) ON DELETE CASCADE,
        grade_level_id UUID NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
        amount         NUMERIC(10,2) NOT NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (fee_concept_id, grade_level_id),
        CHECK (amount >= 0)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fee_amounts_concept ON fee_amounts(fee_concept_id)`,
      `CREATE INDEX IF NOT EXISTS idx_fee_amounts_grade ON fee_amounts(grade_level_id)`,
    ],
  },
  {
    id: '021_invoices',
    description: 'Facturas por estudiante y concepto',
    statements: [
      `CREATE TABLE IF NOT EXISTS invoices (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id     UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
        fee_concept_id UUID NOT NULL REFERENCES fee_concepts(id) ON DELETE RESTRICT,
        amount         NUMERIC(10,2) NOT NULL,
        period         VARCHAR(20),
        due_date       DATE NOT NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
        notes          TEXT,
        created_by     UUID,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (student_id, fee_concept_id, period),
        CHECK (amount >= 0)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_concept ON invoices(fee_concept_id)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)`,
    ],
  },
  {
    id: '022_payments',
    description: 'Pagos realizados sobre facturas',
    statements: [
      `CREATE TABLE IF NOT EXISTS payments (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id     UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
        amount         NUMERIC(10,2) NOT NULL,
        method         VARCHAR(30) NOT NULL
                       CHECK (method IN ('simulated', 'yape', 'card', 'cash', 'transfer')),
        gateway        VARCHAR(30),
        gateway_tx_id  VARCHAR(100),
        status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
        payer_user_id  UUID,
        notes          TEXT,
        paid_at        TIMESTAMPTZ,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (amount > 0)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_gateway_tx ON payments(gateway_tx_id) WHERE gateway_tx_id IS NOT NULL`,
    ],
  },
  {
    id: '023_organization_mp_fields',
    description: 'Campos de integración con Mercado Pago en organizations (esquema público)',
    statements: [
      `ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS mp_user_id VARCHAR(50)`,
      `ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS mp_access_token TEXT`,
      `ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS mp_refresh_token TEXT`,
      `ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS mp_public_key VARCHAR(100)`,
      `ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS mp_connected_at TIMESTAMPTZ`,
      `ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS mp_expires_at TIMESTAMPTZ`,
    ],
  },
  {
    id: '024_students_full_name_section',
    description: 'Fase A.3: full_name, section_id, limpieza de legacy en students',
    statements: [
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name VARCHAR(200)`,
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE SET NULL`,
      `UPDATE students
         SET full_name = TRIM(CONCAT(first_name, ' ', last_name))
         WHERE full_name IS NULL AND first_name IS NOT NULL`,
      `ALTER TABLE students ALTER COLUMN full_name SET NOT NULL`,
      `ALTER TABLE students DROP COLUMN IF EXISTS first_name`,
      `ALTER TABLE students DROP COLUMN IF EXISTS last_name`,
      `ALTER TABLE students DROP COLUMN IF EXISTS guardian_name`,
      `ALTER TABLE students DROP COLUMN IF EXISTS guardian_phone`,
      `CREATE INDEX IF NOT EXISTS idx_students_section ON students(section_id)`,
      `CREATE INDEX IF NOT EXISTS idx_students_full_name ON students(full_name)`,
    ],
  },
  {
    id: '025_add_attendance_is_final',
    description: 'Fase D: columna is_final en attendance_sessions',
    statements: [
      `ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS is_final BOOLEAN NOT NULL DEFAULT false`,
    ],
  },
  {
    id: '026_student_year_end_status',
    description: 'Fase E: estado de fin de año por estudiante',
    statements: [
      `CREATE TABLE IF NOT EXISTS student_year_end_status (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
        final_average     NUMERIC(5,2),
        status            VARCHAR(20) NOT NULL
                          CHECK (status IN ('promoted', 'repeated', 'graduated', 'transferred')),
        next_section_id   UUID REFERENCES sections(id) ON DELETE SET NULL,
        notes             TEXT,
        closed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_by         UUID NOT NULL,
        UNIQUE (student_id, academic_year_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_syes_student ON student_year_end_status(student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_syes_year ON student_year_end_status(academic_year_id)`,
      `CREATE INDEX IF NOT EXISTS idx_syes_status ON student_year_end_status(status)`,
    ],
  },
  // ============================================================
  // ⬇️ NUEVA MIGRACIÓN: teachers → full_name + payment fields
  // ============================================================
  {
    id: '027_teachers_full_name_and_payment',
    description: 'Migrar teachers a full_name + payment_type/hourly_rate/monthly_salary + address',
    statements: [
      // 1. Agregar columnas nuevas (por si no existen)
      `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS full_name VARCHAR(200)`,
      `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS address TEXT`,
      `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20)`,
      `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2)`,
      `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(10,2)`,

      // 2. Poblar full_name desde first_name + last_name (solo si existen esas columnas)
      `DO $$
       BEGIN
         IF EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = current_schema()
             AND table_name = 'teachers'
             AND column_name = 'first_name'
         ) THEN
           UPDATE teachers
              SET full_name = TRIM(CONCAT(first_name, ' ', COALESCE(last_name, '')))
            WHERE full_name IS NULL AND first_name IS NOT NULL;
         END IF;
       END $$`,

      // 3. Hacer full_name NOT NULL (si ya tiene valores)
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM teachers WHERE full_name IS NULL) THEN
           ALTER TABLE teachers ALTER COLUMN full_name SET NOT NULL;
         END IF;
       END $$`,

      // 4. Eliminar columnas viejas
      `ALTER TABLE teachers DROP COLUMN IF EXISTS first_name`,
      `ALTER TABLE teachers DROP COLUMN IF EXISTS last_name`,

      // 5. Constraint para payment_type
      `ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_payment_type_check`,
      `ALTER TABLE teachers
         ADD CONSTRAINT teachers_payment_type_check
         CHECK (payment_type IN ('hourly', 'monthly') OR payment_type IS NULL)`,

      // 6. Constraints numéricos
      `ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_hourly_rate_check`,
      `ALTER TABLE teachers
         ADD CONSTRAINT teachers_hourly_rate_check
         CHECK (hourly_rate IS NULL OR hourly_rate >= 0)`,

      `ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_monthly_salary_check`,
      `ALTER TABLE teachers
         ADD CONSTRAINT teachers_monthly_salary_check
         CHECK (monthly_salary IS NULL OR monthly_salary >= 0)`,

      // 7. Índices nuevos
      `CREATE INDEX IF NOT EXISTS idx_teachers_full_name ON teachers(full_name)`,
    ],
  },

  {
    id: '028_parents_full_name',
    description: 'Migrar parents a full_name (unificar first_name + last_name)',
    statements: [
      // 1. Agregar columna full_name
      `ALTER TABLE parents ADD COLUMN IF NOT EXISTS full_name VARCHAR(200)`,

      // 2. Poblar full_name desde first_name + last_name (solo si existen)
      `DO $$
       BEGIN
         IF EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = current_schema()
             AND table_name = 'parents'
             AND column_name = 'first_name'
         ) THEN
           UPDATE parents
              SET full_name = TRIM(CONCAT(first_name, ' ', COALESCE(last_name, '')))
            WHERE full_name IS NULL AND first_name IS NOT NULL;
         END IF;
       END $$`,

      // 3. Hacer full_name NOT NULL (solo si todos tienen valor)
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM parents WHERE full_name IS NULL) THEN
           ALTER TABLE parents ALTER COLUMN full_name SET NOT NULL;
         END IF;
       END $$`,

      // 4. Eliminar columnas viejas
      `ALTER TABLE parents DROP COLUMN IF EXISTS first_name`,
      `ALTER TABLE parents DROP COLUMN IF EXISTS last_name`,

      // 5. Índice para búsquedas
      `CREATE INDEX IF NOT EXISTS idx_parents_full_name ON parents(full_name)`,
    ],
  },

    {
    id: '029_student_section_history',
    description: 'Historial de secciones de estudiantes (movido de script suelto a migración)',
    statements: [
      `CREATE TABLE IF NOT EXISTS student_section_history (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        section_id        UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
        academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
        enrolled_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        left_at           TIMESTAMPTZ,
        average_at_exit   NUMERIC(5,2),
        reason            TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ssh_student
         ON student_section_history(student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ssh_section
         ON student_section_history(section_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ssh_student_left
         ON student_section_history(student_id, left_at DESC)`,
    ],
  },
  
];