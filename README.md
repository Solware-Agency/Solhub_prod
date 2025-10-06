# 🏥 Solhub - Sistema de Gestión Médica

Sistema web moderno para la gestión integral de casos médicos, pacientes y reportes. Construido con React, TypeScript, Vite y Supabase, siguiendo los principios de **Screaming Architecture** para máxima escalabilidad y mantenibilidad.

---

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecutar el Proyecto](#-ejecutar-el-proyecto)
- [Scripts Disponibles](#-scripts-disponibles)
- [Estructura del Proyecto](#️-estructura-del-proyecto)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Arquitectura](#-arquitectura)
- [Flujo de Desarrollo](#-flujo-de-desarrollo)
- [Deployment](#-deployment)
- [Contribuir](#-contribuir)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Características Principales

- 🔐 **Autenticación y autorización** con Supabase Auth
- 📊 **Dashboard interactivo** con estadísticas en tiempo real
- 🏥 **Gestión de casos médicos** completa
- 👥 **Administración de pacientes** con autocompletado inteligente
- 📄 **Generación de PDFs** e informes médicos
- 💳 **Gestión de pagos** con múltiples métodos
- 📈 **Reportes y estadísticas** visuales
- 🤖 **Chat AI integrado** para asistencia
- 🌙 **Modo oscuro/claro** con persistencia
- 📱 **Diseño responsive** para todos los dispositivos
- ⚡ **Carga rápida** con lazy loading y code splitting

---

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** >= 18.0.0 ([Descargar](https://nodejs.org/))
- **pnpm** >= 10.0.0 (Gestor de paquetes recomendado)
  ```bash
  npm install -g pnpm
  ```
- **Git** para control de versiones
- Una cuenta de **Supabase** ([Crear cuenta](https://supabase.com/))
- (Opcional) Una cuenta de **Resend** para envío de emails ([Crear cuenta](https://resend.com/))

---

## 📥 Instalación

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd Solhub_prod
```

### 2. Instalar dependencias

```bash
pnpm install
```

> **Nota:** Si prefieres usar npm o yarn, puedes hacerlo, pero el proyecto está optimizado para pnpm.

---

## ⚙️ Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# === SUPABASE (REQUERIDO) ===
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui

# === EMAIL (Opcional - para envío de reportes) ===
RESEND_API_KEY=re_tu-api-key-aqui

# === CHAT AI (Opcional) ===
VITE_FLOWISE_API_URL=https://tu-instancia-flowise.com
VITE_FLOWISE_CHATFLOW_ID=tu-chatflow-id

# === BACKEND (Opcional - si usas el servidor Express) ===
PORT=3001
NODE_ENV=development
```

### 2. Configurar Supabase

#### Opción A: Usar Supabase MCP (Recomendado)

Si tienes Supabase MCP configurado, puedes aplicar las migraciones directamente:

```bash
# El proyecto incluye 84+ migraciones en /supabase/migrations/
# Se aplicarán automáticamente al conectar con Supabase
```

#### Opción B: Configuración Manual

1. Crea un proyecto nuevo en [Supabase](https://supabase.com/)
2. Copia la URL y la Anon Key desde Project Settings > API
3. Ejecuta las migraciones en orden desde `supabase/migrations/`

### 3. Base de Datos

El proyecto utiliza las siguientes tablas principales:

- `medical_records_clean` - Registros médicos
- `patients` - Información de pacientes
- `users` - Usuarios del sistema
- `changelog` - Historial de cambios
- Y más... (ver migraciones para detalles)

---

## 🚀 Ejecutar el Proyecto

### Modo Desarrollo - Solo Frontend

```bash
pnpm dev
```

La aplicación estará disponible en: `http://localhost:5173`

### Modo Desarrollo - Fullstack (Frontend + Backend)

```bash
pnpm dev:full
```

Esto iniciará:
- Frontend en `http://localhost:5173`
- Backend en `http://localhost:3001`

### Modo Desarrollo - Solo Backend

```bash
pnpm dev:server
```

### Modo Producción

```bash
# Construir el proyecto
pnpm build

# Iniciar en producción
pnpm start:prod
```

---

## 📜 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Inicia el servidor de desarrollo de Vite |
| `pnpm dev:full` | Inicia frontend y backend concurrentemente |
| `pnpm dev:server` | Inicia solo el servidor backend Express |
| `pnpm build` | Compila el proyecto para producción |
| `pnpm preview` | Previsualiza la build de producción |
| `pnpm lint` | Ejecuta ESLint para verificar el código |
| `pnpm analyze` | Analiza el tamaño del bundle con visualizer |
| `pnpm unused:components` | Detecta exports no utilizados |
| `pnpm start` | Build + inicia el servidor en producción |
| `pnpm start:prod` | Inicia el servidor con NODE_ENV=production |

---

## 🏗️ Estructura del Proyecto

```
Solhub_prod/
│
├── api/                          # Serverless functions (Vercel)
│   ├── download-pdf.js           # API para descargar PDFs
│   └── send-email.js             # API para envío de emails
│
├── backend/                      # Servidor Express (opcional)
│   ├── routes/
│   │   ├── chat.js               # Rutas del chat AI
│   │   └── email.js              # Rutas de email
│   └── server.js                 # Entry point del servidor
│
├── src/
│   ├── app/                      # Configuración global de la app
│   │   ├── providers/            # Context providers
│   │   │   ├── AuthContext.tsx   # Autenticación
│   │   │   ├── ThemeProvider.tsx # Tema dark/light
│   │   │   └── SessionTimeoutProvider.tsx
│   │   └── routes/               # Configuración de rutas
│   │       ├── FormRoute.tsx
│   │       ├── PrivateRoute.tsx  # Rutas protegidas
│   │       └── lazy-routes.tsx   # Rutas con lazy loading
│   │
│   ├── features/                 # Módulos funcionales (Screaming Architecture)
│   │   ├── auth/                 # 🔐 Autenticación
│   │   │   ├── components/       # Formularios de login, registro, etc.
│   │   │   ├── pages/            # Páginas de auth
│   │   │   └── other/            # Callbacks, verificaciones
│   │   │
│   │   ├── cases/                # 🏥 Gestión de casos médicos
│   │   │   ├── components/       # Tabla, cards, modales
│   │   │   └── pages/            # CasesPage
│   │   │
│   │   ├── dashboard/            # 📊 Dashboard principal
│   │   │   ├── components/       # HomePage, stats, etc.
│   │   │   └── layouts/          # Header del dashboard
│   │   │
│   │   ├── form/                 # 📝 Formulario médico
│   │   │   ├── components/       # Secciones del formulario
│   │   │   ├── lib/              # Schemas y validaciones
│   │   │   └── pages/            # FormPage
│   │   │
│   │   ├── patients/             # 👥 Gestión de pacientes
│   │   ├── reports/              # 📈 Reportes
│   │   ├── stats/                # 📊 Estadísticas
│   │   ├── users/                # 👤 Gestión de usuarios
│   │   ├── settings/             # ⚙️ Configuración
│   │   ├── changelog/            # 📋 Historial de cambios
│   │   └── ChatAI/               # 🤖 Chat con IA
│   │
│   ├── shared/                   # Código compartido
│   │   ├── components/
│   │   │   ├── ui/               # Componentes base (shadcn/ui)
│   │   │   ├── layout/           # Layouts compartidos
│   │   │   └── icons/            # Iconos personalizados
│   │   ├── hooks/                # Custom hooks reutilizables
│   │   ├── lib/                  # Utilidades generales
│   │   └── types/                # TypeScript types
│   │
│   ├── services/                 # Servicios externos
│   │   ├── supabase/             # Cliente y funciones de Supabase
│   │   │   ├── auth/             # Servicios de autenticación
│   │   │   ├── cases/            # Servicios de casos
│   │   │   ├── patients/         # Servicios de pacientes
│   │   │   ├── users/            # Servicios de usuarios
│   │   │   └── config/           # Configuración de Supabase
│   │   ├── legacy/               # Código legacy (deprecado)
│   │   └── utils/                # Utilidades de servicios
│   │
│   ├── App.tsx                   # Componente raíz
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Estilos globales
│
├── supabase/
│   └── migrations/               # 84+ migraciones SQL
│
├── public/                       # Assets estáticos
├── dist/                         # Build de producción
│
├── .env                          # Variables de entorno (NO commitear)
├── package.json                  # Dependencias y scripts
├── pnpm-lock.yaml                # Lock file de pnpm
├── vite.config.ts                # Configuración de Vite
├── tsconfig.json                 # Configuración de TypeScript
├── tailwind.config.js            # Configuración de Tailwind
├── components.json               # Configuración de shadcn/ui
└── vercel.json                   # Configuración de deployment
```

---

## 🛠️ Tecnologías Utilizadas

### Frontend Core
- **React 18.2** - Librería de UI
- **TypeScript 5.8** - Tipado estático
- **Vite 6.3** - Build tool y dev server ultra rápido

### Routing & State
- **React Router DOM 6.30** - Navegación
- **TanStack Query 5.56** - Server state management
- **React Hook Form 7.53** - Gestión de formularios

### UI & Styling
- **Tailwind CSS 4.1** - Utility-first CSS
- **shadcn/ui** - Componentes base (Radix UI)
- **Framer Motion 12** - Animaciones
- **Lucide React** - Iconos
- **Recharts** - Gráficas y visualizaciones

### Backend & Database
- **Supabase 2.50** - Backend as a Service (PostgreSQL + Auth + Storage)
- **Express 5.1** - Servidor Node.js (opcional)

### Utilities
- **Zod 3.23** - Validación de schemas
- **date-fns 3.6** - Manipulación de fechas
- **jsPDF 2.5** - Generación de PDFs
- **xlsx 0.18** - Export a Excel
- **Resend** - Envío de emails transaccionales

### Dev Tools
- **ESLint 9** - Linting
- **Concurrently** - Ejecutar múltiples procesos
- **Rollup Visualizer** - Análisis de bundle

---

## 🏛️ Arquitectura

### Screaming Architecture

Este proyecto sigue el patrón **Screaming Architecture**, donde la estructura de carpetas "grita" el propósito del negocio:

```
features/
├── auth/       ← ¡Es un sistema de autenticación!
├── cases/      ← ¡Gestiona casos médicos!
├── patients/   ← ¡Administra pacientes!
└── ...
```

**Beneficios:**
- ✅ **Claridad inmediata** - Sabes qué hace la app con solo ver la estructura
- ✅ **Módulos independientes** - Cada feature es autocontenido
- ✅ **Escalabilidad** - Agregar features es trivial
- ✅ **Mantenibilidad** - Fácil encontrar y modificar código
- ✅ **Testing** - Cada módulo puede testearse aisladamente

### Path Aliases

El proyecto usa alias para imports más limpios:

```typescript
// ❌ Evitar
import { Button } from '../../../shared/components/ui/button'

// ✅ Preferir
import { Button } from '@shared/components/ui/button'
```

**Aliases disponibles:**
- `@/` → `src/`
- `@app/` → `src/app/`
- `@features/` → `src/features/`
- `@shared/` → `src/shared/`
- `@services/` → `src/services/`

### Flujo de Datos

```
UI Component
    ↓
React Hook Form / TanStack Query
    ↓
Service Layer (services/supabase/)
    ↓
Supabase Client
    ↓
PostgreSQL Database
```

---

## 🔄 Flujo de Desarrollo

### 1. Crear una nueva feature

```bash
src/features/mi-nueva-feature/
├── components/          # Componentes específicos
├── pages/              # Páginas de la feature
├── hooks/              # Hooks personalizados (opcional)
├── lib/                # Lógica de negocio (opcional)
└── types/              # Types específicos (opcional)
```

### 2. Agregar una nueva ruta

Edita `src/app/routes/lazy-routes.tsx`:

```typescript
export const MiNuevaFeaturePage = lazy(
  () => import('@features/mi-nueva-feature/pages/MiNuevaFeaturePage')
)
```

Luego en `src/App.tsx`:

```typescript
<Route path="/mi-ruta" element={<MiNuevaFeaturePage />} />
```

### 3. Crear un servicio de Supabase

```typescript
// src/services/supabase/mi-servicio/mi-servicio.ts
import { supabase } from '@services/supabase/config/config'

export async function getMisDatos() {
  const { data, error } = await supabase
    .from('mi_tabla')
    .select('*')
  
  if (error) throw error
  return data
}
```

### 4. Usar TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query'
import { getMisDatos } from '@services/supabase/mi-servicio/mi-servicio'

function MiComponente() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mis-datos'],
    queryFn: getMisDatos
  })
  
  // ... render
}
```

### 5. Estándares de código

- ✅ Usar TypeScript para todo
- ✅ Nombrar componentes en PascalCase
- ✅ Nombrar hooks con prefijo `use`
- ✅ Usar const para funciones: `const MiComponente = () => {}`
- ✅ Extraer lógica compleja a hooks personalizados
- ✅ Mantener componentes pequeños (<200 líneas)
- ✅ Usar aliases de import
- ✅ Documentar funciones complejas

---

## 🚢 Deployment

### Vercel (Recomendado)

El proyecto está configurado para deployarse en Vercel:

1. **Conecta tu repositorio** en [vercel.com](https://vercel.com)

2. **Configura las variables de entorno:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY` (opcional)

3. **Deploy automático** - Cada push a `main` desplegará automáticamente

El archivo `vercel.json` ya está configurado con:
- Rutas de API serverless (`/api/*`)
- Rewrites para SPA
- Headers de seguridad

### Otros Proveedores

#### Netlify

```bash
pnpm build
# Subir carpeta dist/
```

#### Railway / Render

```bash
# Usar el script de producción
pnpm start:prod
```

---

## 🤝 Contribuir

### Reportar Bugs

Abre un issue describiendo:
1. **Qué esperabas** que pasara
2. **Qué pasó** en realidad
3. **Pasos para reproducir**
4. **Screenshots** si aplica

### Proponer Features

1. Abre un issue con el tag `enhancement`
2. Describe el problema que resuelve
3. Propón una solución (opcional)

### Pull Requests

1. **Fork** el repositorio
2. **Crea una rama** para tu feature:
   ```bash
   git checkout -b feature/mi-nueva-feature
   ```
3. **Commit** tus cambios:
   ```bash
   git commit -m "feat: agrega nueva feature"
   ```
4. **Push** a tu fork:
   ```bash
   git push origin feature/mi-nueva-feature
   ```
5. **Abre un PR** describiendo los cambios

### Convenciones de Commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `style:` - Cambios de formato (no afectan código)
- `refactor:` - Refactorización de código
- `test:` - Agregar o modificar tests
- `chore:` - Tareas de mantenimiento

---

## 🔍 Troubleshooting

### Error: "Variables de Supabase no configuradas"

**Solución:** Verifica que tu archivo `.env` tenga las variables correctas:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### Error: "Cannot find module '@shared/...'"

**Solución:** Los path aliases están configurados. Si el error persiste:
```bash
# Reinicia el servidor de desarrollo
pnpm dev
```

### Página en blanco después de build

**Solución:** Verifica que estés usando las variables de entorno correctas en producción y que el archivo `vercel.json` tenga la configuración de rewrites.

### Problemas con pnpm

**Solución:** Limpia la caché y reinstala:
```bash
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Backend no conecta con frontend

**Solución:** Verifica que el proxy de Vite esté configurado correctamente en `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

### Migraciones de Supabase

**Solución:** Si usas Supabase MCP, las migraciones se aplican automáticamente. Si no, ejecuta las migraciones manualmente desde el SQL Editor de Supabase en orden numérico.

---

## 📞 Soporte

Para preguntas o ayuda:

- 📧 **Email:** [tu-email@ejemplo.com]
- 💬 **Discord:** [Link a tu servidor]
- 📖 **Wiki:** [Link a documentación adicional]
- 🐛 **Issues:** [Link a GitHub Issues]

---

## 📄 Licencia

[Especifica tu licencia aquí - ej. MIT, GPL, etc.]

---

## 🙏 Agradecimientos

- **shadcn/ui** - Sistema de componentes base
- **Supabase** - Backend as a Service
- **Vercel** - Hosting y deployment
- **Todos los contribuyentes** que han hecho posible este proyecto

---

## 📊 Estado del Proyecto

- ✅ **En producción** - Sistema estable
- 🔄 **Desarrollo activo** - Nuevas features en camino
- 📈 **Mejora continua** - Refactoring y optimizaciones

---

**¿Listo para contribuir?** 🚀

```bash
git clone <repo>
cd Solhub_prod
pnpm install
# Configura tu .env
pnpm dev
```

¡Happy coding! 💻✨