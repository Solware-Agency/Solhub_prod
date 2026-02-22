# Prompt para usar en el OTRO proyecto (misma base Supabase)

Copia y pega el siguiente bloque en el chat del **otro proyecto** que también usa la misma base de datos Supabase. Así la IA tendrá contexto y podrá decir qué revisar y qué código adaptar allí.

---

```
Estamos aplicando cambios de seguridad en nuestra base de datos Supabase (compartida con otro proyecto). Necesito que analices ESTE proyecto y me digas qué debo revisar y qué código hay que tocar para que todo siga funcionando después de los cambios.

CONTEXTO DE LOS CAMBIOS EN LA BASE DE DATOS:

1. **Funciones:** Ya hay una migración que fija search_path en 56 funciones (public). No requiere cambios en el código de la app.

2. **RLS en tablas que antes no lo tenían:**
   - `public.feature_catalog` – se activará RLS con políticas (quién puede SELECT/INSERT/UPDATE/DELETE).
   - `public.aseguradoras_code_counters` – igual, RLS con políticas.

3. **Políticas RLS que se van a endurecer (dejar de usar USING true / WITH CHECK true):**
   - `public.audit_logs` – política de INSERT (hoy muy permisiva).
   - `public.immuno_requests` – políticas de INSERT y UPDATE (se restringirán por laboratory_id del usuario).
   - `public.laboratories` – política de UPDATE (se restringirá: solo quien sea owner/admin del lab o superadmin).
   - `public.module_catalog` – política ALL (se restringirá según quién deba gestionar el catálogo).

4. **Vista:** `public.laboratory_stats` pasará de SECURITY DEFINER a SECURITY INVOKER (los permisos se evaluarán con el usuario que consulta, no con el dueño de la vista).

5. **Opcional:** Extensiones `unaccent` y `pg_trgm` se pueden mover al schema `extensions`; entonces cualquier uso de unaccent() o pg_trgm en funciones/vistas debe usar el schema (ej. extensions.unaccent) o un search_path que incluya extensions.

6. **Auth (Dashboard):** OTP expiry se bajará a menos de 1 hora; se activará leaked password protection. No requiere cambios de código en la app.

TAREAS QUE PIDO:

1. Busca en ESTE proyecto todas las referencias a estas tablas/vistas: feature_catalog, aseguradoras_code_counters, laboratory_stats, audit_logs, immuno_requests, laboratories, module_catalog (por ejemplo .from('...'), consultas SQL, RPC que las usen).

2. Para cada uso encontrado, indica:
   - Archivo y línea (o componente/servicio).
   - Operación (SELECT, INSERT, UPDATE, DELETE, o suscripción realtime).
   - Si envía o filtra por laboratory_id cuando sea relevante (sobre todo immuno_requests y laboratories).
   - Qué podría fallar cuando se endurezcan las políticas o se active RLS (ej. “si la política de UPDATE en laboratories exige ser owner del lab, este update desde el dashboard debe ejecutarse con un usuario que sea owner de ese lab”).

3. Lista qué hay que revisar o cambiar en ESTE proyecto para que funcione con los cambios de BD (por ejemplo: asegurar que siempre se envíe laboratory_id en inserts de immuno_requests, o que las pantallas que actualizan laboratories se usen con usuarios con rol owner/admin).

4. Si puedes, propón o aplica los cambios de código concretos en este proyecto (por ejemplo añadir laboratory_id en un insert, o un comentario donde haya que validar el rol). Si algo solo se puede resolver del lado de la BD (políticas), dilo claramente.

Responde en español. No hagas cambios en la base de datos ni en el otro proyecto; solo analiza este repo y prepara/ajusta el código aquí.
```

---

## Cómo usarlo

1. Abre el **otro proyecto** en Cursor.
2. Abre el chat y pega **solo el contenido del bloque de código** (desde "Estamos aplicando cambios..." hasta "...solo analiza este repo y prepara/ajusta el código aquí.").
3. La IA analizará ese proyecto y te dirá qué archivos tocar y qué código adaptar para que quede listo para los cambios de BD.

Así tendrás este proyecto (Solhub_prod) revisado con `docs/REVISION_CAMBIOS_BD_SEGURIDAD.md` y el otro proyecto con su propia lista de cambios y código listo.
