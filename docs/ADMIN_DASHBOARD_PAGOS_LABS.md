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

## Regla al marcar "Pagado" (avanzar un período)

**Cada vez** que se marca como pagado, la próxima fecha de vencimiento **avanza un período** desde la fecha actual de vencimiento:

- **next_payment_date** = **next_payment_date actual + 1 período** (1 mes si es mensual, 1 semana si es semanal, 1 año si es anual). Ejemplo: si la próxima fecha era 08/04/2026, al marcar pagado pasa a 08/05/2026.
- **renewal_day_of_month** = **no se modifica** al confirmar el pago.

**Importante:** Si el admin marca como pagado **otra vez por error**, se sumará **otro** período (ej. otro mes). El dashboard debería avisar de esto en tooltip o en el modal de confirmación.

En **Solhub_prod** existe la función **`get_next_payment_date_on_mark_paid(lab_id)`** que devuelve esa próxima fecha. El dashboard admin debe usarla al confirmar el pago.

**UPDATE al confirmar pago:** llamar a `get_next_payment_date_on_mark_paid(:lab_id)`. La función devuelve `next_payment_date` y `renewal_day_of_month_new` (siempre NULL). Actualizar:
- `status = 'active'`
- `payment_status = 'current'`
- `next_payment_date = <valor devuelto next_payment_date>`
- **No actualizar** `renewal_day_of_month`.

Efecto: el cliente se reactiva; la próxima fecha de pago queda un período más adelante. Si no había fecha actual, se usa el próximo día fijo de renovación desde hoy.

## Pantalla sugerida en el dashboard admin

1. **Listado de laboratorios**
   - Columnas: nombre, slug, status, next_payment_date, billing_amount (USD), payment_status, renewal_day_of_month.
   - Filtros: por status (activo/inactivo), por vencimiento (este mes, vencidos, etc.).

2. **Acción "Marcar como pagado"**
   - Botón por fila o en detalle del lab.
   - Al confirmar: obtener `next_payment_date` llamando a **`get_next_payment_date_on_mark_paid(lab_id)`** (RPC o SQL desde el dashboard) y ejecutar el UPDATE anterior. La función devuelve la fecha actual de vencimiento + 1 período; no actualices `renewal_day_of_month`. Mostrar aviso: "Cada vez que marques como pagado se avanzará un período; si marcas otra vez por error se sumará otro."

3. **Edición por lab**
   - Poder editar: next_payment_date, billing_amount, renewal_day_of_month, payment_frequency.
   - Opcional: mostrar monto en USD y en Bs usando `config.defaultExchangeRate`.

## Integración con Solhub_prod

- Solhub_prod **solo consume** la tabla `laboratories` (y muestra el modal de aviso al owner). No tiene pantalla de listado de todos los clientes.
- El dashboard admin (este otro proyecto) es quien lista todos los labs y tiene el botón "Marcar como pagado" y la edición de fechas/montos/día de renovación.
- Al marcar pagado, el dashboard debe usar la función **`get_next_payment_date_on_mark_paid(lab_id)`** para obtener la próxima fecha (fecha actual de vencimiento + 1 período). No se actualiza `renewal_day_of_month`. Avisar al usuario que cada "marcar como pagado" avanza un período.

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
-- Devuelve (next_payment_date, renewal_day_of_month_new). renewal_day_of_month_new es siempre NULL.
SELECT * FROM get_next_payment_date_on_mark_paid(:lab_id);
-- Luego: UPDATE laboratories SET
--   status = 'active', payment_status = 'current',
--   next_payment_date = <next_payment_date del resultado>,
--   updated_at = now()
-- WHERE id = :lab_id;
-- (renewal_day_of_month no se modifica)
```

Si usas el cliente de Supabase: `const { data } = await supabase.rpc('get_next_payment_date_on_mark_paid', { p_lab_id: labId })` → `data` es un array con un objeto `{ next_payment_date, renewal_day_of_month_new }`. Usar solo `next_payment_date` en el UPDATE; no actualizar `renewal_day_of_month`.

**Solo día fijo** (para edición manual o lógica legacy):

```sql
SELECT get_next_payment_date(l.renewal_day_of_month, current_date) AS next_payment_date
FROM laboratories l WHERE l.id = :lab_id;
```

`get_next_payment_date` devuelve `NULL` si `renewal_day_of_month` es `NULL` (con Opción B no debería darse).

---

## Cambios en el proyecto solhub_dashboard (contexto para el otro repo)

Si en **solhub_dashboard** ya existe la acción "Marcar como pagado" para laboratorios, hay que ajustar el UPDATE al confirmar el pago:

1. **Seguir llamando** a la RPC `get_next_payment_date_on_mark_paid` con el `lab_id` para obtener `next_payment_date`.
2. **Al hacer el UPDATE** en `laboratories`:
   - Actualizar: `status = 'active'`, `payment_status = 'current'`, `next_payment_date = <valor de la RPC>`, `updated_at = now()`.
   - **No actualizar** la columna `renewal_day_of_month` (eliminar cualquier línea que haga `renewal_day_of_month = COALESCE(renewal_day_of_month_new, renewal_day_of_month)` o similar al confirmar el pago). La RPC sigue devolviendo `renewal_day_of_month_new` por compatibilidad, pero siempre es `NULL`; el día de renovación del mes no debe cambiar al marcar como pagado.

Ver también `docs/DASHBOARD_CAMBIOS_PAGOS.md` en este repo para el checklist de cambios en el dashboard.

**Texto sugerido para tooltip o modal (aviso "avanzar un período"):**  
Tooltip: *"Marcar como pagado (reactivará). La próxima fecha de vencimiento avanzará un período. Si marcas otra vez por error, se sumará otro período."*  
Modal: *"¿Confirmar pago? La próxima fecha de vencimiento será [fecha]. Cada vez que marques como pagado se avanzará un período."*
