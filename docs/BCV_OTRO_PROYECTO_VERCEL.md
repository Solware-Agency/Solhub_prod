# Guía: proyecto BCV en Vercel (fork de bcv-exchange-rates)

Este documento es **para el otro proyecto**: el fork/clon de [bcv-exchange-rates](https://github.com/tomkat-cr/bcv-exchange-rates). Aquí tienes el contexto, la revisión de seguridad, qué cambiar en ese repo y cómo desplegarlo en Vercel. Después, en **Solhub** (este proyecto) solo tendrás que configurar la URL y la API key para consumir tu API.

---

## 1. Contexto: por qué este proyecto

- **Objetivo:** Tener **tu propia API** que hace scraping de la página del BCV (bcv.org.ve) y devuelve tasas USD y EUR.
- **Flujo:** Solo tu app (Solhub) debe poder consumir esa API; no todo el mundo con el link.

```
[Usuario en Solhub]  →  [Supabase Edge Function bcv-rates]
                                    ↓
                        (con API key en secreto)
                                    ↓
                        [Tu API en Vercel]  ←  Este proyecto (fork)
                                    ↓
                        [Scraping bcv.org.ve]
```

- En **Solhub** no se llama nunca directamente a tu link de Vercel. La Edge Function tiene la URL y la API key; el frontend solo llama a la Edge Function con JWT. Así solo tú (tu backend) consumís tu API.

---

## 2. Revisión de seguridad del repo original

Antes de desplegar, conviene revisar qué es seguro y qué hay que endurecer.

| Aspecto | Estado en el repo original | Qué hacer en tu fork |
|--------|-----------------------------|------------------------|
| **Autenticación** | No hay. Cualquiera puede hacer GET. | **Añadir API key** en el endpoint (header `x-api-key`). |
| **Secrets** | No usa secrets; no hay datos sensibles en código. | La API key solo en variable de entorno en Vercel (nunca en código). |
| **Entrada de usuario** | El scraper no recibe parámetros; la URL de BCV es fija. | Nada que hacer; no hay riesgo de inyección. |
| **SSL** | En `bcv.py` hay un fallback con `verify=False` si BCV da error SSL. | Aceptable para solo leer bcv.org.ve. En producción, si BCV mejora SSL, quitar el fallback o dejarlo solo en desarrollo. |
| **Dependencias** | `requests`, `beautifulsoup4`, etc. | Ejecutar `pip audit` o `poetry check` y actualizar si hay CVEs. |
| **CORS** | FastAPI por defecto permite cualquier origen. | Opcional: restringir a tu dominio o a la URL de Supabase Edge (si quieres una capa extra). La protección real es la API key. |
| **Rate limit** | No hay. | Opcional: en Vercel puedes usar límites de plan o añadir middleware en FastAPI. |

**Resumen:** Lo imprescindible es **proteger el endpoint con API key**. El resto son buenas prácticas u opcionales.

---

## 3. Qué hacer en el proyecto fork (paso a paso)

### 3.1 Clonar / fork

```bash
# Opción A: fork en GitHub y luego clonar tu fork
git clone https://github.com/TU_USUARIO/bcv-exchange-rates.git
cd bcv-exchange-rates

# Opción B: clonar el original y luego cambiar remote a tu repo
git clone https://github.com/tomkat-cr/bcv-exchange-rates.git
cd bcv-exchange-rates
git remote set-url origin https://github.com/TU_USUARIO/bcv-exchange-rates.git
```

### 3.2 Dependencias para Vercel

El repo usa Poetry. Vercel puede leer `pyproject.toml`. Para el runtime de serverless suele hacer falta un `requirements.txt` que Vercel use en el build. Genera uno desde Poetry:

```bash
poetry export -f requirements.txt --output requirements.txt --without-hashes
```

Si en el export faltan `fastapi` o `a2wsgi`, añádelas a `pyproject.toml` en la sección `[tool.poetry.dependencies]`:

```toml
fastapi = "^0.115.0"
a2wsgi = "^1.0.0"
```

Luego otra vez:

```bash
poetry export -f requirements.txt --output requirements.txt --without-hashes
```

Comprueba que `requirements.txt` existe y contiene `fastapi`, `a2wsgi`, `requests`, `beautifulsoup4`, etc.

### 3.3 Proteger el endpoint con API key

Sustituye el contenido de **`bcv_exchange_rates/index.py`** por el siguiente. Así el endpoint solo responde si se envía el header `x-api-key` con el valor que definas en Vercel (si no configuras key, en desarrollo queda abierto).

```python
import os
import sys
import json

from fastapi import FastAPI, Header, HTTPException, Depends
from a2wsgi import ASGIMiddleware

from bcv_exchange_rates.bcv import get_bcv_exchange_rates

# La API key solo se lee de variable de entorno (configurada en Vercel).
# Si no está definida, el endpoint queda abierto (útil en desarrollo local).
API_KEY = os.environ.get("BCV_API_KEY", "")


def get_command_line_args():
    params = dict()
    params["mode"] = "api"
    params["config_filename"] = ".env"
    if len(sys.argv) > 1:
        params["mode"] = sys.argv[1]
    if len(sys.argv) > 2:
        params["config_filename"] = sys.argv[2]
    return params


def verify_api_key(x_api_key: str = Header(None, alias="x-api-key")):
    """Solo permite acceso si se envía el header x-api-key con el valor correcto."""
    if not API_KEY:
        return
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return


params = get_command_line_args()
if params["mode"] == "cli":
    print(json.dumps(get_bcv_exchange_rates()))


api = FastAPI()
app = ASGIMiddleware(api)


@api.get("/get_bcv_exchange_rates", dependencies=[Depends(verify_api_key)])
def get_bcv_rates():
    api_response = get_bcv_exchange_rates()
    return api_response
```

Guarda el archivo y prueba en local (opcional):

```bash
# Sin key (si BCV_API_KEY no está definida, debería responder)
poetry run python -m bcv_exchange_rates.index cli

# Con key (exporta y prueba)
export BCV_API_KEY=tu-clave-secreta
poetry run uvicorn bcv_exchange_rates.index:api --reload
# En otra terminal:
# curl -H "x-api-key: tu-clave-secreta" http://127.0.0.1:8000/get_bcv_exchange_rates
```

### 3.4 (Opcional) CORS más estricto

Si quieres que solo tu dominio o la Edge Function de Supabase pueda llamar a la API, en `bcv_exchange_rates/index.py` puedes añadir después de `api = FastAPI()`:

```python
from fastapi.middleware.cors import CORSMiddleware

api.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tu-dominio-solhub.com",
        "https://*.supabase.co",  # Edge Functions
    ],
    allow_headers=["*"],
)
```

La protección real sigue siendo la API key; CORS es una capa extra.

### 3.5 Verificar `vercel.json`

Debe apuntar al handler correcto. Ejemplo (ajusta si tu estructura es distinta):

```json
{
  "version": 2,
  "builds": [
    {
      "src": "bcv_exchange_rates/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "bcv_exchange_rates/index.py"
    }
  ]
}
```

Si el repo ya tiene `vercel.json` así, no lo toques. Si el handler está en otra ruta, cambia `src` y `dest`.

### 3.6 No subir la API key a Git

- No pongas nunca `BCV_API_KEY` (ni ninguna clave) en el código ni en `.env` commiteado.
- Añade `.env` a `.gitignore` si no está.
- La key solo se configura en **Vercel → Project → Settings → Environment Variables**.

---

## 4. Desplegar en Vercel

### 4.1 Conectar el repositorio

1. Entra en [vercel.com](https://vercel.com) e inicia sesión.
2. **Add New → Project**.
3. Importa el repo de tu fork (GitHub/GitLab/Bitbucket).
4. Vercel detectará el proyecto (Python). Si no, en **Framework Preset** elige **Other** y en **Build Command** puedes dejar vacío o `poetry export -f requirements.txt -o requirements.txt --without-hashes` si quieres generarlo en build.

### 4.2 Variables de entorno

En el proyecto en Vercel:

1. **Settings → Environment Variables**.
2. Añade:
   - **Name:** `BCV_API_KEY`
   - **Value:** una clave larga y aleatoria (por ejemplo: `openssl rand -hex 32` en la terminal).
   - **Environment:** Production (y Preview si quieres usarla también en previews).

Guarda. No compartas esta clave; la usarás solo en Solhub (en secretos de la Edge Function).

### 4.3 Deploy

1. **Deploy** (o haz push a la rama conectada para que se despliegue solo).
2. Cuando termine, tendrás una URL como:  
   `https://bcv-exchange-rates-xxxx.vercel.app`

La ruta completa del endpoint será:

- `https://tu-proyecto.vercel.app/get_bcv_exchange_rates`

### 4.4 Probar el endpoint

Sin key (debe devolver 401 si configuraste `BCV_API_KEY`):

```bash
curl -i "https://tu-proyecto.vercel.app/get_bcv_exchange_rates"
```

Con key (debe devolver 200 y JSON con `data.dolar`, `data.euro`, etc.):

```bash
curl -i -H "x-api-key: LA_CLAVE_QUE_PUSISTE_EN_VERCEL" \
  "https://tu-proyecto.vercel.app/get_bcv_exchange_rates"
```

El JSON será algo como:

```json
{
  "error": false,
  "data": {
    "dolar": { "symbol": "USD", "value": "36,50..." },
    "euro":  { "symbol": "EUR", "value": "39,12..." },
    "effective_date": "...",
    "run_timestamp": "..."
  }
}
```

---

## 5. Qué hacer después en Solhub (este proyecto)

Cuando tu API en Vercel esté funcionando y probada:

1. **Supabase → Project Settings → Edge Functions → Secrets** (o por CLI):
   - `BCV_API_URL` = `https://tu-proyecto.vercel.app` (sin barra final).
   - `BCV_API_KEY` = la misma clave que pusiste en Vercel.

2. **Desplegar la Edge Function** (si no está ya desplegada):
   ```bash
   supabase functions deploy bcv-rates
   ```

3. En Solhub, el frontend debe llamar a la Edge Function (no directamente a tu link de Vercel). En este repo:
   - **Config:** `src/services/supabase/config/config.ts` exporta `BCV_RATES_FUNCTION_URL` (URL de la función `bcv-rates`).
   - **Hooks:** `src/shared/hooks/useExchangeRate.ts` y `useExchangeRateEuro.ts` deben hacer `fetch(BCV_RATES_FUNCTION_URL)` con header `Authorization: Bearer <session.access_token>` (usando `supabase.auth.getSession()`). La respuesta de la Edge Function es `{ usd: number, eur: number }`: `useExchangeRate` usa `usd`, `useExchangeRateEuro` usa `eur`. Si `BCV_RATES_FUNCTION_URL` no está definida o la llamada falla, los hooks pueden seguir usando la API pública (ve.dolarapi.com) como fallback.

Con eso, **solo tu app** (a través de la Edge Function con la key en secreto) consumirá tu API de Vercel; nadie más podrá usar tu link sin la clave.

---

## 6. Resumen rápido

| Dónde | Qué hacer |
|-------|-----------|
| **Repo fork (este doc)** | 1) Clonar/fork. 2) Añadir API key en `index.py`. 3) Opcional: CORS, `requirements.txt`. 4) Desplegar en Vercel. 5) Configurar `BCV_API_KEY` en Vercel. |
| **Vercel** | Variable `BCV_API_KEY`; la URL base es tu `BCV_API_URL`. |
| **Solhub** | Secrets `BCV_API_URL` y `BCV_API_KEY`; desplegar `bcv-rates`; frontend usa la Edge Function con JWT. |

Si algo falla, revisa: 401 en Vercel → key incorrecta o header `x-api-key` faltante; 500 → logs en Vercel (Deployments → función → Logs) o que bcv.org.ve no responda o haya cambiado el HTML.
