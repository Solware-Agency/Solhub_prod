// =====================================================================
// SCRIPT PARA LIMPIAR PACIENTES DUPLICADOS - VERSIÓN CONSOLA
// =====================================================================
// Copiar y pegar este código en la consola del navegador

async function cleanupDuplicates() {
  try {
    console.log('🔍 Buscando pacientes duplicados...')

    // Obtener todos los pacientes
    const { data: allPatients, error } = await supabase
      .from('patients')
      .select('id, cedula, nombre, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    // Agrupar por número de cédula (sin prefijo)
    const groupedByNumber = {}

    allPatients?.forEach(patient => {
      const cedulaNumber = patient.cedula.replace(/^[VEJC]-/, '')
      if (!groupedByNumber[cedulaNumber]) {
        groupedByNumber[cedulaNumber] = []
      }
      groupedByNumber[cedulaNumber].push(patient)
    })

    // Encontrar duplicados
    const duplicates = []

    Object.entries(groupedByNumber).forEach(([cedulaNumber, patients]) => {
      if (patients.length > 1) {
        duplicates.push({ cedulaNumber, patients })
      }
    })

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
    const confirm = window.confirm(`¿Deseas consolidar estos ${duplicates.length} grupos de duplicados?`)

    if (confirm) {
      console.log('🔄 Consolidando duplicados...')
      const results = []

      for (const { cedulaNumber, patients } of duplicates) {
        // Ordenar por fecha de creación (más reciente primero)
        const sortedPatients = patients.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        const keepPatient = sortedPatients[0] // El más reciente
        const deletePatients = sortedPatients.slice(1) // Los duplicados

        console.log(`🔄 Consolidando cédula ${cedulaNumber}:`)
        console.log(`   ✅ Mantener: ${keepPatient.cedula} (${keepPatient.nombre})`)

        // Eliminar duplicados
        for (const patient of deletePatients) {
          console.log(`   ❌ Eliminar: ${patient.cedula} (${patient.nombre})`)

          const { error: deleteError } = await supabase
            .from('patients')
            .delete()
            .eq('id', patient.id)

          if (deleteError) {
            console.error(`Error eliminando paciente ${patient.id}:`, deleteError)
          } else {
            results.push({
              action: 'deleted',
              patient: patient,
              kept: keepPatient
            })
          }
        }
      }

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
