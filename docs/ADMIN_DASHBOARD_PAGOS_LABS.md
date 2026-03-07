# Dashboard administrativo: gestión de pagos por laboratorio

Contexto para implementar en el **proyecto de administración** (no en Solhub_prod). En Solhub_prod solo se muestra el aviso de pago al owner; la gestión de clientes y "marcar como pagado" se hace desde el dashboard admin.

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

## Regla al marcar "Pagado" (enfoque profesional)

La próxima fecha de pago depende de si el cliente pagó **a tiempo** o **tarde** (lab ya inactivo):

1. **Lab inactivo** (`status = 'inactive'`): pagó después de las 24 h de gracia. La próxima fecha debe ser **desde el día que paga** y el **día fijo de renovación** pasa a ser el día del mes en que pagó:
   - `payment_frequency = 'monthly'` → `next_payment_date = hoy + 1 mes`
   - `payment_frequency = 'weekly'` → `next_payment_date = hoy + 1 semana`
   - `payment_frequency = 'yearly'` → `next_payment_date = hoy + 1 año`
   - `renewal_day_of_month` → actualizar al **día del mes de hoy** (ej. pagó el 15 → renewal_day_of_month = 15), para que el próximo ciclo use ese día como día fijo.

2. **Lab activo** (`status = 'active'`, al día o en gracia): pagó a tiempo o dentro de las 24 h. La próxima fecha es el **próximo día fijo de renovación** (ej. próximo 10 del mes). No se cambia `renewal_day_of_month`.

En **Solhub_prod** existe la función **`get_next_payment_date_on_mark_paid(lab_id)`** que aplica esta lógica. El dashboard admin debe usarla al confirmar el pago.

**UPDATE al confirmar pago:** llamar a `get_next_payment_date_on_mark_paid(:lab_id)`. La función devuelve dos valores: `next_payment_date` y `renewal_day_of_month_new` (este último es NULL si el lab estaba active). Actualizar:
- `status = 'active'`
- `payment_status = 'current'`
- `next_payment_date = <valor devuelto next_payment_date>`
- `renewal_day_of_month = COALESCE(<valor devuelto renewal_day_of_month_new>, renewal_day_of_month)` (si pagó tarde, renewal_day_of_month_new será el día del mes que pagó)
- `updated_at = now()`

Efecto: el cliente se reactiva; los próximos avisos serán para la nueva `next_payment_date`.

## Pantalla sugerida en el dashboard admin

1. **Listado de laboratorios**
   - Columnas: nombre, slug, status, next_payment_date, billing_amount (USD), payment_status, renewal_day_of_month.
   - Filtros: por status (activo/inactivo), por vencimiento (este mes, vencidos, etc.).

2. **Acción "Marcar como pagado"**
   - Botón por fila o en detalle del lab.
   - Al confirmar: obtener `next_payment_date` llamando a **`get_next_payment_date_on_mark_paid(lab_id)`** (RPC o SQL desde el dashboard) y ejecutar el UPDATE anterior. No uses solo `get_next_payment_date(renewal_day, today)`: la función `get_next_payment_date_on_mark_paid` ya decide si el lab pagó tarde (inactive → fecha desde hoy) o a tiempo (próximo día de renovación).

3. **Edición por lab**
   - Poder editar: next_payment_date, billing_amount, renewal_day_of_month, payment_frequency.
   - Opcional: mostrar monto en USD y en Bs usando `config.defaultExchangeRate`.

## Integración con Solhub_prod

- Solhub_prod **solo consume** la tabla `laboratories` (y muestra el modal de aviso al owner). No tiene pantalla de listado de todos los clientes.
- El dashboard admin (este otro proyecto) es quien lista todos los labs y tiene el botón "Marcar como pagado" y la edición de fechas/montos/día de renovación.
- Al marcar pagado, el dashboard debe usar la función **`get_next_payment_date_on_mark_paid(lab_id)`** para que la próxima fecha sea correcta (día fijo si pagó a tiempo, o desde hoy si pagó tarde con lab inactivo).

## Cálculo de próxima fecha y caso "último día del mes"

Si `renewal_day_of_month` es **mayor** que los días del mes destino, se usa el **último día de ese mes**. Ejemplos:

- Día 31 y mes tiene 30 días (abril, junio, etc.) → fecha = día 30 de ese mes.
- Día 30 o 31 y febrero → fecha = 28 o 29 de febrero (año bisiesto).

En **Solhub_prod** está implementada la función de base de datos `get_next_payment_date(renewal_day_of_month, from_date)` que hace este cálculo. El dashboard admin puede:

- Llamarla por RPC: `select get_next_payment_date(renewal_day_of_month, current_date) from laboratories where id = :lab_id`, o
- Replicar la misma lógica en su código usando "próximo mes + día = LEAST(renewal_day, último_día_del_mes)".

## Uso de las funciones en este proyecto (Solhub_prod)

**Al marcar "Marcar como pagado" en el dashboard admin** (recomendado):

```sql
-- Devuelve (next_payment_date, renewal_day_of_month_new). renewal_day_of_month_new solo viene cuando el lab estaba inactive.
SELECT * FROM get_next_payment_date_on_mark_paid(:lab_id);
-- Luego: UPDATE laboratories SET
--   status = 'active', payment_status = 'current',
--   next_payment_date = <next_payment_date del resultado>,
--   renewal_day_of_month = COALESCE(<renewal_day_of_month_new del resultado>, renewal_day_of_month),
--   updated_at = now()
-- WHERE id = :lab_id;
```

Si usas el cliente de Supabase: `const { data } = await supabase.rpc('get_next_payment_date_on_mark_paid', { p_lab_id: labId })` → `data` es un array con un objeto `{ next_payment_date, renewal_day_of_month_new }`. Usar esos valores en el UPDATE.

**Solo día fijo** (para edición manual o lógica legacy):

```sql
SELECT get_next_payment_date(l.renewal_day_of_month, current_date) AS next_payment_date
FROM laboratories l WHERE l.id = :lab_id;
```

`get_next_payment_date` devuelve `NULL` si `renewal_day_of_month` es `NULL` (con Opción B no debería darse).
