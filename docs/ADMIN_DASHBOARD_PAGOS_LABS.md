# Dashboard administrativo: gestión de pagos por laboratorio

Contexto para implementar en el **proyecto de administración** (no en Solhub_prod). En Solhub_prod solo se muestra el aviso de pago al owner; la gestión de clientes y “marcar como pagado” se hace desde el dashboard admin.

## Objetivo

Panel para superadmin/administradores de plataforma donde:

- Ver todos los laboratorios (clientes) y su estado de pago.
- Marcar "cliente pagó" y que el sistema actualice la próxima fecha de pago según un día fijo de renovación.
- Editar monto, día de renovación y próxima fecha si hace falta.

## Datos en Supabase (tabla `laboratories`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | PK |
| `name`, `slug` | text | Identificación del lab |
| `status` | text | `'active'` \| `'inactive'` \| `'trial'` |
| `next_payment_date` | date | Próxima fecha en que vence el pago |
| `payment_frequency` | text | `'monthly'` \| `'weekly'` \| `'yearly'` |
| `billing_amount` | numeric | Monto a cobrar por período, en **USD** |
| `payment_status` | text | `'current'` \| `'overdue'` |
| `renewal_day_of_month` | integer (1-31) | Día del mes de renovación (ej. 10 = siempre el 10) |
| `config` | jsonb | Incluye `defaultExchangeRate` (tasa USD → Bs) para mostrar montos en Bs |

## Regla al marcar "Pagado"

- Si el cliente paga por adelantado (ej. hoy 5, renovación día 10): se considera que pagó el período actual y la **próxima** fecha de pago debe ser el **próximo día de renovación** (ej. 10 del mes siguiente).
- Cálculo sugerido para `next_payment_date`:
  - Desde la fecha de hoy, calcular el próximo `renewal_day_of_month`.
  - Si hoy es 5 y `renewal_day_of_month = 10`: próximo 10 = 10 del mes actual → pero como “pagó este mes”, usar **10 del mes siguiente**.
  - Si hoy es 12 y día es 10: próximo = 10 del mes siguiente.
- UPDATE al confirmar pago:
  - `status = 'active'`
  - `payment_status = 'current'`
  - `next_payment_date = <fecha calculada>`
  - `updated_at = now()`

Efecto en Solhub_prod: el cliente deja de recibir avisos para el vencimiento del mes actual y pasa a recibirlos para el próximo período.

## Pantalla sugerida en el dashboard admin

1. **Listado de laboratorios**
   - Columnas: nombre, slug, status, next_payment_date, billing_amount (USD), payment_status, renewal_day_of_month.
   - Filtros: por status (activo/inactivo), por vencimiento (este mes, vencidos, etc.).

2. **Acción "Marcar como pagado"**
   - Botón por fila o en detalle del lab.
   - Al confirmar: calcular `next_payment_date` como el próximo `renewal_day_of_month` (mes siguiente si aplica) y ejecutar el UPDATE anterior.

3. **Edición por lab**
   - Poder editar: next_payment_date, billing_amount, renewal_day_of_month, payment_frequency.
   - Opcional: mostrar monto en USD y en Bs usando `config.defaultExchangeRate`.

## Integración con Solhub_prod

- Solhub_prod **solo consume** la tabla `laboratories` (y muestra el modal de aviso al owner). No tiene pantalla de listado de todos los clientes.
- El dashboard admin (este otro proyecto) es quien lista todos los labs y tiene el botón "Marcar como pagado" y la edición de fechas/montos/día de renovación.
- Ambos proyectos deben usar la misma lógica para calcular `next_payment_date` al marcar pagado (próximo día de renovación).

## Ejemplo de cálculo en SQL (próximo día X del mes)

```sql
-- renewal_day = 10, desde hoy obtener el próximo 10 (si "pagó este mes", usar mes siguiente)
-- Ejemplo: hoy 5 de marzo → next = 10 de abril
SELECT (date_trunc('month', current_date) + interval '1 month')::date + (renewal_day_of_month - 1) * interval '1 day'
  AS next_payment_date
FROM laboratories WHERE id = :lab_id;
-- Ajustar si renewal_day_of_month puede ser mayor que los días del mes (ej. 31).
```

Alternativa: si el cliente paga “hoy”, considerar que la próxima obligación es siempre el día de renovación del **mes siguiente** (o del período siguiente si es weekly/yearly).
