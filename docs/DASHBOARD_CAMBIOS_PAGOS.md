# Cambios en solhub_dashboard: "Marcar como pagado"

Contexto para aplicar en el **proyecto solhub_dashboard** después de la migración `20260311100000_mark_paid_advance_one_period` en Solhub_prod.

## Resumen del cambio de lógica

- **Regla actual:** Al marcar como pagado, **next_payment_date** = **fecha actual de vencimiento + 1 período** (1 mes si es mensual, 1 semana si es semanal, 1 año si es anual). Ejemplo: 08/04/2026 → 08/05/2026. **renewal_day_of_month** no se modifica.
- **Importante:** Si el admin marca como pagado **otra vez por error**, se sumará **otro** período. El dashboard debe avisar de esto (tooltip o modal de confirmación).

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

- Asegurarse de que la migración **20260311100000_mark_paid_advance_one_period.sql** esté aplicada en Supabase antes de desplegar los cambios del dashboard.

## Comportamiento esperado tras el cambio

- Cliente con **next_payment_date = 08/04/2026** (venció el 8 de abril). El admin marca como pagado el 15 de abril:
  - **next_payment_date** pasa a **08/05/2026** (fecha que venció + 1 mes).
  - **renewal_day_of_month** no se modifica.

## Texto sugerido para tooltip o modal (dashboard)

- **Tooltip del botón:**  
  *"Marcar como pagado (reactivará). La próxima fecha de vencimiento avanzará un período. Si marcas otra vez por error, se sumará otro período."*

- **Modal de confirmación:**  
  *"¿Confirmar pago? La próxima fecha de vencimiento será [mostrar fecha devuelta por la RPC]. Ten en cuenta que cada vez que marques como pagado se avanzará un período."*
