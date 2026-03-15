/**
 * CHATBOT DECISION TREE - SOLHUB
 * Sistema de ayuda contextual por roles
 */

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface Message {
  id: number
  text: string
  isBot: boolean
  timestamp: Date
  options?: string[]
  details?: string[]
}

export interface BotResponse {
  text: string
  options?: string[]
  details?: string[]
  responses?: Record<string, string>
}

export type UserRole = 
  | 'owner' 
  | 'admin' 
  | 'employee' 
  | 'coordinador'
  | 'enfermero' 
  | 'imagenologia' 
  | 'medico_tratante' 
  | 'laboratorio'
  | 'citotecno'
  | 'patologo'
  | 'call_center'
  | 'residente'
  | 'prueba'

interface RoleDefinition {
  name: string
  permissions: string[]
  restrictions: string[]
  modules: string[]
}

// ============================================
// DEFINICIONES POR ROL
// ============================================

export const roleDefinitions: Record<string, RoleDefinition> = {
  owner: {
    name: 'OWNER (Administrador del Ecosistema)',
    permissions: [
      'Control total: Registrar, editar, clasificar (triaje), diagnosticar (informes) y gestionar enlaces (Drive)',
      'Gestión de usuarios: Crear, editar y dar de baja cuentas de personal',
      'Auditoría profunda: Revisar el historial de cambios de cualquier caso para detectar errores'
    ],
    restrictions: [
      'Funcionalmente no tiene restricciones'
    ],
    modules: [
      'Estadísticas y Dashboard: Visualización de gráficos de rendimiento, volumen de pacientes y métricas críticas',
      'Usuarios: Panel para administrar las credenciales y accesos de todo el equipo',
      'Formulario/Casos/Pacientes: Acceso total a la base de datos para correcciones manuales'
    ]
  },

  employee: {
    name: 'RECEPCIÓN (Gestión de Identidad y Acceso)',
    permissions: [
      'Registro de Entrada: Crear la ficha del paciente desde cero',
      'Curación de Datos: Corregir nombres, documentos de identidad o datos de contacto',
      'Cierre Administrativo: Enviar el informe final una vez que el médico lo libera'
    ],
    restrictions: [
      'No tiene criterio clínico: No puede hacer triaje ni opinar sobre el diagnóstico',
      'No puede adjuntar estudios (Drive), ya que no es un área técnica de imagen'
    ],
    modules: [
      'Formulario de Registro: Interfaz optimizada para la captura rápida de datos personales',
      'Pacientes: Directorio central para buscar y editar perfiles existentes',
      'Historial: Consulta de movimientos administrativos previos'
    ]
  },

  coordinador: {
    name: 'COORDINADOR (Gestión Avanzada Administrativa)',
    permissions: [
      'Registro de Entrada: Crear la ficha del paciente desde cero',
      'Curación de Datos: Corregir nombres, documentos de identidad o datos de contacto',
      'Cierre Administrativo: Enviar el informe final una vez que el médico lo libera',
      'Descargar archivos PDFs o documentos médicos'
    ],
    restrictions: [
      'No tiene criterio clínico: No puede hacer triaje ni opinar sobre el diagnóstico'
    ],
    modules: [
      'Formulario de Registro: Interfaz optimizada para la captura rápida de datos personales',
      'Pacientes: Directorio central para buscar y editar perfiles existentes',
      'Historial: Consulta de movimientos administrativos previos'
    ]
  },

  enfermero: {
    name: 'ENFERMERÍA (Gestión del Flujo Clínico-Operativo)',
    permissions: [
      'Triaje: Clasificar la prioridad del paciente según su estado de salud o tipo de examen',
      'Monitoreo: Cambiar estados del caso para que el médico sepa qué está listo',
      'Historia Clínica: Puede realizar historia clínica básica y tomar signos vitales'
    ],
    restrictions: [
      'No puede registrar pacientes nuevos (esto evita errores de duplicidad que deben ser de Recepción)',
      'No puede redactar el informe médico final'
    ],
    modules: [
      'Casos: Vista tipo "tablero" para gestionar el avance de los pacientes',
      'Módulo de Triaje: Espacio para registrar signos vitales o criterios de prioridad'
    ]
  },

  imagenologia: {
    name: 'IMAGENOLOGÍA (Gestión de Activos Digitales)',
    permissions: [
      'Integración de Drive: Cargar o actualizar el link de Google Drive donde reside el estudio (DICOM/Imágenes)',
      'Verificación Técnica: Asegurar que el link sea accesible para que el médico pueda verlo',
      'Ver Historial: Confirmar que el estudio corresponde a la secuencia correcta de atención'
    ],
    restrictions: [
      'No registra pacientes ni edita sus datos personales',
      'No realiza triaje ni escribe informes'
    ],
    modules: [
      'Gestión de URL: Herramienta específica dentro de la vista del caso para la inserción y reemplazo de enlaces externos'
    ]
  },

  medico_tratante: {
    name: 'MÉDICO TRATANTE / LABORATORIO (Autoría Clínica)',
    permissions: [
      'Diagnóstico: Redactar, editar y finalizar el informe clínico',
      'Firma Digital: Validar el documento con su credencial profesional',
      'Revisión de Antecedentes: Consultar la Historia Clínica previa para un mejor juicio',
      'Editar datos personales: Puede modificar información de pacientes en el módulo Pacientes',
      'Enviar informes: Puede entregar directamente resultados al paciente'
    ],
    restrictions: [
      'No debe realizar tareas de registro (Recepción) ni de triaje (Enfermería) para mantener la integridad de la cadena de mando'
    ],
    modules: [
      'Editor de Informes: Un procesador de texto integrado para redactar el resultado',
      'Historia Clínica: Acceso a la cronología de estudios del paciente',
      'Módulo Pacientes: Para editar datos personales cuando sea necesario'
    ]
  },

  laboratorio: {
    name: 'LABORATORIO (Autoría Clínica)',
    permissions: [
      'Diagnóstico: Redactar, editar y finalizar el informe clínico',
      'Firma Digital: Validar el documento con su credencial profesional (firma propia)',
      'Revisión de Antecedentes: Consultar la Historia Clínica previa',
      'Enviar informes: Puede entregar directamente resultados al paciente'
    ],
    restrictions: [
      'No debe realizar tareas de registro ni de triaje'
    ],
    modules: [
      'Editor de Informes: Procesador de texto para redactar resultados',
      'Historia Clínica: Acceso a estudios previos del paciente'
    ]
  },

  citotecno: {
    name: 'CITOTECNÓLOGO (Análisis de Citología)',
    permissions: [
      'Ver casos médicos: Solo de tipo Citología',
      'Generar documentos médicos: Crear informes de citología'
    ],
    restrictions: [
      'No puede rellenar formularios de registro',
      'No puede ver montos totales (protección financiera)',
      'No tiene acceso para editar casos médicos',
      'Solo puede trabajar con casos de citología'
    ],
    modules: [
      'Casos (Filtrados): Vista exclusiva de casos tipo Citología',
      'Generador de Documentos: Herramienta para crear informes técnicos'
    ]
  },

  patologo: {
    name: 'PATÓLOGO (Análisis de Biopsias e Inmunohistoquímica)',
    permissions: [
      'Ver casos médicos: Solo de tipo Biopsia e Inmunohistoquímica',
      'Generar documentos médicos: Crear informes de patología'
    ],
    restrictions: [
      'No puede rellenar formularios de registro',
      'No puede ver montos totales (protección financiera)',
      'No tiene acceso para editar casos médicos',
      'Solo puede trabajar con casos de biopsia e inmunohistoquímica'
    ],
    modules: [
      'Casos (Filtrados): Vista exclusiva de casos tipo Biopsia e Inmunohistoquímica',
      'Generador de Documentos: Herramienta para crear informes de patología'
    ]
  },

  call_center: {
    name: 'CALL CENTER (Seguimiento y Logística de Entrega)',
    permissions: [
      'Comunicación: Enviar informes por WhatsApp, Email o el canal configurado',
      'Seguimiento Operativo: Marcar casos como "entregados" y gestionar reclamos de envío',
      'Ver Casos/Pacientes: Visualizar si el informe está generado para enviarlo'
    ],
    restrictions: [
      'No puede alterar ningún dato: ni del paciente, ni del informe, ni de la imagen',
      'Es un rol de "solo lectura" con permisos de envío'
    ],
    modules: [
      'Bandeja de Salida / Casos: Filtros específicos para identificar qué informes están listos pero aún no han sido enviados al paciente'
    ]
  }
}

// ============================================
// PREGUNTAS FRECUENTES UNIVERSALES (30)
// ============================================

export const universalFAQs: Array<{ question: string; answer: string; category: string }> = [
  {
    category: 'Gestión de Pacientes',
    question: '¿Quién es el responsable de registrar a un paciente nuevo en el sistema?',
    answer: 'Todos los usuarios pueden registrar nuevos pacientes mediante el módulo "Formulario".'
  },
  {
    category: 'Gestión de Pacientes',
    question: '¿Puede un médico corregir los datos personales de un paciente si detecta un error en su nombre o identificación?',
    answer: 'El Médico Tratante puede editar los datos personales entrando en el módulo de "Pacientes", y seleccionando dicho paciente a editar.'
  },
  {
    category: 'Flujo Operativo',
    question: '¿Cómo se garantiza que el médico pueda ver las imágenes del estudio antes de realizar el informe?',
    answer: 'A través del rol de Imagenología. Este usuario tiene el módulo específico para adjuntar o reemplazar la URL de Google Drive asociada al caso. Una vez que el técnico de imagenología carga el enlace, este queda disponible en la vista del caso para que el médico pueda acceder al estudio.'
  },
  {
    category: 'Flujo Operativo',
    question: '¿Qué sucede si un paciente llega y quien realiza su historia médica?',
    answer: 'El usuario de Médico Tratante es el responsable del módulo de historia médica. Su función es clasificar el caso según los criterios del servicio, lo que permite que el sistema priorice el flujo operativo. Por otro lado, los usuarios Enfermeros pueden realizar una historia clínica, pero solo pueden tomar los signos vitales del paciente.'
  },
  {
    category: 'Seguridad y Accesos',
    question: '¿El personal de Call Center puede ver los resultados clínicos del paciente?',
    answer: 'El Call Center tiene permiso para "Ver Casos/Pacientes", lo que les permite visualizar si el informe ya fue generado para poder enviarlo. Sin embargo, su función no es clínica, por lo que no pueden editar ni generar contenido; su acceso es principalmente para seguimiento y logística de entrega.'
  },
  {
    category: 'Seguridad y Accesos',
    question: '¿Qué herramientas de seguridad tiene SolHub para evitar que una sesión quede abierta por error?',
    answer: 'Todos los roles cuentan con un módulo de Ajustes donde se puede configurar el "Tiempo de inactividad". Esta función permite establecer un cierre automático de sesión tras un periodo de tiempo sin uso, protegiendo la información sensible del paciente.'
  },
  {
    category: 'Seguridad y Accesos',
    question: '¿Quién tiene acceso a todas las herramientas de SolHub?',
    answer: 'El usuario Owner. Es el único rol con acceso total a todos los módulos (Estadísticas, Usuarios, Historia Clínica, etc.) y puede ejecutar cualquier acción de los otros roles para desatascar un proceso operativo.'
  },
  {
    category: 'Informes y Entrega',
    question: '¿Cómo se le entrega el resultado final al paciente dentro del ecosistema?',
    answer: 'Una vez que el Médico Tratante o el Laboratorio finalizan y validan el informe, varios roles (Call Center, Recepción, Enfermería) tienen el permiso de "Enviar Informes". Esto se hace generalmente a través de los canales digitales integrados o configurados por la operación (como WhatsApp o Email).'
  },
  {
    category: 'Reportes y Estadísticas',
    question: '¿Es posible obtener un reporte de cuántos pacientes se atendieron en un mes?',
    answer: 'Sí. Todos los roles tienen el permiso de "Exportar Data" en formato PDF o Excel desde sus respectivos módulos de Casos o Pacientes. Sin embargo, el Owner tiene acceso al módulo de Estadísticas, donde puede ver esta información de forma gráfica y consolidada.'
  },
  {
    category: 'Flujo Operativo',
    question: '¿Puede el personal de Enfermería cargar las imágenes de un estudio de Rayos X o Tomografía?',
    answer: 'No. Aunque Enfermería es un rol clínico, la función de gestionar los activos digitales (links de Drive) es exclusiva de Imagenología (y el Owner). Esto asegura que cada área se responsabilice de su parte técnica en la cadena de atención.'
  },
  {
    category: 'Módulos Específicos',
    question: '¿Qué información específica puede ver un usuario de Enfermería en su módulo de "Casos"?',
    answer: 'Puede visualizar el listado de pacientes, el estado actual del caso (si está en triaje, pendiente de informe, etc.), el historial de cambios y, fundamentalmente, tiene acceso al formulario para registrar los signos vitales o criterios clínicos en el sub-módulo de Triaje.'
  },
  {
    category: 'Gestión Técnica',
    question: 'Si un enlace de Drive está roto o es incorrecto, ¿qué rol debe corregirlo?',
    answer: 'El rol de Imagenología es el responsable técnico de "Adjuntar o Reemplazar" la URL. Aunque el Owner también puede hacerlo, el flujo estándar delega esta tarea al técnico de imágenes para asegurar que el médico visualice el estudio correcto.'
  },
  {
    category: 'Flujo Operativo',
    question: '¿Puede el personal de Call Center modificar el estado de un caso a "Finalizado"?',
    answer: 'No directamente. El estado del caso cambia según las acciones realizadas (como cuando el médico valida el informe). El Call Center se enfoca en el seguimiento operativo y el envío, registrando que la comunicación con el paciente fue efectiva.'
  },
  {
    category: 'Restricciones',
    question: '¿Qué sucede si Recepción intenta realizar un triaje por error?',
    answer: 'El sistema no se lo permitirá. Según la matriz de permisos, el botón o acceso al módulo de Triaje está bloqueado para Recepción. Su interfaz está limitada a la gestión de datos demográficos y registro administrativo.'
  },
  {
    category: 'Flujo Operativo',
    question: '¿Cómo sabe el Médico Tratante qué pacientes están listos para ser informados?',
    answer: 'A través del módulo de Casos, donde puede filtrar por pacientes que ya han pasado por las etapas previas de Triaje (Enfermería) y carga de imágenes (Imagenología).'
  },
  {
    category: 'Seguridad y Accesos',
    question: '¿Puede un usuario restablecer su contraseña si la olvidó?',
    answer: 'Sí. SolHub cuenta con la funcionalidad de "Recuperar contraseña", disponible desde la pantalla de login. El usuario recibirá un correo electrónico con las instrucciones para crear una nueva contraseña.'
  },
  {
    category: 'Personalización',
    question: '¿Puede un usuario cambiar el modo visual del sistema (por ejemplo, a modo oscuro)?',
    answer: 'Sí. En el módulo de Ajustes, todos los roles pueden activar o desactivar el "Modo Oscuro" o cambiar otras preferencias visuales, mejorando la experiencia según el ambiente de trabajo.'
  },
  {
    category: 'Auditoría',
    question: '¿Qué información se guarda en el historial de acciones de un caso?',
    answer: 'SolHub registra cada acción relevante: quién creó el caso, quién realizó el triaje, quién adjuntó imágenes, quién validó el informe, etc. Esto permite trazabilidad completa para auditoría y mejora de procesos.'
  },
  {
    category: 'Módulos Específicos',
    question: '¿Qué roles pueden registrar o modificar la historia clínica de un paciente?',
    answer: 'El Médico Tratante es el rol principal para la historia clínica completa. Enfermería puede colaborar con los signos vitales y observaciones de triaje, pero la autoridad clínica final recae en el médico.'
  },
  {
    category: 'Informes y Entrega',
    question: '¿Qué rol puede editar el informe radiológico o de laboratorio después de ser generado?',
    answer: 'El rol de Médico Tratante puede corregir o modificar el informe hasta el momento de su validación final. Una vez validado, se considera un documento oficial y solo el Owner podría revertir ese estado en casos excepcionales.'
  },
  {
    category: 'Gestión de Pacientes',
    question: '¿Cuál es la diferencia entre el módulo de "Casos" y el módulo de "Pacientes"?',
    answer: 'El módulo de Pacientes muestra la ficha demográfica y el historial completo del paciente. El módulo de Casos muestra cada orden de servicio o estudio individual solicitado, permitiendo un seguimiento operativo específico.'
  },
  {
    category: 'Roles Administrativos',
    question: '¿Qué rol puede eliminar registros en el sistema?',
    answer: 'Por razones de seguridad y trazabilidad, eliminaciones de casos o pacientes son altamente restringidas y solo el Owner o el Coordinador con permisos especiales pueden ejecutar esta acción, siempre dejando un registro en el log del sistema.'
  },
  {
    category: 'Reportes y Estadísticas',
    question: '¿En qué formatos puedo exportar los datos de casos y pacientes?',
    answer: 'SolHub permite exportar en PDF (para visualización e impresión) y en Excel (para análisis de datos). Estos formatos son accesibles desde los botones de "Exportar Data" en los módulos correspondientes.'
  },
  {
    category: 'Roles y Permisos',
    question: '¿Puede el mismo usuario tener múltiples roles?',
    answer: 'Depende de la configuración de la organización. SolHub permite asignar un rol por usuario para mantener una clara separación de funciones, pero el Owner puede ajustar roles según las necesidades operativas del centro.'
  },
  {
    category: 'Gestión Técnica',
    question: '¿Qué sucede si un técnico de Imagenología carga enlaces erróneos de forma repetida?',
    answer: 'El sistema registra todas las acciones en el historial del caso. El Coordinador o el Owner pueden auditar estos logs para detectar errores recurrentes y tomar decisiones sobre capacitación o ajustes de flujo.'
  },
  {
    category: 'Informes y Entrega',
    question: '¿Puede un médico imprimir directamente el informe sin enviarlo primero?',
    answer: 'Sí. El proceso de validar y generar el PDF es independiente del envío. Una vez el médico valida el informe, puede descargarlo en PDF para imprimirlo, y posteriormente el equipo de Call Center o Recepción lo envía al paciente.'
  },
  {
    category: 'Informes y Entrega',
    question: '¿Es posible enviar el informe por múltiples vías simultáneamente (email, WhatsApp)?',
    answer: 'Sí. El rol con permiso de "Enviar Informes" puede seleccionar el canal de comunicación preferido del paciente registrado en el sistema. Algunos laboratorios configuran envíos automáticos multicanal.'
  },
  {
    category: 'Reportes y Estadísticas',
    question: '¿Qué información contiene el PDF final que recibe el paciente?',
    answer: 'El informe incluye los datos demográficos del paciente, el motivo de consulta, los hallazgos clínicos o de laboratorio, las conclusiones del médico tratante, y la firma digital del profesional que validó el estudio.'
  }
]

// ============================================
// ÁRBOL DE DECISIÓN BASE
// ============================================

export const getBotDecisionTree = (
  userRole: UserRole // reservado para personalización por rol
) => {
  void userRole
  return {
    initial: {
      id: 0,
      text: `¡Hola! Soy tu asistente Solwy\n\n¿En qué puedo ayudarte hoy?`,
      isBot: true,
      timestamp: new Date(),
      options: [
        "¿Qué puedo hacer?",
        "¿Qué NO puedo hacer?",
        "Mis módulos específicos",
        "Preguntas frecuentes",
        "Reportar una falla"
      ]
    }
  }
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

// Obtener categorías únicas de las FAQs
const getFAQCategories = (): string[] => {
  const categories = new Set<string>()
  universalFAQs.forEach(faq => categories.add(faq.category))
  return Array.from(categories)
}

// Obtener preguntas de una categoría específica
const getQuestionsForCategory = (category: string): Array<{ question: string; answer: string }> => {
  return universalFAQs.filter(faq => faq.category === category)
}

// Formatear permisos del rol
const formatPermissions = (userRole: UserRole): string => {
  const role = roleDefinitions[userRole]
  if (!role) return "No se encontró información para tu rol."
  
  let message = `**Como ${userRole}, PUEDES:**\n\n`
  role.permissions.forEach((permission, index) => {
    message += `${index + 1}. ${permission}\n`
  })
  return message
}

// Formatear restricciones del rol
const formatRestrictions = (userRole: UserRole): string => {
  const role = roleDefinitions[userRole]
  if (!role) return "No se encontró información para tu rol."
  
  if (role.restrictions.length === 0) {
    return `**Como ${userRole}, ¡NO tienes restricciones!**\n\nTienes acceso completo a todas las funcionalidades del sistema.`
  }
  
  let message = `**Como ${userRole}, NO PUEDES:**\n\n`
  role.restrictions.forEach((restriction, index) => {
    message += `${index + 1}. ${restriction}\n`
  })
  return message
}

// Formatear módulos específicos del rol
const formatModules = (userRole: UserRole): string => {
  const role = roleDefinitions[userRole]
  if (!role) return "No se encontró información para tu rol."
  
  if (role.modules.length === 0) {
    return `**Como ${userRole}, no tienes módulos específicos asignados.**\n\nTienes acceso a los módulos generales del sistema.`
  }
  
  let message = `**Tus módulos específicos como ${userRole}:**\n\n`
  role.modules.forEach((module, index) => {
    message += `${index + 1}. ${module}\n`
  })
  return message
}

// Función principal para procesar respuestas del bot
export const handleBotResponse = (
  userInput: string,
  currentMessagesLength: number,
  userRole: UserRole
): Message => {
  const baseId = currentMessagesLength + 2
  const timestamp = new Date()
  
  // Detectar opción del menú principal
  if (userInput === "¿Qué puedo hacer?") {
    return {
      id: baseId,
      text: formatPermissions(userRole),
      isBot: true,
      timestamp,
      options: ["Volver al menú", "Preguntas frecuentes"]
    }
  }
  
  if (userInput === "¿Qué NO puedo hacer?") {
    return {
      id: baseId,
      text: formatRestrictions(userRole),
      isBot: true,
      timestamp,
      options: ["Volver al menú", "Preguntas frecuentes"]
    }
  }
  
  if (userInput === "Mis módulos específicos") {
    return {
      id: baseId,
      text: formatModules(userRole),
      isBot: true,
      timestamp,
      options: ["Volver al menú", "Preguntas frecuentes"]
    }
  }
  
  if (userInput === "Preguntas frecuentes") {
    const categories = getFAQCategories()
    return {
      id: baseId,
      text: "**Selecciona una categoría:**\n\nElige el tema sobre el que necesitas ayuda:",
      isBot: true,
      timestamp,
      options: [...categories, "Volver al menú"]
    }
  }
  
  // Detectar selección de categoría
  const selectedCategory = universalFAQs.find(faq => faq.category === userInput)
  if (selectedCategory) {
    const category = userInput
    const questions = getQuestionsForCategory(category)
    
    if (questions.length === 0) {
      return {
        id: baseId,
        text: "No se encontraron preguntas para esta categoría.",
        isBot: true,
        timestamp,
        options: ["Preguntas frecuentes", "Volver al menú"]
      }
    }
    
    return {
      id: baseId,
      text: `**${category}**\n\nSelecciona una pregunta:`,
      isBot: true,
      timestamp,
      options: [
        ...questions.map(q => q.question),
        "Preguntas frecuentes",
        "Volver al menú"
      ]
    }
  }
  
  // Detectar selección de pregunta (buscar en todas las FAQs)
  const selectedFAQ = universalFAQs.find(faq => faq.question === userInput)
  if (selectedFAQ) {
    return {
      id: baseId,
      text: `**${selectedFAQ.question}**\n\n${selectedFAQ.answer}`,
      isBot: true,
      timestamp,
      options: ["Otra pregunta", "Volver al menú"]
    }
  }
  
  // Detectar "Volver al menú"
  if (userInput === "Volver al menú") {
    return getBotDecisionTree(userRole).initial
  }
  
  // Detectar "Otra pregunta"
  if (userInput === "Otra pregunta") {
    const categories = getFAQCategories()
    return {
      id: baseId,
      text: "**Selecciona una categoría:**\n\nElige el tema sobre el que necesitas ayuda:",
      isBot: true,
      timestamp,
      options: [...categories, "Volver al menú"]
    }
  }
  
  // Si no coincide con nada, respuesta por defecto
  return {
    id: baseId,
    text: "Lo siento, no entendí tu mensaje. Por favor, usa las opciones del menú.",
    isBot: true,
    timestamp,
    options: ["Volver al menú"]
  }
}

export const handleOptionClick = (
  option: string,
  currentMessagesLength: number,
  _userRole: UserRole // eslint-disable-line @typescript-eslint/no-unused-vars
): Message | null => {
  // Crear mensaje del usuario con la opción seleccionada
  return {
    id: currentMessagesLength + 1,
    text: option,
    isBot: false,
    timestamp: new Date()
  }
}
