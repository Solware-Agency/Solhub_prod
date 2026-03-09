# Recordatorios de pólizas (aseguradoras) – Guía para backend

Documento para quien configure el envío de recordatorios por email (cron, n8n, Edge Function, etc.).

---

## 1. Objetivo

Enviar correos a los asegurados (o al laboratorio) cuando una póliza está por vencer o ya venció, en ventanas fijas: **30 días**, **14 días**, **7 días**, **el día del vencimiento** y **después del vencimiento** (post).

---

## 2. Tabla y campos relevantes

**Tabla:** `polizas` (Supabase, filtrada por `laboratory_id` y `activo = true`).

### Fechas para calcular “días restantes”

| Campo | Tipo | Uso |
|-------|------|-----|
| `fecha_vencimiento` | date | Fecha de vencimiento contractual de la póliza. |
| `fecha_prox_vencimiento` | date (nullable) | Próximo vencimiento (renovación/ciclo). Si existe, **usar esta** para las ventanas de recordatorio; si es NULL, usar `fecha_vencimiento`. |

**Fecha de referencia para recordatorios:**  
`fecha_referencia = fecha_prox_vencimiento ?? fecha_vencimiento`

**Días restantes:**  
`dias_restantes = (fecha_referencia - hoy)` en días (entero).  
- &gt; 0 = aún no vence  
- 0 = vence hoy  
- &lt; 0 = ya venció

### Flags de envío (evitar duplicados)

Cada vez que se envía un recordatorio de un tipo, se debe marcar el flag correspondiente en esa póliza:

| Campo | Cuándo marcar `true` |
|-------|------------------------|
| `alert_30_enviada` | Se envió recordatorio “a 30 días”. |
| `alert_14_enviada` | Se envió recordatorio “a 14 días”. |
| `alert_7_enviada` | Se envió recordatorio “a 7 días”. |
| `alert_dia_enviada` | Se envió recordatorio “vence hoy” (día 0). |
| `alert_post_enviada` | Se envió al menos un recordatorio “post-vencimiento”. |

Opcionalmente se pueden usar para auditoría:

- `ultima_alerta` (timestamptz)
- `alert_type_ultima` (text, ej. `"30"`, `"14"`, `"7"`, `"dia"`, `"post"`)
- `alert_cycle_id` (text, para agrupar envíos por ciclo si aplica)

### Reseteo de flags

Cuando la póliza se **renueva** (nueva prima, nuevo ciclo), hay que actualizar `fecha_prox_vencimiento` (y si aplica `fecha_pago_ultimo`) y **poner de nuevo en false** los flags que correspondan al nuevo ciclo (típicamente todos: `alert_30_enviada`, `alert_14_enviada`, `alert_7_enviada`, `alert_dia_enviada`, `alert_post_enviada`) para que en el próximo ciclo se vuelvan a enviar los recordatorios.

---

## 3. Ventanas de envío (reglas)

Ejecutar el job **una vez al día** (por ejemplo a las 08:00 UTC). Para cada póliza activa (`activo = true`, mismo `laboratory_id`):

1. **30 días**  
   - Condición: `dias_restantes == 30` y `alert_30_enviada = false`.  
   - Acción: enviar correo “Tu póliza vence en 30 días”, luego `UPDATE polizas SET alert_30_enviada = true, ultima_alerta = NOW(), alert_type_ultima = '30' WHERE id = ?`.

2. **14 días**  
   - Condición: `dias_restantes == 14` y `alert_14_enviada = false`.  
   - Acción: enviar correo “Vence en 14 días”, luego `alert_14_enviada = true`, etc.

3. **7 días**  
   - Condición: `dias_restantes == 7` y `alert_7_enviada = false`.  
   - Acción: enviar correo “Vence en 7 días”, luego `alert_7_enviada = true`, etc.

4. **Día del vencimiento**  
   - Condición: `dias_restantes == 0` y `alert_dia_enviada = false`.  
   - Acción: enviar correo “Vence hoy”, luego `alert_dia_enviada = true`, etc.

5. **Post-vencimiento**  
   - Condición: `dias_restantes < 0`.  
   - Acción: enviar correo “Tu póliza venció” (y opcionalmente repetir cada X días si se desea, controlando por `alert_post_enviada` o por `ultima_alerta` para no spamear).

Solo se considera **una** ventana por día por póliza (el mismo día no se envían 30 y 14; cada ventana se dispara cuando `dias_restantes` coincide y su flag aún está en false).

---

## 4. Destinatario del correo

- El email del asegurado está en la tabla **`asegurados`** (relación `polizas.asegurado_id → asegurados.id`).  
- Campo a usar: `asegurados.email`.  
- Si `email` es NULL o vacío, no enviar recordatorio para esa póliza (o registrar fallo y continuar).

---

## 5. Consultas de ejemplo (SQL)

Pólizas que **hoy** deben recibir recordatorio a 30 días (y aún no se les ha enviado):

```sql
SELECT p.id, p.numero_poliza, p.fecha_prox_vencimiento, p.fecha_vencimiento, a.email, a.full_name
FROM polizas p
JOIN asegurados a ON a.id = p.asegurado_id
WHERE p.activo = true
  AND p.laboratory_id = :laboratory_id
  AND (p.fecha_prox_vencimiento IS NOT NULL OR p.fecha_vencimiento IS NOT NULL)
  AND (COALESCE(p.fecha_prox_vencimiento, p.fecha_vencimiento)::date = (CURRENT_DATE + INTERVAL '30 days')::date)
  AND (p.alert_30_enviada = false OR p.alert_30_enviada IS NULL);
```

Análogo para 14, 7 y “vence hoy” cambiando el intervalo (`14 days`, `7 days`, `0 days`) y el flag (`alert_14_enviada`, `alert_7_enviada`, `alert_dia_enviada`).

Post-vencimiento (ej. enviar una vez cuando ya venció):

```sql
SELECT p.id, p.numero_poliza, COALESCE(p.fecha_prox_vencimiento, p.fecha_vencimiento) AS vencimiento, a.email, a.full_name
FROM polizas p
JOIN asegurados a ON a.id = p.asegurado_id
WHERE p.activo = true
  AND p.laboratory_id = :laboratory_id
  AND (COALESCE(p.fecha_prox_vencimiento, p.fecha_vencimiento)::date < CURRENT_DATE)
  AND (p.alert_post_enviada = false OR p.alert_post_enviada IS NULL);
```

(Se puede limitar a “solo el primer día después del vencimiento” con `= CURRENT_DATE - INTERVAL '1 day'` si se quiere un solo correo post.)

---

## 6. Resumen para implementar

| Qué | Dónde |
|-----|--------|
| Fecha de referencia | `COALESCE(p.fecha_prox_vencimiento, p.fecha_vencimiento)` |
| Días restantes | Fecha referencia − fecha de hoy (en días) |
| Ventanas | 30, 14, 7, 0 (día D), y &lt; 0 (post) |
| Flags a actualizar | `alert_30_enviada`, `alert_14_enviada`, `alert_7_enviada`, `alert_dia_enviada`, `alert_post_enviada` |
| Reseteo al renovar | Poner esos flags en false al actualizar `fecha_prox_vencimiento` (nuevo ciclo) |
| Email destinatario | `asegurados.email` (JOIN por `polizas.asegurado_id`) |
| Frecuencia sugerida | Un cron diario (ej. 08:00 UTC) |

Con esto el backend puede implementar el cron (n8n, Edge Function, worker, etc.) que envíe los recordatorios y actualice los flags en `polizas`.
