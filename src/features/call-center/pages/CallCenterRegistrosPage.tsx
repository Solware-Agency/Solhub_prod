import React, { useEffect, useState, useCallback } from 'react'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import {
  getCallCenterRegistros,
  type CallCenterRegistro,
} from '@services/supabase/call-center/call-center-registros-service'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import DateRangeSelector, { type DateRange } from '@shared/components/ui/date-range-selector'
import { Download, Loader2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'

function downloadExcel(registros: CallCenterRegistro[]) {
  const rows = registros.map((r) => ({
    Fecha: format(new Date(r.created_at), 'dd/MM/yyyy', { locale: es }),
    'Nombre y apellido': r.nombre_apellido ?? '',
    'Teléfono 1': r.telefono_1 ?? '',
    'Teléfono 2': r.telefono_2 ?? '',
    Motivo: r.motivo_llamada ?? '',
    'Respuesta/Observaciones': r.respuesta_observaciones ?? '',
    'Referido a sede': r.referido_sede ?? '',
    'Atendido por': r.atendido_por ?? '',
  }))
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 35 },
    { wch: 40 },
    { wch: 20 },
    { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Registros Call Center')
  const fileName = `call-center-registros-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  XLSX.writeFile(wb, fileName)
}

const CallCenterRegistrosPage: React.FC = () => {
  const { laboratory } = useLaboratory()

  const [registros, setRegistros] = useState<CallCenterRegistro[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
    mode: 'month',
  }))

  const loadRegistros = useCallback(() => {
    if (!laboratory?.id) return
    setLoading(true)
    getCallCenterRegistros(laboratory.id).then((res) => {
      setLoading(false)
      if (res.success && res.data) setRegistros(res.data)
      else setRegistros([])
    })
  }, [laboratory?.id])

  useEffect(() => {
    loadRegistros()
  }, [loadRegistros])

  const registrosFiltrados = registros.filter((r) => {
    const d = new Date(r.created_at)
    return d >= dateRange.start && d <= dateRange.end
  })
  const registrosToExport = registrosFiltrados

  if (!laboratory?.id) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Registros Call Center</h1>
          <div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            className="w-full sm:w-auto"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadExcel(registrosToExport)}
            disabled={registrosToExport.length === 0}
            title="Descargar Excel"
            className="shrink-0 rounded-lg border border-input px-3 py-2 min-h-[2.5rem] min-w-[2.5rem] h-[2.5rem] w-[2.5rem] p-0 flex items-center justify-center"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de llamadas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {registros.length === 0 ? 'No hay registros' : 'No hay registros en el período seleccionado'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Fecha</th>
                    <th className="text-left py-2 px-2 font-medium">Nombre</th>
                    <th className="text-left py-2 px-2 font-medium">Tel 1</th>
                    <th className="text-left py-2 px-2 font-medium">Tel 2</th>
                    <th className="text-left py-2 px-2 font-medium">Motivo</th>
                    <th className="text-left py-2 px-2 font-medium">Observaciones</th>
                    <th className="text-left py-2 px-2 font-medium">Sede</th>
                    <th className="text-left py-2 px-2 font-medium">Atendido por</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 whitespace-nowrap">
                        {format(new Date(r.created_at), 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td className="py-2 px-2">{r.nombre_apellido}</td>
                      <td className="py-2 px-2">{r.telefono_1 ?? '—'}</td>
                      <td className="py-2 px-2">{r.telefono_2 ?? '—'}</td>
                      <td className="py-2 px-2">{r.motivo_llamada}</td>
                      <td className="py-2 px-2 max-w-[200px] truncate" title={r.respuesta_observaciones ?? ''}>
                        {r.respuesta_observaciones ?? '—'}
                      </td>
                      <td className="py-2 px-2">{r.referido_sede ?? '—'}</td>
                      <td className="py-2 px-2">{r.atendido_por ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CallCenterRegistrosPage
