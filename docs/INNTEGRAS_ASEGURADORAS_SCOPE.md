## Alcance: Módulo Aseguradoras (Inntegras)

### Objetivo
Implementar el vertical de aseguradoras para el laboratorio Inntegras, con rutas y UI
propias bajo `/aseguradoras`, aislado por `laboratory_id` y visible solo para Inntegras.

### Roles y acceso
- Roles con acceso: `employee`, `owner`, `prueba`.
- Guard por `laboratory.slug === 'inntegras'` (feature flag `hasAseguradoras` se añade después).

### Rutas del módulo
- `/aseguradoras/home`
- `/aseguradoras/asegurados`
- `/aseguradoras/polizas`
- `/aseguradoras/pagos`
- `/aseguradoras/recordatorios`
- `/aseguradoras/documentos`

### Tablas nuevas (Supabase)

#### `asegurados`
- id (uuid, PK)
- laboratory_id (uuid, FK → laboratories.id)
- full_name (text, requerido)
- document_id (text, requerido)
- phone (text, requerido)
- email (text, requerido si hay recordatorios)
- address (text, opcional)
- notes (text, opcional)
- tipo_asegurado (text: "Persona natural" | "Persona jurídica")
- created_at, updated_at

#### `aseguradoras`
- id (uuid, PK)
- laboratory_id (uuid, FK → laboratories.id)
- nombre (text, requerido)
- codigo_interno (text, opcional)
- rif (text, opcional)
- telefono (text, opcional)
- email (text, opcional)
- web (text, opcional)
- direccion (text, opcional)
- activo (boolean, default true)
- created_at, updated_at

#### `polizas`
- id (uuid, PK)
- laboratory_id (uuid, FK → laboratories.id)
- asegurado_id (uuid, FK → asegurados.id)
- aseguradora_id (uuid, FK → aseguradoras.id)
- agente_nombre (text, requerido)
- codigo_legacy (text, opcional)
- numero_poliza (text, requerido)
- ramo (text, requerido)
- suma_asegurada (numeric, opcional)
- modalidad_pago (text: Mensual | Trimestral | Semestral | Anual)
- estatus_poliza (text: Activa | En emisión | Renovación pendiente | Vencida)
- estatus_pago (text: Pagado | Parcial | Pendiente | En mora)
- estatus (text: activa | por_vencer | vencida)
- fecha_inicio (date, requerido)
- fecha_vencimiento (date, requerido)
- dia_vencimiento (int, opcional)
- fecha_prox_vencimiento (date, opcional/admin)
- dias_prox_vencimiento (int, opcional/admin)
- tipo_alerta (text)
- dias_alerta (int)
- dias_frecuencia (int)
- dias_frecuencia_post (int)
- dias_recordatorio (int)
- alert_30_enviada (boolean)
- alert_14_enviada (boolean)
- alert_7_enviada (boolean)
- alert_dia_enviada (boolean)
- alert_post_enviada (boolean)
- ultima_alerta (text or timestamptz)
- alert_type_ultima (text)
- alert_cycle_id (text)
- fecha_pago_ultimo (date)
- fecha_pago_ultimo_backup (date)
- pdf_url (text)
- notas (text)
- created_at, updated_at

#### `pagos_poliza`
- id (uuid, PK)
- poliza_id (uuid, FK → polizas.id)
- laboratory_id (uuid, FK → laboratories.id)
- fecha_pago (date)
- monto (numeric)
- metodo_pago (text)
- banco (text)
- referencia (text)
- documento_pago_url (text)
- notas (text)
- created_at, updated_at

### Formularios (UI)

#### Asegurado
- tipo_asegurado, full_name, document_id, phone, email, address, notes.

#### Aseguradora
- nombre, codigo_interno, rif, telefono, email, web, direccion, activo.

#### Póliza (wizard)
- Paso A: seleccionar/crear asegurado (autocomplete).
- Paso B: datos básicos póliza.
- Paso C: fechas y vencimientos.
- Paso D: recordatorios (avanzado/admin).
- Paso E: documentos y notas.

### Recordatorios (n8n)
- Cron diario: consultar pólizas por vencer (30, 14, 7, día D, post).
- Enviar correos y actualizar flags `alert_*_enviada`.
## Fuera de este repo
- Configurar workflows n8n.
- Ejecución de migración de datos históricos en Supabase.
