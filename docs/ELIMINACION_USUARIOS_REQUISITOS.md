# Requisitos para Eliminación de Usuarios por Owner

## Resumen
Para que un usuario con rol `owner` pueda eliminar usuarios tanto de `profiles` como de `auth.users`, se necesitan los siguientes componentes:

## 1. Función RPC en Supabase (`delete_user_from_auth`)

### Características requeridas:
- ✅ **SECURITY DEFINER**: Permite acceso a `auth.users` sin permisos directos del cliente
- ✅ **Validación de permisos**: Solo owners pueden ejecutar la función
- ✅ **Validación multi-tenant**: Ambos usuarios deben pertenecer al mismo laboratorio
- ✅ **Prevención de autoeliminación**: El usuario no puede eliminarse a sí mismo
- ✅ **Manejo de restricciones**: Establece `changed_by` a NULL en `audit_logs` antes de eliminar

### Ubicación:
- Archivo: `supabase/migrations/20260125000001_create_delete_user_auth_function.sql`
- Función: `delete_user_from_auth(p_user_id uuid)`

## 2. Restricción de Clave Foránea en `audit_logs`

### Características requeridas:
- ✅ **ON DELETE SET NULL**: Permite eliminar usuarios sin violar restricciones
- ✅ **Preserva auditoría**: Los registros de auditoría se mantienen con `changed_by = NULL`

### Ubicación:
- Archivo: `supabase/migrations/20260125000002_fix_audit_logs_foreign_key.sql`
- Constraint: `audit_logs_changed_by_fkey`

## 3. Función TypeScript (`deleteUser`)

### Orden de eliminación (CRÍTICO):
1. **PRIMERO**: Eliminar de `auth.users` usando función RPC
2. **SEGUNDO**: El perfil se elimina automáticamente por `ON DELETE CASCADE`

### Validaciones:
- ✅ Usuario autenticado
- ✅ Usuario tiene `laboratory_id`
- ✅ Usuario a eliminar pertenece al mismo laboratorio
- ✅ Usuario no puede eliminarse a sí mismo

### Ubicación:
- Archivo: `src/services/supabase/auth/user-management.ts`
- Función: `deleteUser(userId: string)`

## 4. Componente UI (`MainUsers`)

### Características:
- ✅ Botón de eliminar con cooldown de 5 segundos
- ✅ Diálogo de confirmación con advertencia
- ✅ Manejo de errores mejorado
- ✅ Cierre automático del modal incluso si hay error parcial
- ✅ Verificación de eliminación parcial

### Ubicación:
- Archivo: `src/features/users/components/MainUsers.tsx`
- Función: `handleConfirmDelete()`

## 5. Permisos Requeridos

### En Supabase:
- ✅ `GRANT EXECUTE ON FUNCTION delete_user_from_auth(uuid) TO authenticated;`
- ✅ La función tiene `SECURITY DEFINER` para acceso a `auth.users`

### En la aplicación:
- ✅ Solo usuarios con `role = 'owner'` pueden eliminar
- ✅ Validación en función RPC y en función TypeScript

## Flujo de Eliminación

```
1. Usuario owner hace clic en "Eliminar Usuario"
   ↓
2. Se muestra diálogo con cooldown de 5 segundos
   ↓
3. Usuario confirma eliminación
   ↓
4. Se llama a deleteUser(userId)
   ↓
5. deleteUser valida permisos y laboratorio
   ↓
6. Se llama a función RPC delete_user_from_auth(userId)
   ↓
7. Función RPC:
   - Valida que el caller es owner
   - Valida mismo laboratorio
   - Establece changed_by = NULL en audit_logs
   - Elimina de auth.users
   ↓
8. El CASCADE elimina automáticamente el perfil de profiles
   ↓
9. Se refresca la lista de usuarios
   ↓
10. Se cierra el modal
```

## Troubleshooting

### Si el usuario se elimina de profiles pero no de auth.users:
- Verificar que la función RPC tenga `SECURITY DEFINER`
- Verificar que el usuario tenga rol `owner`
- Verificar logs de la función RPC en Supabase

### Si hay error de restricción de clave foránea:
- Verificar que `audit_logs_changed_by_fkey` tenga `ON DELETE SET NULL`
- Ejecutar migración `20260125000002_fix_audit_logs_foreign_key.sql`

### Si el modal no se cierra:
- Verificar manejo de errores en `handleConfirmDelete`
- Verificar que se llame a `setDeleteDialogOpen(false)` incluso en caso de error parcial

## Estado Actual

✅ Función RPC creada y ejecutada
✅ Restricción de clave foránea actualizada
✅ Función TypeScript actualizada con orden correcto
✅ Componente UI actualizado con mejor manejo de errores
✅ Permisos configurados correctamente
