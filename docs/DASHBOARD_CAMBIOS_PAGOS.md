# Cambios en solhub_dashboard: "Marcar como pagado"

Contexto para aplicar en el **proyecto solhub_dashboard** después de la migración `20260310100000_simplify_get_next_payment_date_on_mark_paid` en Solhub_prod.

## Resumen del cambio de lógica

- **Antes:** Si el lab estaba `inactive` (pagó tarde), al marcar como pagado se actualizaba `next_payment_date` a "hoy + 1 período" y `renewal_day_of_month` al día del mes en que pagó.
- **Ahora:** Siempre se usa la misma regla: `next_payment_date` = próximo día fijo (según `renewal_day_of_month` actual). **renewal_day_of_month no se modifica** al confirmar el pago.

## Qué cambiar en solhub_dashboard

### 1. Al confirmar "Marcar como pagado"

- **Seguir:** Llamar a `supabase.rpc('get_next_payment_date_on_mark_paid', { p_lab_id: labId })` y usar el `next_payment_date` devuelto.
- **Cambiar:** En el `UPDATE` a la tabla `laboratories`, **no** incluir actualización de `renewal_day_of_month`.

**Ejemplo de UPDATE correcto (TypeScript/JS):**

```ts
const { data, error } = await supabase.rpc('get_next_payment_date_on_mark_paid', { p_lab_id: labId });
if (error || !data?.[0]) { /* manejar error */ }
const { next_payment_date } = data[0];

await supabase
  .from('laboratories')
  .update({
    status: 'active',
    payment_status: 'current',
    next_payment_date,  // solo esto viene de la RPC
    updated_at: new Date().toISOString(),
    // NO incluir: renewal_day_of_month
  })
  .eq('id', labId);
```

**Quitar** cualquier línea que haga:

- `renewal_day_of_month: data[0].renewal_day_of_month_new ?? lab.renewal_day_of_month`
- o `renewal_day_of_month: COALESCE(renewal_day_of_month_new, renewal_day_of_month)`

### 2. Dónde buscar en el repo solhub_dashboard

- Buscar por: `get_next_payment_date_on_mark_paid`, `renewal_day_of_month_new`, "marcar como pagado", "mark paid", o UPDATE a `laboratories` con `payment_status` / `next_payment_date`.
- Típicamente: página o componente de listado/edición de laboratorios, modal o acción de confirmar pago.

### 3. Migración en Solhub_prod

- Asegurarse de que la migración **20260310100000_simplify_get_next_payment_date_on_mark_paid.sql** esté aplicada en Supabase (mismo proyecto que usa el dashboard) antes de desplegar los cambios del dashboard.

## Comportamiento esperado tras el cambio

- Cliente con `renewal_day_of_month = 8` que venció el 8 de abril y paga el 15 de abril:
  - **next_payment_date** pasa a **8 de mayo** (próximo día 8).
  - **renewal_day_of_month** sigue en **8** (no pasa a 15).
