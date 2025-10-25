# Arreglos de TypeScript para Multi-Tenant

## Problema
Los tipos generados de Supabase no reconocen `laboratory_id` en la tabla `profiles` ni la tabla `laboratories`.

## Solución
Usar el helper `extractLaboratoryId()` de `@/services/supabase/types/helpers`

## Patrón de Arreglo

### ANTES (con error):
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('laboratory_id')
  .eq('id', userId)
  .single();

if (!profile?.laboratory_id) {
  throw new Error('No lab');
}

const labId = profile.laboratory_id; // ❌ Error de TypeScript
```

### DESPUÉS (sin error):
```typescript
import { extractLaboratoryId } from '@/services/supabase/types/helpers';

const { data: profile } = await supabase
  .from('profiles')
  .select('laboratory_id')
  .eq('id', userId)
  .single();

const labId = extractLaboratoryId(profile); // ✅ Sin error

if (!labId) {
  throw new Error('No lab');
}
```

## Archivos que necesitan arreglo:

1. ✅ `src/app/providers/LaboratoryContext.tsx` - ARREGLADO
2. ✅ `src/services/supabase/patients/patients-service.ts` - ARREGLADO
3. ⚠️ `src/features/changelog/components/ChangelogTable.tsx`
4. ⚠️ `src/features/patients/pages/PatientsPage.tsx`
5. ⚠️ `src/features/users/components/MainUsers.tsx`
6. ⚠️ `src/services/legacy/supabase-service.ts`
7. ⚠️ `src/services/supabase/auth/user-management.ts`
8. ⚠️ `src/services/supabase/cases/medical-cases-service.ts`

## Comando para build
```bash
pnpm run build
```

