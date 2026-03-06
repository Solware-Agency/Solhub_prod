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

## Opción B: Día de renovación obligatorio

Se exige **siempre** un día de renovación. Al crear o editar un laboratorio, `renewal_day_of_month` es **obligatorio** (valor entre 1 y 31); no se permite `NULL`. Así "Marcar como pagado" puede calcular siempre la próxima fecha con la regla del día X sin casos especiales.

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

## Cálculo de próxima fecha y caso "último día del mes"

Si `renewal_day_of_month` es **mayor** que los días del mes destino, se usa el **último día de ese mes**. Ejemplos:

- Día 31 y mes tiene 30 días (abril, junio, etc.) → fecha = día 30 de ese mes.
- Día 30 o 31 y febrero → fecha = 28 o 29 de febrero (año bisiesto).

En **Solhub_prod** está implementada la función de base de datos `get_next_payment_date(renewal_day_of_month, from_date)` que hace este cálculo. El dashboard admin puede:

- Llamarla por RPC: `select get_next_payment_date(renewal_day_of_month, current_date) from laboratories where id = :lab_id`, o
- Replicar la misma lógica en su código usando "próximo mes + día = LEAST(renewal_day, último_día_del_mes)".

## Uso de la función en este proyecto (Solhub_prod)

```sql
-- Obtener la próxima fecha de pago para un lab (desde hoy; respeta 28/29/30/31 días)
SELECT get_next_payment_date(l.renewal_day_of_month, current_date) AS next_payment_date
FROM laboratories l WHERE l.id = :lab_id;
```

La función devuelve `NULL` si `renewal_day_of_month` es `NULL` (con Opción B no debería darse).
