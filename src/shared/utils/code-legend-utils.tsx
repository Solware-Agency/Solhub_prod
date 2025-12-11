/**
 * Utilidades para generar leyendas de códigos de casos médicos
 * Soporta múltiples formatos según la configuración del laboratorio
 */

import React from 'react';
import type { Laboratory } from '@/shared/types/types';

/**
 * Tipos de formato de código soportados
 */
type CodeFormat = 'conspat' | 'spt' | 'unknown';

/**
 * Detecta el formato del código basándose en la configuración del laboratorio y el patrón del código
 */
export function detectCodeFormat(
  code: string,
  laboratory: Laboratory | null,
): CodeFormat {
  // Si hay configuración de codeTemplate, usarla
  const codeTemplate = laboratory?.config?.codeTemplate;

  if (codeTemplate) {
    // Detectar formato SPT: {examCode}{counter:4}{month}{year:2}
    if (
      codeTemplate.includes('{examCode}') &&
      codeTemplate.includes('{counter:4}')
    ) {
      return 'spt';
    }
    // Detectar formato Conspat: {type}{year:2}{counter:3}{month}
    if (
      codeTemplate.includes('{type}') &&
      codeTemplate.includes('{counter:3}')
    ) {
      return 'conspat';
    }
  }

  // Detección por patrón del código si no hay configuración
  // Formato Conspat: D + YY + NNN + L (ej: 125001K) - 7 caracteres, empieza con número
  const conspatPattern = /^\d{6}[A-Za-z]$/;
  // Formato SPT: LL + NNNN + L + YY (ej: CI0001K25) - 9-10 caracteres, empieza con letras
  const sptPattern = /^[A-Z]{2}\d{4}[A-Z]\d{2}$/;

  if (conspatPattern.test(code)) {
    return 'conspat';
  }
  if (sptPattern.test(code)) {
    return 'spt';
  }

  return 'unknown';
}

/**
 * Genera la leyenda del código según su formato
 */
export function generateCodeLegend(
  code: string,
  format: CodeFormat,
  laboratory: Laboratory | null,
): React.ReactNode {
  const monthMap: Record<string, string> = {
    A: 'Enero',
    B: 'Febrero',
    C: 'Marzo',
    D: 'Abril',
    E: 'Mayo',
    F: 'Junio',
    G: 'Julio',
    H: 'Agosto',
    I: 'Septiembre',
    J: 'Octubre',
    K: 'Noviembre',
    L: 'Diciembre',
  };

  switch (format) {
    case 'conspat': {
      // Formato: [tipo][año][contador][mes] → 125001K
      const typeDigit = code[0];
      const yearSuffix = code.slice(1, 3);
      const yearNumber = 2000 + Number.parseInt(yearSuffix, 10);
      const caseNumber = code.slice(3, 6);
      const monthLetter = code.slice(6).toUpperCase();

      const examTypeMap: Record<string, string> = {
        '1': 'Citología',
        '2': 'Biopsia',
        '3': 'Inmunohistoquímica',
      };

      const examType = examTypeMap[typeDigit] ?? 'Desconocido';
      const monthName = monthMap[monthLetter] ?? 'Desconocido';

      return (
        <div className='text-xs leading-5 max-w-none'>
          <div className='font-semibold mb-1'>Explicación del código</div>
          <div className='font-mono text-sm mb-1'>{code}</div>
          <ul className='list-disc pl-4 space-y-0.5 text-left text-xs'>
            <li>
              1er dígito: <b>{typeDigit}</b> = {examType}
              {examType === 'Desconocido' &&
                ' (1 = Citología, 2 = Biopsia, 3 = Inmunohistoquímica)'}
            </li>
            <li>
              Siguientes dos: <b>{yearSuffix}</b> = Año {yearNumber}
            </li>
            <li>
              Siguientes tres: <b>{caseNumber}</b> = Consecutivo del mes
            </li>
            <li className='whitespace-nowrap'>
              Última letra: <b>{monthLetter}</b> = {monthName} (A = Enero ... L
              = Diciembre)
            </li>
          </ul>
        </div>
      );
    }

    case 'spt': {
      // Formato: [EXAMEN][contador][MES][año] → CI0001K25
      const codeMappings = laboratory?.config?.codeMappings || {};

      // Extraer partes del código SPT: CI0001K25
      // Buscar el código de examen (2 letras al inicio)
      const examCode = code.slice(0, 2);
      const counter = code.slice(2, 6);
      const monthLetter = code[6].toUpperCase();
      const yearSuffix = code.slice(7, 9);
      const yearNumber = 2000 + Number.parseInt(yearSuffix, 10);

      // Buscar el nombre del examen en los mapeos (buscar por valor)
      const examTypeName =
        Object.entries(codeMappings).find(
          ([, codeValue]) => codeValue === examCode,
        )?.[0] || examCode;

      const monthName = monthMap[monthLetter] ?? 'Desconocido';

      return (
        <div className='text-xs leading-5 max-w-none'>
          <div className='font-semibold mb-1'>Explicación del código</div>
          <div className='font-mono text-sm mb-1'>{code}</div>
          <ul className='list-disc pl-4 space-y-0.5 text-left text-xs'>
            <li>
              Primeras dos letras: <b>{examCode}</b> = {examTypeName}
            </li>
            <li>
              Siguientes cuatro dígitos: <b>{counter}</b> = Consecutivo del mes
            </li>
            <li>
              Letra del mes: <b>{monthLetter}</b> = {monthName} (A = Enero ... L
              = Diciembre)
            </li>
            <li>
              Últimos dos dígitos: <b>{yearSuffix}</b> = Año {yearNumber}
            </li>
          </ul>
        </div>
      );
    }

    default: {
      return <p className='text-xs'>Código del caso.</p>;
    }
  }
}

/**
 * Hook helper para obtener la leyenda del código
 */
export function getCodeLegend(
  code: string | null | undefined,
  laboratory: Laboratory | null,
): React.ReactNode {
  if (!code) {
    return <p className='text-xs'>Código del caso.</p>;
  }

  const format = detectCodeFormat(code, laboratory);
  return generateCodeLegend(code, format, laboratory);
}
