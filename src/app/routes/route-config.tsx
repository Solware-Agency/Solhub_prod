import type { LaboratoryFeatures } from '@/shared/types/types';
import type { ComponentType, LazyExoticComponent } from 'react';
import {
  HomePage,
  StatsPage,
  ReportsPage,
  UsersPage,
  CasesPage,
  PatientsPage,
  ChangelogPage,
  TriajePage,
  DoctorsSection,
  MedicalForm,
  SettingsPage,
  ReceptionistHomePage,
} from './lazy-routes';

export interface RouteConfig {
  path: string;
  feature?: keyof LaboratoryFeatures;
  component: LazyExoticComponent<ComponentType<any>>;
  index?: boolean;
}

// Configuración de rutas para dashboard (owner/medicowner)
export const dashboardRoutes: RouteConfig[] = [
  {
    path: 'home',
    feature: 'hasStats',
    component: HomePage,
  },
  {
    path: 'stats',
    feature: 'hasStats',
    component: StatsPage,
  },
  {
    path: 'reports',
    feature: 'hasReports',
    component: ReportsPage,
  },
  {
    path: 'users',
    feature: 'hasUsers',
    component: UsersPage,
  },
  {
    path: 'cases',
    feature: 'hasCases',
    component: CasesPage,
  },
  {
    path: 'patients',
    feature: 'hasPatients',
    component: PatientsPage,
  },
  {
    path: 'changelog',
    feature: 'hasChangeHistory',
    component: ChangelogPage,
  },
  {
    path: 'triaje',
    feature: 'hasTriaje',
    component: TriajePage,
  },
  {
    path: 'doctors',
    component: DoctorsSection,
  },
  {
    path: 'medical-form',
    component: MedicalForm,
  },
  {
    path: 'settings',
    component: SettingsPage,
  },
];

// Configuración de rutas para employee
export const employeeRoutes: RouteConfig[] = [
  {
    path: 'home',
    component: ReceptionistHomePage,
  },
  {
    path: 'form',
    feature: 'hasForm',
    component: MedicalForm,
  },
  {
    path: 'records',
    feature: 'hasCases',
    component: CasesPage,
  },
  {
    path: 'patients',
    feature: 'hasPatients',
    component: PatientsPage,
  },
  {
    path: 'changelogpage',
    feature: 'hasChangeHistory',
    component: ChangelogPage,
  },
  {
    path: 'settings',
    component: SettingsPage,
  },
];

// Configuración de rutas para medic/residente
export const medicRoutes: RouteConfig[] = [
  {
    path: 'cases',
    feature: 'hasCases',
    component: CasesPage,
  },
  {
    path: 'settings',
    component: SettingsPage,
  },
];

// Configuración de rutas para citotecno
export const citotecnoRoutes: RouteConfig[] = [
  {
    path: 'cases',
    feature: 'hasCases',
    component: CasesPage,
  },
  {
    path: 'settings',
    component: SettingsPage,
  },
];

// Configuración de rutas para patologo
export const patologoRoutes: RouteConfig[] = [
  {
    path: 'cases',
    feature: 'hasCases',
    component: CasesPage,
  },
  {
    path: 'settings',
    component: SettingsPage,
  },
];
