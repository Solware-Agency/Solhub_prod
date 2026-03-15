# Flujo para probar pólizas desde cero (recordatorios, vencimiento, marcar pagado)

Guía paso a paso para probar todo el flujo de pólizas: crear póliza, recordatorios por email, estado vencido (overdue) y marcar como pagado.

---

## 1. Requisitos previos

- **Laboratorio** con `config.timezone` (ej. `America/Caracas`). Lo usa la Edge Function para calcular “hoy”.
- **Asegurado** con **email** válido; los recordatorios se envían a `asegurados.email`. Sin email no se envía correo.
- **Aseguradora** creada.
- **Secrets de la Edge Function** `polizas-reminder`: `RESEND_API_KEY` (y opcionalmente `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME`).
- Migraciones aplicadas (columnas de cobro, RPC, crons). Ver `docs/POLIZAS_RECORDATORIOS_IMPLEMENTACION.md`.

---

## 2. Crear la póliza desde cero

1. Entra a **Pólizas** en la app (módulo aseguradoras).
2. **Nueva póliza** y completa los pasos:
   - **Asegurado**: elige uno con email.
   - **Datos póliza**: número, ramo, suma asegurada, **modalidad de pago** (Mensual/Trimestral/etc.), estatus.
   - **Fechas**:
     - **Fecha inicio** y **Fecha vencimiento** (ej. vencimiento un mes después).
     - **Día de vencimiento** (1–31), ej. `15`.
     - **Próxima fecha de vencimiento**: aquí defines la fecha que usa el sistema para recordatorios. Para probar rápido, pon una fecha que coincida con una ventana (ver tabla más abajo).
   - **Documentos**: opcional.
3. Guardar.

Al guardar, el front rellena también las columnas nuevas: `next_payment_date`, `renewal_day_of_month`, `payment_frequency`, `billing_amount`, `payment_status`. Esas son las que usan recordatorios y vencimiento.

**Comprobar en BD (opcional):**

```sql
SELECT id, numero_poliza, next_payment_date, payment_frequency, payment_status, billing_amount
FROM polizas
WHERE activo = true
ORDER BY created_at DESC
LIMIT 5;
```

---

## 3. Probar recordatorios por email

Los recordatorios se envían **solo** cuando `next_payment_date` coincide **exactamente** con una de estas fechas (calculadas con la timezone del laboratorio):

| Tipo de recordatorio | Condición (`next_payment_date` =) |
|----------------------|------------------------------------|
| "Vence en 30 días"    | Hoy + 30 días                      |
| "Vence en 14 días"   | Hoy + 14 días                      |
| "Vence en 7 días"    | Hoy + 7 días                       |
| "Vence hoy"          | Hoy                               |
| "Póliza vencida" (post) | Ayer                          |

### 3.1 Ajustar la fecha para una ventana concreta (recomendado)

Para no depender del día en que creaste la póliza, puedes fijar `next_payment_date` a la ventana que quieras probar.

**Ejemplo: hoy es 2026-03-08.**  
Para recibir el recordatorio **“Vence en 7 días”**, esa fecha debe ser “hoy + 7” = **2026-03-15**.

En SQL (reemplaza `TU_POLIZA_ID`):

```sql
-- Recordatorio "Vence en 7 días" (next_payment_date = hoy + 7 en timezone del lab)
UPDATE polizas
SET next_payment_date = (CURRENT_DATE + INTERVAL '7 days')::date
WHERE id = 'TU_POLIZA_ID';
```

Para **“Vence hoy”**:

```sql
UPDATE polizas
SET next_payment_date = CURRENT_DATE
WHERE id = 'TU_POLIZA_ID';
```

Para **“Póliza vencida” (post)**:

```sql
UPDATE polizas
SET next_payment_date = CURRENT_DATE - INTERVAL '1 day'
WHERE id = 'TU_POLIZA_ID';
```

### 3.2 Ejecutar la Edge Function a mano (sin esperar al cron)

El cron corre a las **08:15 UTC**. Para probar en el momento:

1. En Supabase: **Edge Functions** → **polizas-reminder** → **Invoke** (o usar la URL con método POST).
2. O con `curl` (sustituye `SUPABASE_URL` y `ANON_OR_SERVICE_KEY`):

```bash
curl -X POST "https://SUPABASE_URL/functions/v1/polizas-reminder" \
  -H "Authorization: Bearer ANON_OR_SERVICE_KEY" \
  -H "Content-Type: application/json"
```

La respuesta incluye `sent` (cuántos emails se enviaron) y `reminders` (por póliza: tipo de recordatorio y si se envió).

3. Revisa la bandeja del **email del asegurado** (y spam).

---

## 4. Probar “vencida” (overdue)

Cuando `next_payment_date` es **anterior a hoy**, el cron diario (00:10 UTC) pone `payment_status = 'overdue'`.

### Opción A: Esperar al cron

Deja `next_payment_date` en una fecha pasada; al día siguiente, después de las 00:10 UTC, esa póliza debería tener `payment_status = 'overdue'`.

### Opción B: Ejecutar la función a mano (SQL)

En el SQL Editor de Supabase:

```sql
SELECT process_polizas_payment_overdue();
```

Luego comprueba:

```sql
SELECT id, numero_poliza, next_payment_date, payment_status
FROM polizas
WHERE id = 'TU_POLIZA_ID';
```

Deberías ver `payment_status = 'overdue'` si `next_payment_date < CURRENT_DATE`.

---

## 5. Probar “Marcar como pagado”

1. Ve a **Pagos** (módulo aseguradoras).
2. En la sección **Pólizas** debería aparecer tu póliza (ordenada por `next_payment_date`).
3. **Marcar como pagado** (o “Registrar pago”):
   - Elige la póliza, método, monto, referencia, etc.
   - **Periodos a pagar**: 1 (o más si quieres probar varios periodos).
4. Guardar.

El flujo hace:

- Inserta en `pagos_poliza` (historial).
- Por cada período: llama a la RPC `get_next_payment_date_on_mark_paid_poliza` y actualiza la póliza con la nueva `next_payment_date` y `payment_status = 'current'`.

**Comprobar:**

- En **Historial de pagos** debe aparecer el pago.
- La póliza debe tener `next_payment_date` avanzada un período (ej. un mes si es Mensual) y `payment_status = 'current'`.

Para **varios periodos** (pagar por adelantado): en el modal elige “Periodos a pagar” = 2 (o más). Se registrará un solo pago en `pagos_poliza` pero `next_payment_date` avanzará 2 (o N) periodos.

---

## 6. Resumen del flujo de prueba sugerido

| Paso | Acción | Dónde / Cómo |
|------|--------|----------------|
| 1 | Tener lab (con timezone), asegurado con email, aseguradora | Config / datos maestros |
| 2 | Crear póliza nueva con fechas y modalidad de pago | UI Pólizas → Nueva póliza |
| 3 | (Opcional) Ajustar `next_payment_date` a “hoy+7” (o otra ventana) | SQL Editor |
| 4 | Invocar Edge Function `polizas-reminder` | Supabase UI o curl |
| 5 | Verificar email en la bandeja del asegurado | Correo |
| 6 | Poner `next_payment_date` en el pasado y ejecutar `process_polizas_payment_overdue()` | SQL |
| 7 | Verificar `payment_status = 'overdue'` en la póliza | SQL o UI Pagos |
| 8 | Desde Pagos, “Marcar como pagado” (1 o N periodos) | UI Pagos |
| 9 | Verificar nueva `next_payment_date` e historial en `pagos_poliza` | SQL o UI |

Con esto cubres: creación desde cero, recordatorios (todas las ventanas si repites el paso 3 con distintas fechas), vencimiento (overdue) y marcar como pagado (uno o varios periodos).
