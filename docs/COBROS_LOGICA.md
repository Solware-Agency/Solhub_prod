## 1. Datos del lab (ejemplo: solhub-demo)

En la tabla **`laboratories`** cada lab tiene (entre otros):

| Campo | Ejemplo solhub-demo | Uso |
|-------|----------------------|-----|
| **slug** | `solhub-demo` | Identificador |
| **status** | `active` / `inactive` | Activo = se puede usar; inactivo = bloqueo total |
| **next_payment_date** | ej. `2026-04-06` | Fecha del próximo vencimiento |
| **payment_status** | `current` / `overdue` | Al día o en ventana de 24 h tras vencer |
| **payment_frequency** | `monthly` / `weekly` / `yearly` | Período de cobro |
| **billing_amount** | ej. `150` (USD) | Monto que se muestra en avisos y correos |
| **renewal_day_of_month** | ej. `6` (1–31) | Día fijo de renovación (para “marcar como pagado”) |
| **config.timezone** | `America/Caracas` | Zona para “hoy” en avisos y correos |
| **config.defaultExchangeRate** | opcional | Tasa de respaldo si falla la API |

Si **next_payment_date** es NULL, ese lab no entra en recordatorios ni en overdue/inactive.

---

## 2. Crons (qué corre y cuándo)

Todo en la **misma base de datos** (Supabase). Horarios en UTC; entre paréntesis, hora Caracas (UTC-4).

| Cron | Horario | Qué hace |
|------|---------|----------|
| **payment-overdue-and-inactive-daily** | **04:05 UTC** (00:05 Caracas) | 1) Labs con `next_payment_date` = **ayer** → `payment_status = 'overdue'`. 2) Labs con `next_payment_date` **antes de ayer** → `status = 'inactive'`. |
| **payment-reminder-daily** | **08:00 UTC** (04:00 Caracas) | Llama por HTTP a la Edge Function **payment-reminder**. |

“Ayer” y “hoy” del cron se calculan con la **fecha del servidor en UTC** (`current_date`). Los **correos** sí usan la zona del lab para decidir “hoy” (salvo el de “servicio desactivado”, que usa UTC).

---

## 3. Edge Function **payment-reminder**

- **Entrada:** POST (cron o prueba manual), body `{}`.
- **Qué hace:**
  1. **Labs activos:** Lee labs con `status = 'active'` y `next_payment_date` no nula. Para cada uno, “hoy” = fecha en **config.timezone** (ej. America/Caracas). Compara `next_payment_date` con: hoy, hoy+1, hoy+7, hoy+15. Si coincide → envía correo a **todos los `role = 'owner'`** (15 días, 7 días, 1 día o **vence hoy**).
  2. **Labs inactivos (recién desactivados):** Busca labs con `status = 'inactive'` y `next_payment_date = (hoy en UTC) - 2 días` (los que el cron acaba de inactivar). Envía a sus owners el correo **“Su servicio SolHub ha sido desactivado por falta de pago”** (asunto y texto distintos).
- **Tipos de correo:** 15 días, 7 días, 1 día, **vence hoy**, **servicio desactivado** (pasadas las 24 h, lab ya inactive).
- **Monto en el correo (solo recordatorios activos):** USD + Bs con **tasa euro** (API `euros/oficial`); si falla, `config.defaultExchangeRate`. El correo de desactivado no lleva monto.
- **Remitente:** Resend (dominio verificado). Secrets: `RESEND_API_KEY`, opcional `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`.

---

## 4. Frontend en Solhub (app del lab)

- **InactiveLaboratoryGate:** Si `laboratory.status === 'inactive'` → pantalla de bloqueo (“Tu administrador o dueño no ha pagado…”). Nadie del lab puede usar el sistema (RLS también bloquea datos).
- **PaymentReminderBanner:** Solo para usuarios con rol **owner** o **prueba**. “Hoy” = fecha en **config.timezone** del lab. Diferencia en días = `next_payment_date` menos hoy (solo fechas).
  - **Tasa para Bs:** solo aquí se usa **euro** (`useExchangeRateEuro` → `euros/oficial`). Resto de la app usa dólar.
  - Muestra modal según días restantes o estado (inactive, overdue, 15/7/1 día, vence hoy, “faltan X días”). Se puede cerrar “por hoy” (sessionStorage).

---

## 5. Todas las situaciones posibles (con solhub-demo)

Supongamos **renewal_day_of_month = 6**, **next_payment_date = 2026-04-06**, **timezone = America/Caracas**, **billing_amount = 150 USD**.

### Situación A: Faltan más de 15 días (ej. hoy 20 mar)

- **Estado:** active, current.  
- **Avisos:** No se muestra modal; no se envía correo.  
- **Correo:** No (no toca 15/7/1/hoy).

### Situación B: Faltan 15 días (hoy 22 mar en Caracas)

- **Estado:** active, current.  
- **Aviso:** Modal “Recordatorio de pago – 15 días”, 150 USD + Bs (tasa euro).  
- **Correo:** Sí, a las 04:00 Caracas, a todos los owners (“próxima fecha 2026-04-06, en 15 días”).

### Situación C: Faltan 7 días (hoy 30 mar)

- **Estado:** active, current.  
- **Aviso:** Modal “1 semana”.  
- **Correo:** Sí (solo ese día), “en 7 días”.

### Situación D: Falta 1 día (hoy 5 abr)

- **Estado:** active, current.  
- **Aviso:** Modal “Mañana vence tu pago”.  
- **Correo:** Sí, “mañana (2026-04-06)”.

### Situación E: “Vence hoy” (hoy 6 abr en Caracas)

- **Estado:** active, current.  
- **Aviso:** Modal “Tu pago vence hoy (2026-04-06). Tienes 24 horas para regularizar.”  
- **Correo:** Sí, “vence hoy”, 24 h para regularizar.  
- Sigue pudiendo usar el sistema.

### Situación F: Pasó el 6 y aún no es madrugada del 8 (ej. 7 abr, antes de 00:05 Caracas)

- **Estado:** Tras el cron de las **00:05 Caracas del 7**, el lab pasa a **payment_status = 'overdue'** (sigue **active**).  
- **Aviso:** Modal “Pago en retraso. Tienes 24 horas…”.  
- **Correo:** No (ya no es 15/7/1/hoy).  
- Sigue pudiendo usar el sistema.

### Situación G: Pasó la ventana de 24 h (desde 00:05 Caracas del 8 abr)

- **Estado:** Tras el cron de las **00:05 Caracas del 8** → **status = 'inactive'**.  
- **Aviso:** No hay modal de recordatorio; **InactiveLaboratoryGate** muestra la pantalla de bloqueo.  
- **Correo:** No en ese momento (el cron solo cambia estado).  
- **Datos:** RLS impide leer/escribir pacientes, historiales, etc. Solo pueden verse el propio perfil y el lab para mostrar el mensaje.

### Situación G2: Mismo día 8, a las 04:00 Caracas (ejecución de payment-reminder)

- **Estado:** Sigue **inactive**.  
- **Correo:** Sí. La función detecta labs **inactive** con `next_payment_date = (hoy UTC) - 2` = 6 abr. Envía a los owners el correo **“Su servicio SolHub ha sido desactivado por falta de pago”** (servicio desactivado; asunto y texto distintos). Se envía **solo ese día** para esos labs.

### Situación H: “Marcar como pagado” (dashboard admin)

**H1 – Pagó a tiempo (lab active, ej. 5 abr)**  
- Se llama `get_next_payment_date_on_mark_paid(lab_id)`.  
- La función devuelve próximo día fijo → ej. **2026-04-06**; **renewal_day_of_month_new = NULL**.  
- UPDATE: `status = 'active'`, `payment_status = 'current'`, `next_payment_date = 2026-04-06`, **renewal_day_of_month no se cambia**.  
- Siguiente ciclo: otra vez el 6 (abril, mayo, etc.).

**H2 – Pagó tarde (lab inactive, ej. 15 abr)**  
- Se llama `get_next_payment_date_on_mark_paid(lab_id)`.  
- La función devuelve: **next_payment_date = 2026-05-15** (hoy + 1 mes), **renewal_day_of_month_new = 15**.  
- UPDATE: `status = 'active'`, `payment_status = 'current'`, `next_payment_date = 2026-05-15`, **renewal_day_of_month = 15**.  
- A partir de ahí el “día fijo” es el **15**; próximos recordatorios y vencimientos serán los 15 (mayo, junio, etc.).

---

## 6. Resumen en una tabla (solhub-demo, día fijo 6)

| Momento | status | payment_status | Modal / pantalla | Correo |
|--------|--------|----------------|-------------------|--------|
| > 15 días antes del 6 | active | current | Nada | No |
| 15 días antes | active | current | “15 días” | Sí (ese día) |
| 7 días antes | active | current | “1 semana” | Sí (ese día) |
| 1 día antes | active | current | “Mañana vence” | Sí (ese día) |
| El día 6 (vence hoy) | active | current | “Vence hoy” | Sí (ese día) |
| Día 7 (tras cron 00:05) | active | **overdue** | “Pago en retraso” | No |
| Día 8 en adelante (tras cron 00:05) | **inactive** | - | Pantalla de bloqueo | No (aún no ha corrido reminder) |
| Día 8, 04:00 Caracas (payment-reminder) | **inactive** | - | Pantalla de bloqueo | **Sí: “Servicio desactivado”** (solo ese día) |
| Día 9+ (sigue inactive) | **inactive** | - | Pantalla de bloqueo | No |
| Tras “Marcar como pagado” (activo) | active | current | Desaparece aviso / siguiente ciclo el 6 | - |
| Tras “Marcar como pagado” (inactivo) | active | current | Reactivado; siguiente ciclo el **día que pagó** | - |

---

## 7. Qué toca cada parte

- **Cron 04:05 UTC (00:05 Caracas):** Solo cambia estados (overdue / inactive) según `next_payment_date` y la fecha en UTC.  
- **Cron 08:00 UTC (04:00 Caracas):** Dispara **payment-reminder**; la función usa la zona del lab para “hoy” en recordatorios activos y, para el correo de desactivado, labs inactive con `next_payment_date = hoy UTC - 2`.  
- **Correos:** 5 tipos: 15 días, 7 días, 1 día, vence hoy, **servicio desactivado** (cuando el lab acaba de pasar a inactive). Tasa euro solo en los 4 primeros; solo a owners.  
- **Avisos en app:** Mismo criterio de “hoy” por timezone; modal con monto en USD + Bs (euro).  
- **Marcar como pagado:** Siempre vía **get_next_payment_date_on_mark_paid**; si estaba inactive se actualiza también **renewal_day_of_month** al día que pagó.