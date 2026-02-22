# Cómo verificar que los cambios de BD no afectaron el funcionamiento por rol

Después de aplicar las migraciones de seguridad (`fix_remaining_security_advisors.sql`), puedes comprobar por tu cuenta que cada rol sigue pudiendo hacer lo que debe. Este documento te da un **plan de verificación** manual y opcionalmente consultas SQL de solo lectura.

---

## 1. Verificación rápida en SQL (solo lectura)

Puedes ejecutar esto en el **SQL Editor** de Supabase para confirmar que las políticas y RLS están como esperas. No modifica datos.

```sql
-- Ver que RLS está activo y políticas existen en tablas tocadas por la migración
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_activo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('audit_logs', 'immuno_requests', 'laboratories', 'feature_catalog', 'module_catalog', 'aseguradoras_code_counters')
ORDER BY tablename;

-- Listar políticas actuales en esas tablas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL AS tiene_using,
  with_check IS NOT NULL AS tiene_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('audit_logs', 'immuno_requests', 'laboratories', 'feature_catalog', 'module_catalog', 'aseguradoras_code_counters')
ORDER BY tablename, policyname;

-- Vista laboratory_stats: que exista y sea security_invoker
SELECT
  c.relname AS view_name,
  c.relkind,
  CASE WHEN c.reloptions::text LIKE '%security_invoker%' THEN true ELSE false END AS security_invoker
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'laboratory_stats';
```

Si algo no coincide con lo que aplicaste (por ejemplo falta una política o RLS está off donde debería estar on), revisa la migración o el rollback.

---

## 2. Plan de verificación por rol (pruebas en la app)

Prueba con **un usuario de cada rol** (o el mismo usuario cambiando de rol en `profiles` si es entorno de prueba). Marca cada ítem cuando lo hayas comprobado.

### Rol: **owner**

| # | Acción | Cómo probar | ✓ |
|---|--------|-------------|---|
| 1 | Login y ver lab | Iniciar sesión → debe cargar el laboratorio y el menú. | |
| 2 | Ver/editar casos | Ir a Casos → ver lista, abrir un caso, editar y guardar. | |
| 3 | Actualizar config del lab | Ir a Costos de muestras (o ajustes de lab) → cambiar algo y guardar. | |
| 4 | Ver usuarios | Usuarios → ver lista y roles del laboratorio. | |
| 5 | Ver estadísticas / inmuno | Stats / tabla de inmunorreacciones → ver datos y marcar pago si aplica. | |

### Rol: **admin**

| # | Acción | Cómo probar | ✓ |
|---|--------|-------------|---|
| 1 | Login y ver lab | Igual que owner. | |
| 2 | Ver/editar casos y pacientes | Casos y Pacientes sin restricción por sede. | |
| 3 | Ver/editar usuarios | Lista de usuarios del lab. | |
| 4 | Stats e inmuno | Ver y actualizar estado de pago en inmuno si aplica. | |

### Rol: **employee** (recepcionista)

| # | Acción | Cómo probar | ✓ |
|---|--------|-------------|---|
| 1 | Login | Debe cargar el lab. | |
| 2 | Ver casos | Casos: si tiene sede asignada, solo esa sede; si no, todos del lab. | |
| 3 | Crear/editar caso | Registrar nuevo caso y editar uno existente. | |
| 4 | Pacientes | Ver y editar pacientes del lab. | |
| 5 | No debe poder | Actualizar config del laboratorio (costos/ajustes de lab) si la app lo restringe a owner/admin. | |

### Rol: **coordinador**

| # | Acción | Cómo probar | ✓ |
|---|--------|-------------|---|
| 1 | Todo lo de employee | Mismo flujo que recepcionista. | |
| 2 | Adjuntar PDF a caso | En un caso (SPT si aplica), subir/adjuntar PDF donde el rol coordinador tiene permiso. | |
| 3 | Ver casos y pacientes | Sin restricciones extra respecto a employee (según tu lógica). | |

### Rol: **laboratorio**

| # | Acción | Cómo probar | ✓ |
|---|--------|-------------|---|
| 1 | Login | Carga del lab. | |
| 2 | Ver pacientes y casos | Lectura de casos/pacientes del lab. | |
| 3 | Adjuntar PDF / enviar informes | Donde la app permite a “laboratorio” subir PDFs o marcar estados. | |

### Rol: **call_center**

| # | Acción | Cómo probar | ✓ |
|---|--------|-------------|---|
| 1 | Login y ver casos | Ver casos y enviar/visualizar según permisos. | |
| 2 | Editar datos básicos de pacientes | Donde la app lo permite a call_center. | |

### Otros roles (residente, patologo, citotecno, medico_tratante, enfermero, imagenologia, prueba)

| # | Acción | Cómo probar | ✓ |
|---|--------|-------------|---|
| 1 | Login | Carga correcta del lab. | |
| 2 | Pantallas propias del rol | Acceso a registros, casos, médicos, ajustes, etc., según lo que la app permita a cada uno. | |

---

## 3. Flujos críticos que tocan tablas modificadas por la migración

Estos flujos usan directamente las tablas/RLS que cambiaron; conviene probarlos con al menos un rol que deba poder hacerlos.

| Flujo | Tabla(s) / vista | Qué comprobar |
|-------|-------------------|----------------|
| Login y carga del lab | `laboratories` (SELECT) | Tras login, el lab se muestra y el menú carga. |
| Editar config del lab (costos, etc.) | `laboratories` (UPDATE) | Owner/admin puede guardar; si la app restringe, otros roles no. |
| Listar y marcar pago en inmunorreacciones | `immuno_requests` (SELECT, UPDATE) | Usuarios del lab ven solo su lab y pueden actualizar `pagado`/precios. |
| Crear/solicitar inmunorreacciones en un caso | `immuno_requests` (INSERT) | El registro se crea con el `laboratory_id` del usuario. |
| Auditoría (si la app muestra historial) | `audit_logs` (SELECT) | Si tienes pantalla de historial por lab, que se vean solo los del lab. |
| Triggers de auditoría | `audit_logs` (INSERT) | Al editar casos/pacientes, que no falle por RLS (el trigger inserta con `changed_by` = usuario). |

---

## 4. Si algo falla

- **Error de permisos al leer/actualizar `laboratories`:** Revisar políticas de SELECT/UPDATE en `laboratories` (que owner/admin del lab puedan; si usas dashboard con service_role, no depende de RLS).
- **Error al insertar/actualizar `immuno_requests`:** Comprobar que el usuario tenga `laboratory_id` en `profiles` y que la política permita ese `laboratory_id` para `auth.uid()`.
- **Triggers de auditoría fallan:** La política de INSERT en `audit_logs` debe permitir filas con `changed_by = auth.uid()` (o el rol que ejecuta el trigger).
- **Vista `laboratory_stats`:** Si algo la usa (p. ej. un reporte), debe ejecutarse con un usuario que tenga SELECT y que pase el RLS de las tablas base; si solo la usa el dashboard con service_role, no debería verse afectado.

Si necesitas deshacer todo: aplica la migración de rollback `20260220120000_rollback_security_advisors.sql` y vuelve a probar.

---

## 5. Resumen mínimo por rol

- **owner / admin:** Login, ver/editar lab (config), casos, pacientes, usuarios, stats, inmuno.
- **employee / coordinador:** Login, casos (y si aplica sede), pacientes, coordinador además adjuntar PDF.
- **laboratorio:** Login, ver casos/pacientes, adjuntar PDF/informes donde esté permitido.
- **call_center:** Login, ver/enviar casos, editar datos básicos de pacientes según la app.
- **Resto:** Login y las pantallas que la app asigna a cada rol.

Usando la sección 1 (SQL) verificas que el estado de la BD es el esperado; con la sección 2 (pruebas por rol) y la 3 (flujos críticos) compruebas que el comportamiento por rol no se ha visto afectado por los cambios de la BD.
