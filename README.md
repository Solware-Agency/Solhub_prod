# 🧠 Proyecto Web - Arquitectura Modular (Screaming Architecture)

Este proyecto utiliza **React + TypeScript + Vite + TailwindCSS**, y está estructurado bajo el enfoque de **Screaming Architecture**, lo que permite escalar, mantener y comprender mejor el código en equipos o proyectos grandes.

---

## 🏗️ Estructura del Proyecto

```bash
src/
├── app/                  # Configuración de rutas y providers globales
│   ├── providers/        # Contextos globales (Auth, Theme, etc.)
│   └── routes/           # Rutas protegidas o personalizadas
│
├── features/             # Cada módulo funcional de la app
│   ├── auth/             # Autenticación (login, registro, etc.)
│   │   ├── components/   # Formularios reutilizables
│   │   ├── pages/        # Páginas como LoginPage, RegisterPage
│   │   └── other/        # Verificación por email, callback, etc.
│   │
│   ├── dashboard/        # Panel administrativo
│   │   ├── calendar/     # Módulo de calendario
│   │   ├── cases/        # Módulo de casos
│   │   ├── home/         # Página de inicio
│   │   ├── stats/        # Estadísticas
│   │   ├── reports/      # Reportes
│   │   ├── layouts/      # Layout del dashboard
│   │   ├── pages/        # DashboardPage, ReportsPage, etc.
│   │   └── components/   # Comps generales del dashboard (vacío o migrado)
│   │
│   └── form/             # Formulario médico y su lógica
│       ├── components/   # Secciones del formulario (paciente, servicio, pagos)
│       ├── components/payment/  # Métodos de pago
│       ├── layouts/      # Encabezado o layout del formulario
│       ├── lib/          # Schema de validación, lógica de envío
│       ├── lib/payment/  # Utilidades de pagos
│       └── pages/        # Página principal del formulario
│
├── shared/               # Código reutilizable entre features
│   ├── components/
│   │   ├── ui/           # Botones, inputs, selects, popovers, etc.
│   │   └── cases/        # Components como CaseDetailPanel, CasesTable
│   ├── hooks/            # Hooks personalizados reutilizables
│   ├── lib/              # Funciones generales (`cn`, `utils`, etc.)
│   └── types/            # Tipos TypeScript compartidos
│
├── lib/                  # Integraciones o servicios externos
│   ├── supabase/         # Configuración y migraciones
│   └── supabase-service.ts
│
├── assets/               # Recursos estáticos (imágenes, íconos, fuentes)
├── App.tsx               # Root de la aplicación
├── main.tsx              # Entry point
├── index.css             # Estilos globales
