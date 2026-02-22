# Revisión para compatibilidad con cambios de seguridad en la BD

Este documento lista **qué revisar y qué podría tocar en este proyecto (Solhub_prod)** cuando apliques los cambios de seguridad en la base de datos (RLS, políticas, vista, etc.), para que la app siga funcionando bien.

---

## Resumen de cambios en la BD (recordatorio)

- **Ya aplicado en repo:** migración que fija `search_path` en 56 funciones (sin impacto en lógica).
- **Pendientes en BD:**
  - Activar RLS en `feature_catalog` y `aseguradoras_code_counters` (con políticas).
  - Ajustar políticas RLS “always true” en `audit_logs`, `immuno_requests`, `laboratories`, `module_catalog`.
  - Vista `laboratory_stats`: pasar a SECURITY INVOKER.
  - (Opcional) Mover extensiones `unaccent` y `pg_trgm` a schema `extensions`.
  - (Dashboard) OTP expiry, leaked password protection, upgrade Postgres.

---

## 1. Tablas que **no** usa la app (solo BD/triggers)

No hace falta cambiar código en este proyecto por:

- **feature_catalog** – solo migraciones/triggers.
- **module_catalog** – solo migraciones/triggers.
- **aseguradoras_code_counters** – solo migraciones/triggers.
- **laboratory_stats** – no hay `.from('laboratory_stats')` en `src/`.
- **audit_logs** – la app no hace SELECT/INSERT directo; lo usan triggers.

Cuando actives RLS o cambies la vista, **revisa que los triggers y funciones que escriben en esas tablas/vista sigan teniendo permiso** (p. ej. con el rol que ejecuta el trigger o con políticas que permitan ese flujo). No hay cambios de código recomendados en el frontend/servicios por estas tablas.

---

## 2. `laboratories` – qué revisar

**Uso en este proyecto:**

| Archivo | Operación | Notas |
|---------|-----------|--------|
| `src/services/supabase/laboratories/laboratories-service.ts` | SELECT + UPDATE (`config`) | Por `laboratoryId`; asume que el usuario puede leer/actualizar ese lab. |
| `src/app/providers/LaboratoryContext.tsx` | SELECT por `laboratoryId` | Carga el lab del usuario (por perfil). |
| `src/features/auth/components/LoginForm.tsx` | SELECT por `profile.laboratory_id` | Datos del lab al iniciar sesión. |
| `src/shared/hooks/useDashboardStats.ts` | SELECT por `laboratoryId` | Stats del lab. |
| `src/services/supabase/laboratories/laboratory-roles-service.ts` | SELECT | Roles del lab. |
| `src/services/supabase/laboratories/laboratory-codes-service.ts` | SELECT | Códigos del lab. |
| `src/services/supabase/auth/auth.ts` | SELECT | Lab del usuario. |
| `src/features/sample-costs/pages/SampleCostsPage.tsx` | Llama a `updateLaboratoryConfig` | Actualiza config del lab actual. |
| Otros (waiting-room, registration, patients, APIs) | SELECT por `laboratory_id` / `id` | Siempre en contexto de un lab. |

**Qué hacer:**

- Cuando endurezcas la política de UPDATE en `laboratories` (quitar “always true”):
  - La política debe permitir actualizar **al menos** cuando el usuario es owner/admin de ese lab (p. ej. `profiles.laboratory_id = laboratories.id` y `profiles.role IN ('owner','admin')`). Si tienes superadmin que puede editar cualquier lab, la política debe incluirlo (p. ej. por `role = 'superadmin'` si existe).
- **No hace falta cambiar código** si la política en BD queda alineada con “solo quien debe poder editar este lab puede hacer UPDATE”. Este proyecto ya usa siempre un `laboratoryId` que viene del contexto del usuario.

**Qué comprobar después de cambiar la política:**

- Login y carga del lab en `LaboratoryContext`.
- Página de costos de muestras: guardar cambios en config del laboratorio (`updateLaboratoryConfig`).
- Cualquier otra pantalla de “dashboard” que actualice datos del laboratorio.

---

## 3. `immuno_requests` – qué revisar

**Uso en este proyecto:**

| Archivo | Operación | Notas |
|---------|-----------|--------|
| `src/features/stats/components/ReactionsTable.tsx` | SELECT (con join), UPDATE (`pagado`, precios) | No filtra por `laboratory_id` en la query; RLS lo hará. |
| `src/features/cases/components/RequestCaseModal.tsx` | Indirecto vía `createOrUpdateImmunoRequest` | Crea/actualiza inmuno por caso. |
| `src/services/legacy/supabase-service.ts` | UPSERT, SELECT, UPDATE | **Ya envía `laboratory_id`** en el upsert (multi-tenant). |

**Qué hacer:**

- Cuando reemplaces las políticas “always true” de INSERT/UPDATE por políticas por laboratorio (p. ej. `laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())`):
  - Este proyecto **no requiere cambios**: el upsert ya manda `laboratory_id` desde el perfil; el resto de operaciones usan el usuario autenticado, y RLS filtrará por su lab.
- Asegúrate de que **todas** las inserciones/actualizaciones de `immuno_requests` en este repo (y en el otro) pasen siempre `laboratory_id` cuando la política lo exija. Aquí ya está hecho en el flujo principal.

**Qué comprobar después:**

- Solicitar inmunorreacciones desde un caso (`RequestCaseModal`).
- Listado y actualización de estado de pago y precios en `ReactionsTable`.
- Realtime de `immuno_requests` (suscription) sigue mostrando solo lo que RLS permite.

---

## 4. Checklist rápido antes de aplicar cambios en BD

- [ ] Migración de `search_path` ya aplicada (o aplicarla).
- [ ] Políticas de `laboratories`: definidas para SELECT/UPDATE (y INSERT/DELETE si aplica) sin “always true”, permitiendo al menos owner/admin del lab (y superadmin si aplica).
- [ ] Políticas de `immuno_requests`: INSERT/UPDATE restringidas por `laboratory_id`; este proyecto ya envía `laboratory_id` en el upsert.
- [ ] Tras activar RLS en `feature_catalog` y `aseguradoras_code_counters`: comprobar que triggers/funciones que las usan sigan pudiendo leer/escribir (rol o políticas adecuadas).
- [ ] Tras cambiar `laboratory_stats` a SECURITY INVOKER: si en el futuro alguien usa esta vista desde la app o un RPC, verificar que ese rol tenga SELECT y que RLS de las tablas base sea correcto.
- [ ] Probar en staging: login, carga de lab, sample costs (update config), immuno (crear, listar, marcar pago, editar precio).

---

## 5. Si algo falla después de los cambios

- **Error de permisos al leer/actualizar `laboratories`:** la política de SELECT o UPDATE es más restrictiva de lo que usa la app; revisar que la política permita al rol y al `laboratory_id` que usa este proyecto.
- **Error al insertar/actualizar `immuno_requests`:** comprobar que la fila tenga `laboratory_id` y que la política permita ese `laboratory_id` para `auth.uid()`.
- **Triggers o funciones que fallen:** suelen ser por RLS en tablas como `audit_logs`, `feature_catalog`, etc.; asegurar que el rol que ejecuta el trigger tenga política que lo permita o usar BYPASSRLS / SECURITY DEFINER donde esté justificado.

Con esto, este proyecto queda listo para que los cambios de BD se apliquen sin sorpresas; lo crítico es que las políticas en la BD coincidan con cómo la app usa `laboratories` e `immuno_requests`.
