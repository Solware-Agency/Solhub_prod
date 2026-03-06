# 🚀 Guía de Migración Multi-tenant para Solhub

## 📋 Resumen

Esta carpeta contiene las migraciones SQL necesarias para convertir Solhub de un
sistema single-tenant (Conspat) a un SaaS multi-tenant que puede servir a
múltiples laboratorios en Venezuela.

## 📁 Archivos de Migración (Ejecutar en ORDEN)

### Fase 1: Base de Datos (5 migraciones)

| #   | Archivo                                              | Descripción                                | Estado   |
| --- | ---------------------------------------------------- | ------------------------------------------ | -------- |
| 1.1 | `20251024000000_create_laboratories_table.sql`       | Crear tabla maestra `laboratories`         | ✅ Listo |
| 1.2 | `20251024000001_add_laboratory_id_to_tables.sql`     | Agregar `laboratory_id` a todas las tablas | ✅ Listo |
| 1.3 | `20251024000002_migrate_data_to_conspat.sql`         | Migrar datos existentes a Conspat          | ✅ Listo |
| 1.4 | `20251024000003_make_laboratory_id_required.sql`     | Hacer `laboratory_id` NOT NULL             | ✅ Listo |
| 1.5 | `20251024000004_update_rls_policies_multitenant.sql` | Actualizar RLS policies                    | ✅ Listo |

## 🚨 ADVERTENCIAS IMPORTANTES

### ⚠️ Leer ANTES de aplicar en producción:

1. **BACKUP OBLIGATORIO**: Hacer backup completo de la base de datos antes de
   empezar
2. **TESTING REQUERIDO**: Probar en ambiente local/staging primero
3. **COORDINACIÓN**: La migración 1.5 (RLS) debe coordinarse con deploy del
   frontend
4. **IRREVERSIBLE**: Algunas migraciones son difíciles de revertir
5. **DOWNTIME**: Considerar ventana de mantenimiento para producción

### ⏱️ Tiempo estimado de ejecución:

- **Base de datos pequeña** (<10k registros): ~5 minutos
- **Base de datos mediana** (10k-100k registros): ~15 minutos
- **Base de datos grande** (>100k registros): ~30-60 minutos

## 📝 Instrucciones de Aplicación

### Opción A: Ambiente Local (Desarrollo)

```bash
# 1. Asegurarte de tener Supabase CLI instalado
supabase --version

# 2. Asegurarte de estar en el directorio del proyecto
cd C:\Users\Windows\Dev\Solhub_prod

# 3. Verificar que el proyecto local está corriendo
supabase status

# 4. Aplicar migraciones localmente
supabase db reset  # Esto aplicará TODAS las migraciones desde cero

# O aplicar solo las nuevas migraciones
supabase migration up

# 5. Verificar que las migraciones se aplicaron correctamente
supabase db diff  # No debe mostrar diferencias

# 6. Ejecutar función de testing (dentro de la base de datos)
# Ir a Supabase Studio > SQL Editor y ejecutar:
SELECT * FROM test_multitenant_isolation();
```

### Opción B: Ambiente de Producción (Supabase Cloud)

```bash
# 1. BACKUP OBLIGATORIO
# Ir a Supabase Dashboard > Database > Backups
# O hacer backup manual:
pg_dump -h [DB_HOST] -U postgres -d postgres > backup_pre_multitenant.sql

# 2. Aplicar migraciones a producción
supabase db push

# Alternativamente, aplicar manualmente desde el Dashboard:
# Supabase Dashboard > SQL Editor > copiar y pegar cada migración en orden

# 3. Verificar que se aplicaron correctamente
# Ir a Table Editor y verificar que:
# - Existe tabla 'laboratories'
# - Todas las tablas tienen columna 'laboratory_id'
# - Existe laboratorio 'conspat'

# 4. Ejecutar tests de seguridad
SELECT * FROM test_multitenant_isolation();
```

## 🧪 Testing Obligatorio

### Test 1: Verificar estructura de base de datos

```sql
-- Verificar que la tabla laboratories existe
SELECT * FROM laboratories WHERE slug = 'conspat';

-- Verificar que todas las tablas tienen laboratory_id
SELECT
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'laboratory_id'
ORDER BY table_name;

-- Resultado esperado: 7+ tablas con laboratory_id NOT NULL
```

### Test 2: Verificar migración de datos

```sql
-- Verificar que todos los registros tienen laboratory_id asignado
SELECT
  'patients' as tabla,
  COUNT(*) as total,
  COUNT(laboratory_id) as con_lab_id,
  COUNT(*) FILTER (WHERE laboratory_id IS NULL) as sin_lab_id
FROM patients
UNION ALL
SELECT
  'medical_records_clean',
  COUNT(*),
  COUNT(laboratory_id),
  COUNT(*) FILTER (WHERE laboratory_id IS NULL)
FROM medical_records_clean
UNION ALL
SELECT
  'profiles',
  COUNT(*),
  COUNT(laboratory_id),
  COUNT(*) FILTER (WHERE laboratory_id IS NULL)
FROM profiles;

-- Resultado esperado: sin_lab_id = 0 en todas las tablas
```

### Test 3: Verificar RLS Policies

```sql
-- Ver todas las policies multi-tenant
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%laboratory%'
ORDER BY tablename, policyname;

-- Resultado esperado: 16+ policies con 'laboratory' en el nombre
```

### Test 4: Verificar aislamiento multi-tenant (CRÍTICO)

```sql
-- Ejecutar función de testing
SELECT * FROM test_multitenant_isolation();

-- Resultado esperado:
-- ✅ User Laboratory Assignment: PASS
-- ✅ Patient Isolation: PASS
-- ✅ Insert Protection: INFO
```

### Test 5: Crear segundo laboratorio de prueba

```sql
-- Crear laboratorio de prueba
INSERT INTO laboratories (slug, name, status)
VALUES ('test-lab', 'Laboratorio de Prueba', 'active')
RETURNING id;

-- Crear usuario de prueba en ese laboratorio
-- (Guardar el ID del laboratorio de arriba)
INSERT INTO profiles (id, laboratory_id, role, display_name)
VALUES (
  'uuid-del-nuevo-usuario',  -- Crear usuario en Supabase Auth primero
  'uuid-del-laboratorio-test',
  'admin',
  'Usuario Test'
);

-- Crear paciente de prueba en ese laboratorio
INSERT INTO patients (laboratory_id, cedula, nombre, edad)
VALUES (
  'uuid-del-laboratorio-test',
  'V-99999999',
  'Paciente Test',
  30
);

-- VERIFICACIÓN CRÍTICA:
-- Hacer login con Usuario Test y verificar que:
-- 1. NO ve pacientes de Conspat
-- 2. SOLO ve el paciente V-99999999
-- 3. NO puede editar pacientes de Conspat
```

## 📊 Verificaciones Post-Migración

### Checklist de Seguridad

- [ ] ✅ Tabla `laboratories` existe y tiene registro de Conspat
- [ ] ✅ Todas las tablas principales tienen columna `laboratory_id` (NOT NULL)
- [ ] ✅ Todos los registros existentes tienen `laboratory_id` asignado a
      Conspat
- [ ] ✅ RLS Policies actualizadas filtran por `laboratory_id`
- [ ] ✅ Función `test_multitenant_isolation()` pasa todos los tests
- [ ] ✅ Usuario de Conspat NO ve datos de laboratorio de prueba
- [ ] ✅ Usuario de test lab NO ve datos de Conspat
- [ ] ✅ Intentar INSERT con `laboratory_id` de otro lab falla
- [ ] ✅ Frontend sigue funcionando normalmente (sin errores 403)

### Checklist de Performance

- [ ] ✅ Queries principales usan índices de `laboratory_id`
- [ ] ✅ Dashboard carga en menos de 2 segundos
- [ ] ✅ Búsqueda de pacientes responde rápido
- [ ] ✅ Filtros de casos funcionan correctamente
- [ ] ✅ No hay queries N+1 en logs

## 🔄 Rollback (Si algo sale mal)

### Rollback ANTES de aplicar migración 1.5 (RLS)

Si algo falla en las migraciones 1.1 a 1.4:

```sql
-- 1. Restaurar desde backup
pg_restore -h [DB_HOST] -U postgres -d postgres backup_pre_multitenant.sql

-- 2. O revertir manualmente:
DROP TABLE IF EXISTS laboratories CASCADE;
ALTER TABLE patients DROP COLUMN IF EXISTS laboratory_id;
ALTER TABLE medical_records_clean DROP COLUMN IF EXISTS laboratory_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS laboratory_id;
ALTER TABLE change_logs DROP COLUMN IF EXISTS laboratory_id;
-- ... repetir para todas las tablas
```

### Rollback DESPUÉS de aplicar migración 1.5 (RLS)

⚠️ **MÁS DIFÍCIL** - Requiere recrear policies antiguas:

```sql
-- Eliminar policies multi-tenant
DROP POLICY IF EXISTS "Users can view their laboratory patients" ON patients;
-- ... repetir para todas

-- Restaurar policies antiguas (USING true)
CREATE POLICY "Authenticated users can view patients"
ON patients FOR SELECT TO authenticated USING (true);
-- ... repetir para todas las tablas
```

**RECOMENDACIÓN**: Si falla la migración 1.5, mejor hacer restore completo del
backup.

## 📞 Soporte y Contacto

Si encuentras problemas durante la migración:

1. **NO continuar** con las siguientes migraciones
2. Revisar los logs de error en Supabase Dashboard
3. Ejecutar las queries de verificación para identificar el problema
4. Si es crítico, restaurar desde backup

## 🎯 Próximos Pasos (Después de la migración)

Una vez que las migraciones estén aplicadas:

1. ✅ Actualizar código del frontend (Fase 2)

   - Crear `LaboratoryContext`
   - Crear `FeatureGuard` component
   - Actualizar servicios de Supabase
   - Actualizar tipos TypeScript

2. ✅ Testing exhaustivo con usuarios reales

3. ✅ Documentar proceso de onboarding de nuevos laboratorios

4. ✅ Configurar monitoreo y alertas

## 📚 Referencias

- [Supabase Multi-tenancy Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Plan completo en `.cursorrules`

---

**Última actualización**: 2025-10-24  
**Versión**: 1.0  
**Estado**: Listo para aplicar en desarrollo
