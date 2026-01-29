# Solución: Búsqueda por palabras con insensibilidad a acentos (FTS + unaccent)

## Resumen ejecutivo

Se propone **sustituir la búsqueda por trigramas (pg_trgm)** por **Full-Text Search (FTS)** de PostgreSQL con configuración **unaccent + simple**, aplicada tanto en **pacientes** como en **casos**. Así se consigue:

1. **"Rene" encuentra "René"** (y cualquier variante con/sin tilde).
2. **"Rene" no encuentra "Irene"** (búsqueda por **palabras**, no por subcadenas de 3 caracteres).
3. **Búsqueda rápida** con índices GIN estándar, usada en entornos profesionales y por grandes empresas.

---

## Por qué trigram no sirve para este caso

| Problema              | Trigram (pg_trgm)                       | Lo que necesitas                                             |
| --------------------- | --------------------------------------- | ------------------------------------------------------------ |
| Unidad de comparación | Secuencias de 3 caracteres              | **Palabras completas**                                       |
| "Rene" vs "Irene"     | Comparten "ren", "ene" → alta similitud | "Rene" e "Irene" son palabras distintas → no deben coincidir |
| "Rene" vs "René"      | Trigramas distintos (e vs é)            | Misma palabra sin acento → deben coincidir                   |
| Uso típico            | Fuzzy matching, corrección tipográfica  | Búsqueda por nombre exacto (con/sin acento)                  |

---

## Metodología recomendada: Full-Text Search (FTS) + unaccent

### Qué es y quién lo usa

- **Full-Text Search (FTS)** en PostgreSQL: búsqueda por **tokens/palabras** (no por subcadenas arbitrarias). Incluye:
  - Tokenización por límites de palabra.
  - Índices GIN sobre `tsvector` (muy rápidos).
  - Operadores `@@`, `plainto_tsquery`, ranking con `ts_rank`, etc.
- Es la misma familia de ideas que usan **Elasticsearch, Algolia, Meilisearch** (índices invertidos por término/palabra). En PostgreSQL, FTS es la opción nativa y estándar para este tipo de búsqueda.
- **unaccent** (extensión + diccionario de búsqueda): normaliza acentos (é → e, á → a, etc.) para que "Rene" y "René" se traten como la misma palabra en el índice y en la consulta.

Ventajas de FTS + unaccent frente a trigram en tu caso:

- Comportamiento por **palabras**: "Rene" coincide con la palabra "Rene"/"René", no con "Irene".
- **Insensibilidad a acentos** integrada en la configuración de búsqueda (un solo lugar donde mantenerla).
- **Rendimiento**: índice GIN sobre `to_tsvector(...)` es la práctica estándar en PostgreSQL para búsqueda por texto.
- **Mantenimiento**: una configuración (unaccent + simple), sin umbrales de similitud ni lógica híbrida trigram.

---

## Comportamiento esperado (ejemplos)

| Usuario escribe | Debe encontrar                                                       | No debe encontrar                            |
| --------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| Rene            | René Cortes, Rene Cortes, Rene Pérez                                 | Carmen Irene, Irene Alvarez, Celyrene        |
| René            | Igual que "Rene"                                                     | Irene, etc.                                  |
| Rene Cortes     | René Cortes, Rene Cortes (ambas palabras)                            | Solo "Rene" o solo "Cortes" en otro contexto |
| 10460896        | Paciente con cédula V-10460896 (por coincidencia en cédula/teléfono) | —                                            |

La búsqueda por **cédula/teléfono/código** puede seguir siendo exacta o por coincidencia directa (sin FTS), igual que ahora.

---

## Diseño técnico

### 1. Configuración de búsqueda (una sola vez)

- Crear una configuración de texto que use **unaccent** como filtro y **simple** como diccionario final (sin stemming, para no alterar nombres).
- Así, tanto el índice como la consulta normalizan acentos y mayúsculas de forma coherente.

Ejemplo conceptual:

```sql
CREATE TEXT SEARCH CONFIGURATION solhub_unaccent (COPY = simple);
ALTER TEXT SEARCH CONFIGURATION solhub_unaccent
  ALTER MAPPING FOR asciiword, word, hword, hword_part
  WITH unaccent, simple;
```

- **unaccent**: convierte "René" → "Rene", "José" → "Jose", etc.
- **simple**: solo normaliza a minúsculas y no hace stemming, para que "Rene" siga siendo "Rene" y no se confunda con otras palabras.

### 2. Búsqueda por nombre (pacientes y casos)

- **Índice** (para rendimiento):
  - Pacientes: `GIN (to_tsvector('solhub_unaccent', nombre))`
  - Casos: búsqueda sobre el nombre del paciente asociado; si se materializa en una vista o se busca por `patients.nombre`, el mismo tipo de índice en `patients` sirve para casos.

- **Condición de búsqueda por nombre** (reemplaza la lógica trigram en nombre):
  - `to_tsvector('solhub_unaccent', nombre) @@ plainto_tsquery('solhub_unaccent', search_term)`

- **Ordenación (opcional)**:
  - Prioridad 1: coincidencia exacta de nombre (por ejemplo `lower(unaccent(nombre)) = lower(unaccent(search_term))` si el término es una sola palabra y se quiere poner exactos primero).
  - Prioridad 2: `ts_rank(to_tsvector('solhub_unaccent', nombre), plainto_tsquery('solhub_unaccent', search_term)) DESC` para ordenar por relevancia.

### 3. Coincidencia exacta y otros campos

- **Acentos en coincidencia exacta**: usar `unaccent` en ambos lados, por ejemplo:
  - `lower(unaccent(p.nombre)) = lower(unaccent(search_term))`
- **Cédula, teléfono, código de caso**: mantener lógica actual (igualdad o `ILIKE` según necesidad), sin FTS.

### 4. Funciones a modificar

- **Pacientes**: `search_patients_optimized`
  - Dejar de usar `similarity(...)` y operador `%` en nombre.
  - Usar FTS con `solhub_unaccent` para nombre y unaccent para exactos; cédula/teléfono como hasta ahora.
- **Casos**: `search_medical_cases_optimized`
  - Igual: búsqueda por nombre de paciente vía FTS + unaccent; resto de campos (código, médico, etc.) como ahora, sin trigram en nombre.

No es necesario mantener trigram para nombre; sí se puede seguir usando igualdad/ILIKE para cédula, teléfono y código.

---

## Implementación sugerida (pasos)

1. **Migración SQL**
   - `CREATE EXTENSION IF NOT EXISTS unaccent;`
   - Crear configuración `solhub_unaccent` (unaccent + simple) como arriba.
   - Crear índices GIN sobre `to_tsvector('solhub_unaccent', nombre)` donde corresponda (pacientes y, si aplica, vista de casos).
   - Reemplazar el cuerpo de `search_patients_optimized` para usar FTS + unaccent en nombre y mantener cédula/teléfono.
   - Reemplazar el cuerpo de `search_medical_cases_optimized` para usar FTS + unaccent en el nombre del paciente y mantener el resto de criterios.
   - Opcional: eliminar índices trigram que solo se usaban para nombre si ya no se usan.

2. **Frontend / API**
   - Sin cambios en parámetros: se sigue enviando el mismo `search_term`; solo cambia la lógica interna en la base de datos.

3. **Pruebas**
   - Buscar "Rene" → debe aparecer "René Cortes" y no "Irene".
   - Buscar "René" → mismos resultados que "Rene".
   - Buscar "Irene" → solo nombres que contengan la palabra "Irene".
   - Búsqueda por cédula/teléfono/código: mismo comportamiento que antes.

---

## Resumen de ventajas

| Aspecto                  | Trigram (actual)          | FTS + unaccent (propuesto)            |
| ------------------------ | ------------------------- | ------------------------------------- |
| "Rene" vs "René"         | No (trigramas distintos)  | Sí (misma palabra normalizada)        |
| "Rene" vs "Irene"        | Sí (falsos positivos)     | No (palabras distintas)               |
| Velocidad                | Buena con GIN trigram     | Buena con GIN tsvector                |
| Estándar en la industria | Fuzzy / corrección        | Búsqueda por términos/palabras        |
| Mantenimiento            | Umbrales y lógica híbrida | Una configuración (unaccent + simple) |

Cuando decidas si aplicar esta solución, el siguiente paso sería escribir la migración SQL concreta (nombres de funciones, parámetros y filtros por `lab_id`, etc.) y ajustar solo las partes que toquen a `search_patients_optimized` y `search_medical_cases_optimized`.
