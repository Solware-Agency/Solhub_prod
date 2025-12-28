-- =====================================================
-- FASE 1: Crear Tablas Nuevas (Sin Modificar Existente)
-- =====================================================
-- Esta migración es SEGURA: solo crea tablas nuevas
-- NO modifica la tabla patients existente
-- Rollback: DROP TABLE identificaciones, responsabilidades;
-- =====================================================

-- =====================================================
-- 1. TABLA: identificaciones
-- =====================================================
-- Almacena documentos legales (cédulas, pasaportes) 
-- separados de los pacientes
-- =====================================================

CREATE TABLE IF NOT EXISTS identificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('V', 'E', 'J', 'C', 'pasaporte')),
  numero TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(laboratory_id, numero, tipo_documento)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_identificaciones_laboratory 
  ON identificaciones(laboratory_id);

CREATE INDEX IF NOT EXISTS idx_identificaciones_paciente 
  ON identificaciones(paciente_id);

CREATE INDEX IF NOT EXISTS idx_identificaciones_numero 
  ON identificaciones(numero);

CREATE INDEX IF NOT EXISTS idx_identificaciones_tipo_numero 
  ON identificaciones(tipo_documento, numero);

CREATE INDEX IF NOT EXISTS idx_identificaciones_lab_tipo_numero 
  ON identificaciones(laboratory_id, tipo_documento, numero);

-- Comentarios
COMMENT ON TABLE identificaciones IS 'Documentos legales (cédulas, pasaportes) separados de pacientes. Permite múltiples documentos por paciente.';
COMMENT ON COLUMN identificaciones.tipo_documento IS 'Tipo de documento: V (Venezolano), E (Extranjero), J (Jurídico), C (Comuna), pasaporte';
COMMENT ON COLUMN identificaciones.numero IS 'Número del documento sin prefijo (ej: 12345678)';
COMMENT ON COLUMN identificaciones.paciente_id IS 'Referencia al paciente en la tabla patients';

-- =====================================================
-- 2. TABLA: responsabilidades
-- =====================================================
-- Relación entre responsables y dependientes 
-- (menores de edad o animales)
-- =====================================================

CREATE TABLE IF NOT EXISTS responsabilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  paciente_id_responsable UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  paciente_id_dependiente UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('menor', 'animal')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(laboratory_id, paciente_id_responsable, paciente_id_dependiente),
  CHECK (paciente_id_responsable != paciente_id_dependiente)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_responsabilidades_laboratory 
  ON responsabilidades(laboratory_id);

CREATE INDEX IF NOT EXISTS idx_responsabilidades_responsable 
  ON responsabilidades(paciente_id_responsable);

CREATE INDEX IF NOT EXISTS idx_responsabilidades_dependiente 
  ON responsabilidades(paciente_id_dependiente);

CREATE INDEX IF NOT EXISTS idx_responsabilidades_tipo 
  ON responsabilidades(tipo);

CREATE INDEX IF NOT EXISTS idx_responsabilidades_lab_responsable 
  ON responsabilidades(laboratory_id, paciente_id_responsable);

-- Comentarios
COMMENT ON TABLE responsabilidades IS 'Relaciones entre responsables y dependientes (menores de edad o animales). Un responsable puede tener múltiples dependientes.';
COMMENT ON COLUMN responsabilidades.paciente_id_responsable IS 'ID del paciente responsable (adulto con cédula)';
COMMENT ON COLUMN responsabilidades.paciente_id_dependiente IS 'ID del paciente dependiente (menor o animal)';
COMMENT ON COLUMN responsabilidades.tipo IS 'Tipo de dependiente: menor (menor de edad) o animal';

-- =====================================================
-- 3. RLS POLICIES: identificaciones
-- =====================================================

ALTER TABLE identificaciones ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuarios solo ven identificaciones de su laboratorio
CREATE POLICY "Users can view identificaciones from their laboratory"
  ON identificaciones FOR SELECT
  USING (
    laboratory_id = (
      SELECT laboratory_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- INSERT: Usuarios solo pueden insertar en su laboratorio
CREATE POLICY "Users can insert identificaciones in their laboratory"
  ON identificaciones FOR INSERT
  WITH CHECK (
    laboratory_id = (
      SELECT laboratory_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- UPDATE: Usuarios solo pueden actualizar en su laboratorio
CREATE POLICY "Users can update identificaciones in their laboratory"
  ON identificaciones FOR UPDATE
  USING (
    laboratory_id = (
      SELECT laboratory_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    laboratory_id = (
      SELECT laboratory_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- DELETE: Solo owners/admins pueden eliminar
CREATE POLICY "Owners can delete identificaciones in their laboratory"
  ON identificaciones FOR DELETE
  USING (
    laboratory_id = (
      SELECT laboratory_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 4. RLS POLICIES: responsabilidades
-- =====================================================

ALTER TABLE responsabilidades ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuarios solo ven responsabilidades de su laboratorio
CREATE POLICY "Users can view responsabilidades from their laboratory"
  ON responsabilidades FOR SELECT
  USING (
    laboratory_id = (
      SELECT laboratory_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- INSERT: Usuarios solo pueden insertar en su laboratorio
CREATE POLICY "Users can insert responsabilidades in their laboratory"
  ON responsabilidades FOR INSERT
  WITH CHECK (
    laboratory_id = (
      SELECT laboratory_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- UPDATE: Usuarios solo pueden actualizar en su laboratorio
CREATE POLICY "Users can update responsabilidades in their laboratory"
  ON responsabilidades FOR UPDATE
  USING (
    laboratory_id = (
      SELECT laboratory_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    laboratory_id = (
      SELECT laboratory_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- DELETE: Solo owners/admins pueden eliminar
CREATE POLICY "Owners can delete responsabilidades in their laboratory"
  ON responsabilidades FOR DELETE
  USING (
    laboratory_id = (
      SELECT laboratory_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 5. VALIDACIÓN: Verificar que las tablas se crearon
-- =====================================================

DO $$
BEGIN
  -- Verificar que identificaciones existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'identificaciones'
  ) THEN
    RAISE EXCEPTION '❌ ERROR: Tabla identificaciones no se creó correctamente';
  END IF;

  -- Verificar que responsabilidades existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'responsabilidades'
  ) THEN
    RAISE EXCEPTION '❌ ERROR: Tabla responsabilidades no se creó correctamente';
  END IF;

  RAISE NOTICE '✅ FASE 1 COMPLETADA: Tablas creadas correctamente';
END $$;

-- =====================================================
-- FIN DE FASE 1
-- =====================================================
-- Próximo paso: FASE 2 - Agregar campos a patients
-- =====================================================

