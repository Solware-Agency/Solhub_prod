# Flujo de pólizas: cómo funciona y qué datos tiene el front

Explicación de cómo funciona todo el sistema de recordatorios y cobros de pólizas **ahora mismo**, y qué datos puedes usar en el front.

---

## 1. Modelo de datos (lo que hay en BD)

### Tabla `polizas`

Tienes **columnas nuevas** (las que usan el cron y la Edge Function) y **columnas legacy** (las que ya existían). Ambas conviven en transición.

| Columna | Tipo | Uso | Quién la usa |
|--------|------|-----|--------------|
| **next_payment_date** | date | Fecha de referencia para recordatorios (30/14/7 días, vence hoy, post) | Cron/Edge Function + **front para mostrar “próximo vencimiento”** |
| **renewal_day_of_month** | integer (1-31) | Día del mes de renovación; no cambia al marcar pagado | **Front** (opcional, para mostrar “renueva el día X”) |
| **payment_frequency** | text | `monthly`, `quarterly`, `semiannual`, `yearly` | Cron/Edge no lo usan para ventanas; **front** para mostrar “pago mensual/trimestral…” y para la RPC al marcar pagado |
| **billing_amount** | numeric | Monto a cobrar por período (ej. prima en USD) | Edge Function lo pone en el email; **front** para mostrar monto |
| **payment_status** | text | `current` \| `overdue` | **Front** para badges/filtros (“Al día” / “En mora”) |

Columnas legacy que siguen ahí (transición):

- `fecha_vencimiento`, `fecha_prox_vencimiento`, `dia_vencimiento`, `modalidad_pago`, `estatus_pago`, etc.

El backfill ya rellenó las 5 nuevas desde las legacy. Puedes leer **solo las nuevas** en el front y dejar de depender de las legacy cuando quieras.

### Relaciones

- **polizas.asegurado_id** → `asegurados.id` (nombre, email para recordatorios).
- **polizas.laboratory_id** → `laboratories.id` (nombre del lab, timezone para “hoy” en recordatorios).

---

## 2. Cómo funciona el flujo **ahora mismo**

### 2.1 Recordatorios por email (automático)

1. **Cron** (todos los días a las 08:15 UTC): dispara la Edge Function `polizas-reminder`.
2. **Edge Function**:
   - Lee `polizas` con `activo = true` y `next_payment_date` no null.
   - Para cada lab obtiene la timezone (`laboratories.config.timezone` o `America/Caracas`).
   - Calcula “hoy” en esa timezone.
   - Para cada póliza compara `next_payment_date` con:
     - hoy + 30 → envía “Vence en 30 días”
     - hoy + 14 → “Vence en 14 días”
     - hoy + 7 → “Vence en 7 días”
     - hoy → “Vence hoy”
     - ayer → “Póliza vencida” (post, una sola vez)
   - Envía **un solo** correo por póliza por día (el que coincida con una ventana).
   - Destinatario: `asegurados.email` (si está vacío, no envía y no falla).

No hay flags: la decisión es solo por la **fecha del día** y `next_payment_date`. El front no interviene en este flujo.

### 2.2 Marcar como pagado (cuando lo implementes en el front)

Hoy la **lógica en BD ya está**; el front solo tiene que llamarla y actualizar:

1. Usuario hace “Marcar como pagado” en una póliza.
2. Front llama la RPC:
   ```ts
   const { data } = await supabase.rpc('get_next_payment_date_on_mark_paid_poliza', { p_poliza_id: polizaId })
   ```
3. Si `data?.[0]?.next_payment_date` existe:
   - Front hace `UPDATE polizas SET next_payment_date = data[0].next_payment_date, payment_status = 'current' WHERE id = polizaId`.
   - (Opcional) Actualizar también `fecha_prox_vencimiento` y `estatus_pago` para no romper pantallas que aún usen legacy.
4. La próxima vez que corra el cron, esa póliza ya tendrá la nueva fecha y entrará en las ventanas 30/14/7/hoy/post según corresponda.

Si se marca como pagado otra vez por error, se vuelve a sumar un período (ej. un mes). El front puede avisar de eso.

---

## 3. Qué datos puedes sacar para el front (con lo que hay ahora)

Todo esto lo puedes hacer **ya** con consultas normales a Supabase (con RLS del lab del usuario).

### 3.1 Listado de pólizas (cards, tabla, filtros)

Puedes leer de `polizas` (y opcionalmente de `asegurados` y `laboratories`):

- **Identificación**: `id`, `numero_poliza`, `activo`.
- **Para mostrar “próximo pago”**: `next_payment_date`.
- **Para estado de pago**: `payment_status` (`current` / `overdue`) → badges “Al día” / “En mora”.
- **Para monto**: `billing_amount`.
- **Para texto “Renueva el día X”**: `renewal_day_of_month`.
- **Para “Pago mensual/trimestral…”**: `payment_frequency` (puedes mapear a etiquetas: monthly → “Mensual”, quarterly → “Trimestral”, etc.).

Ejemplo de query (ajustando a tu lab y permisos):

```ts
const { data: polizas } = await supabase
  .from('polizas')
  .select(`
    id,
    numero_poliza,
    activo,
    next_payment_date,
    renewal_day_of_month,
    payment_frequency,
    billing_amount,
    payment_status,
    asegurado_id,
    asegurados ( full_name, email )
  `)
  .eq('activo', true)
  .order('next_payment_date', { ascending: true })
```

Con eso en el front puedes:

- Mostrar “Próximo pago: 15/04/2026”, “Al día” / “En mora”, “120 USD”, “Mensual”, “Renueva el día 15”.
- Filtrar por `payment_status = 'overdue'` para una vista “En mora”.
- Ordenar por `next_payment_date` para ver las que vencen antes.

### 3.2 Detalle de una póliza

Misma idea: los mismos campos de `polizas` + lo que necesites de `asegurados` (nombre, email) para mostrar “Asegurado” y “Email para recordatorios”.

### 3.3 “Días hasta el próximo pago”

Lo calculas en el front con la **fecha del cliente** (o la del lab si la tienes):

- `next_payment_date` ya está en la póliza.
- “Hoy” lo puedes obtener en el timezone del lab (si tienes `laboratories.config.timezone`) o en el timezone del navegador.
- Diferencia en días = `next_payment_date - hoy` → “Vence en X días” o “Venció hace X días”.

### 3.4 Marcar como pagado (cuando lo implementes)

- **Input**: `poliza_id`.
- **Llamada**: `supabase.rpc('get_next_payment_date_on_mark_paid_poliza', { p_poliza_id: poliza_id })`.
- **Output**: `data[0].next_payment_date` (nueva fecha).
- **Acción en BD**: `UPDATE polizas SET next_payment_date = ..., payment_status = 'current' WHERE id = poliza_id`.

No hay más datos que “sacar” para el front: la RPC solo devuelve la nueva fecha; el estado lo actualizas tú en `polizas`.

---

## 4. Resumen en una tabla (qué hace cada parte)

| Parte | Qué hace ahora | Datos que usa / produce |
|-------|----------------|--------------------------|
| **Cron polizas-overdue-daily** | Cada día 00:10 UTC ejecuta `process_polizas_payment_overdue()`: marca `payment_status = 'overdue'` donde `next_payment_date` ya pasó | Actualiza `polizas.payment_status` |
| **Cron polizas-reminder** | Cada día 08:15 UTC llama a la Edge Function `polizas-reminder` | No lee nada del front |
| **Edge Function** | Lee pólizas activas con `next_payment_date`, compara con hoy (timezone del lab), envía un email por ventana (30/14/7/hoy/post) al `asegurados.email` | Lee: `polizas`, `asegurados`, `laboratories` |
| **RPC get_next_payment_date_on_mark_paid_poliza** | Dado un `poliza_id`, devuelve la nueva `next_payment_date` (actual + 1 período) | Lee: `polizas.next_payment_date`, `polizas.payment_frequency` |
| **Front (listado/detalle)** | Puede leer y mostrar: `next_payment_date`, `payment_status`, `billing_amount`, `renewal_day_of_month`, `payment_frequency`, y asegurado (nombre, email) | Tabla `polizas` (+ join `asegurados`) |
| **Front (“Marcar pagado”)** | Cuando lo implementes: llamar RPC + `UPDATE next_payment_date` y `payment_status = 'current'` | RPC + `polizas` |

---

## 5. Cómo sirve todo “ahora mismo” (en una frase)

- **Backend**: Un cron a las 00:10 UTC actualiza `payment_status` a `overdue` cuando `next_payment_date` ya pasó; otro cron a las 08:15 UTC y la Edge Function envían los recordatorios por email. No hace falta que el front haga nada para eso.
- **Datos para el front**: En `polizas` tienes ya todo lo necesario para listados, detalle, badges (Al día/En mora), montos, frecuencias y “próximo pago”; y con la RPC + un `UPDATE` tendrás “Marcar como pagado” cuando lo implementes en el front.

Cuando quieras, podemos bajar al detalle de una pantalla concreta (por ejemplo listado de pólizas o botón “Marcar como pagado”) y definir exactamente qué campos usar y cómo mostrarlos.
