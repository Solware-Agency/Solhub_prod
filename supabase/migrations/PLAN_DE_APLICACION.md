# 📋 Plan de Aplicación: Migración Multi-tenant

## 🎯 Objetivo

Aplicar las migraciones para convertir Solhub a multi-tenant, permitiendo que
múltiples laboratorios usen el mismo sistema de forma aislada y segura.

## ⏱️ Timeline Recomendado

### Opción A: Desarrollo Local (HOY)

**Duración**: 30-60 minutos  
**Riesgo**: Bajo  
**Recomendación**: ✅ **COMENZAR AQUÍ**

### Opción B: Staging/Producción (DESPUÉS)

**Duración**: 2-4 horas (incluye testing)  
**Riesgo**: Medio-Alto  
**Recomendación**: Solo después de validar en local

---

## 📝 Checklist Pre-Aplicación

Antes de empezar, verifica:

- [ ] ✅ Tienes backup de la base de datos
- [ ] ✅ Tienes acceso a Supabase Dashboard
- [ ] ✅ Supabase CLI instalado y configurado
- [ ] ✅ Ambiente local funcionando correctamente
- [ ] ✅ Git commit de todo el código actual
- [ ] ✅ Coordinar con el equipo (si aplica)

---

## 🚀 FASE 1: Aplicación en Desarrollo Local

### Paso 1: Preparación (5 minutos)

```bash
# 1. Asegurarte de estar en el directorio correcto
cd C:\Users\Windows\Dev\Solhub_prod

# 2. Verificar estado de Git
git status

# 3. Hacer commit de las migraciones nuevas
git add supabase/migrations/20251024*.sql
git add supabase/migrations/README_MULTITENANT_MIGRATION.md
git add supabase/migrations/TEST_MULTITENANT.sql
git add supabase/migrations/PLAN_DE_APLICACION.md
git commit -m "feat: Add multi-tenant database migrations (Phase 1)"

# 4. Verificar que Supabase local está corriendo
supabase status
```

**Resultado esperado:**

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
```

### Paso 2: Backup de desarrollo local (5 minutos)

```bash
# Crear backup de la base de datos local
supabase db dump -f backup_local_pre_multitenant.sql

# Verificar que el backup se creó
ls -l backup_local_pre_multitenant.sql
```

### Paso 3: Aplicar migraciones (5 minutos)

```bash
# Opción A: Aplicar todas las migraciones nuevas
supabase migration up

# Opción B: Reset completo (si prefieres empezar desde cero)
supabase db reset
```

**Monitorear la salida** para verificar que:

- ✅ Cada migración se aplica sin errores
- ✅ Aparecen mensajes de "✅ PASS" o similares
- ✅ No hay errores de SQL

### Paso 4: Verificar aplicación (10 minutos)

```bash
# Abrir Supabase Studio local
open http://localhost:54323

# O en Windows:
start http://localhost:54323
```

**En Supabase Studio:**

1. **Ir a Table Editor**

   - ✅ Verificar que existe tabla `laboratories`
   - ✅ Verificar que `patients` tiene columna `laboratory_id`
   - ✅ Verificar que existe registro de Conspat

2. **Ir a SQL Editor**
   - ✅ Copiar y pegar el contenido de `TEST_MULTITENANT.sql`
   - ✅ Ejecutar todo el script
   - ✅ Revisar que todos los tests pasen

### Paso 5: Testing manual (15 minutos)

```bash
# Levantar el frontend
pnpm dev
```

**Tests a realizar:**

1. ✅ Login funciona normalmente
2. ✅ Dashboard carga sin errores
3. ✅ Puedes ver pacientes existentes
4. ✅ Puedes crear nuevo paciente
5. ✅ Puedes ver casos médicos
6. ✅ Puedes crear nuevo caso
7. ✅ No hay errores 403 (Forbidden) en consola
8. ✅ No hay errores en Network tab

**Si TODO funciona**: ✅ Migración exitosa en local

**Si algo falla**: Ver sección de Troubleshooting abajo

---

## 🧪 FASE 2: Testing Avanzado (Opcional pero recomendado)

### Test 1: Crear segundo laboratorio

```sql
-- En Supabase Studio > SQL Editor

-- 1. Crear laboratorio de prueba
INSERT INTO laboratories (slug, name, status)
VALUES ('labtest', 'Laboratorio Test', 'active')
RETURNING *;

-- GUARDAR EL ID QUE SE RETORNA
```

### Test 2: Crear usuario en segundo laboratorio

```sql
-- 2. Crear usuario de prueba en Auth primero
-- Ir a Authentication > Users > Add User
-- Email: test@labtest.com
-- Password: Test123456!

-- 3. Asignar ese usuario al laboratorio test
-- (Reemplazar los UUIDs con los reales)
UPDATE profiles
SET laboratory_id = 'UUID_DEL_LAB_TEST'
WHERE id = 'UUID_DEL_USUARIO_TEST';
```

### Test 3: Verificar aislamiento

1. **Login como usuario de Conspat**

   - ✅ Debe ver todos los pacientes de Conspat
   - ✅ NO debe ver pacientes de Lab Test

2. **Logout y login como usuario de Lab Test**

   - ✅ NO debe ver pacientes de Conspat
   - ✅ Solo ve pacientes de Lab Test (ninguno por ahora)
   - ✅ Puede crear pacientes en Lab Test

3. **Intentar "hackear" el sistema**

   ```typescript
   // En la consola del navegador, intentar:
   const { data } = await supabase
     .from('patients')
     .select('*')
     .eq('laboratory_id', 'UUID_DE_CONSPAT'); // Lab diferente

   // ✅ Debe retornar array vacío o error 403
   ```

**Si el aislamiento funciona**: ✅ Multi-tenancy está seguro

---

## 🎉 FASE 3: Commit y Push (si todo OK)

```bash
# Si todas las pruebas pasaron:

# 1. Crear branch para la migración
git checkout -b feature/multitenant-migration-phase1

# 2. Hacer commit final
git add .
git commit -m "test: Verify multi-tenant migrations work correctly"

# 3. Push a remote
git push origin feature/multitenant-migration-phase1

# 4. Crear Pull Request
# Documentar resultados de testing en el PR
```

---

## 🚨 Troubleshooting

### Error: "column laboratory_id does not exist"

**Causa**: La migración no se aplicó correctamente

**Solución**:

```bash
# Ver qué migraciones están aplicadas
supabase migration list

# Aplicar manualmente la migración faltante
supabase migration up
```

### Error: "null value in column laboratory_id violates not-null constraint"

**Causa**: Intentaste insertar sin laboratory_id

**Solución**: Los triggers deberían manejarlo automáticamente. Verificar:

```sql
-- Ver si los triggers existen
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%validate_laboratory_id%';
```

### Error: 403 Forbidden en queries

**Causa**: Las RLS policies están bloqueando el acceso

**Solución temporal** (solo en desarrollo):

```sql
-- Temporalmente deshabilitar RLS para debug
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;

-- IMPORTANTE: Re-habilitar después
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
```

### Frontend no carga / Errores en consola

**Causa**: El frontend aún no está actualizado para multi-tenant

**Solución**: Las migraciones están diseñadas para ser compatibles con el
frontend actual. Revisar:

1. ✅ Que los triggers validate_laboratory_id existen
2. ✅ Que el usuario tiene laboratory_id en su profile
3. ✅ Que las RLS policies permiten acceso con laboratory_id

---

## 📊 Métricas de Éxito

Después de aplicar las migraciones, deberías ver:

| Métrica                     | Valor Esperado | ✓   |
| --------------------------- | -------------- | --- |
| Laboratorios creados        | 1 (Conspat)    | [ ] |
| Pacientes con laboratory_id | 100%           | [ ] |
| Casos con laboratory_id     | 100%           | [ ] |
| Usuarios con laboratory_id  | 100%           | [ ] |
| RLS Policies multi-tenant   | 16+            | [ ] |
| Tests pasados               | 12/12          | [ ] |
| Errores en frontend         | 0              | [ ] |
| Performance dashboard       | <2s            | [ ] |

---

## 🎯 Siguientes Pasos (Después de validar)

1. ✅ **Fase 1 completa**: Migraciones aplicadas
2. 🔄 **Fase 2**: Actualizar código del frontend
   - Crear `LaboratoryContext`
   - Crear `FeatureGuard`
   - Actualizar servicios Supabase
   - Actualizar tipos TypeScript
3. 🔄 **Fase 3**: Deploy a staging
4. 🔄 **Fase 4**: Testing con usuarios reales
5. 🔄 **Fase 5**: Deploy a producción

---

## 📞 Contacto

Si encuentras problemas o tienes dudas:

1. Revisar logs en Supabase Studio
2. Ejecutar `TEST_MULTITENANT.sql` para diagnóstico
3. Revisar documentación en `.cursorrules`
4. Considerar rollback si es crítico

---

## ✅ Checklist Final

Antes de considerar la Fase 1 completa:

- [ ] ✅ Todas las migraciones aplicadas sin errores
- [ ] ✅ Script TEST_MULTITENANT.sql pasa todos los tests
- [ ] ✅ Frontend funciona normalmente (login, dashboard, CRUD)
- [ ] ✅ Segundo laboratorio de prueba creado y aislado
- [ ] ✅ No hay errores en consola del navegador
- [ ] ✅ Performance es aceptable (<2s dashboard)
- [ ] ✅ Backup de la base de datos guardado
- [ ] ✅ Código commiteado en Git
- [ ] ✅ Documentación actualizada

**Si todos los checks están completos**: 🎉 **¡FASE 1 COMPLETADA!**

---

**Última actualización**: 2025-10-24  
**Versión**: 1.0  
**Estado**: Listo para ejecutar
