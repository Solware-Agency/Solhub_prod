// =====================================================================
// SCRIPT PARA LIMPIAR PACIENTES DUPLICADOS
// =====================================================================
// Ejecutar este script en la consola del navegador para limpiar duplicados

import { findDuplicatePatients, consolidateDuplicatePatients } from './src/lib/patients-service.js'

async function cleanupDuplicates() {
  try {
    console.log('🔍 Buscando pacientes duplicados...')

    const duplicates = await findDuplicatePatients()

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron pacientes duplicados')
      return
    }

    console.log(`⚠️ Encontrados ${duplicates.length} grupos de pacientes duplicados:`)

    duplicates.forEach(({ cedulaNumber, patients }) => {
      console.log(`\n📋 Cédula ${cedulaNumber}:`)
      patients.forEach(patient => {
        console.log(`   - ${patient.cedula} (${patient.nombre}) - ${patient.created_at}`)
      })
    })

    // Preguntar confirmación
    const confirm = confirm(`¿Deseas consolidar estos ${duplicates.length} grupos de duplicados?`)

    if (confirm) {
      console.log('🔄 Consolidando duplicados...')
      const results = await consolidateDuplicatePatients(duplicates)

      console.log(`✅ Consolidación completada. ${results.length} pacientes duplicados eliminados.`)

      // Mostrar resumen
      results.forEach(result => {
        console.log(`   ❌ Eliminado: ${result.patient.cedula} (${result.patient.nombre})`)
        console.log(`   ✅ Mantenido: ${result.kept.cedula} (${result.kept.nombre})`)
      })
    } else {
      console.log('❌ Consolidación cancelada')
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
  }
}

// Ejecutar la función
cleanupDuplicates()
