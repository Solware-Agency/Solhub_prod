import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import {
  getCallCenterRegistros,
  type CallCenterRegistro,
} from '@services/supabase/call-center/call-center-registros-service'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'

function getBasePath(pathname: string): string {
  if (pathname.startsWith('/prueba/')) return '/prueba'
  if (pathname.startsWith('/call-center/')) return '/call-center'
  if (pathname.startsWith('/dashboard/')) return '/dashboard'
  return '/prueba'
}

function downloadExcel(registros: CallCenterRegistro[]) {
  const rows = registros.map((r) => ({
    Fecha: format(new Date(r.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
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
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = getBasePath(location.pathname)

  const [registros, setRegistros] = useState<CallCenterRegistro[]>([])
  const [loading, setLoading] = useState(true)

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`${basePath}/call-center`)}
          >
            Nuevo registro
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadExcel(registros)}
            disabled={registros.length === 0}
          >
            <Download className="h-4 w-4" />
            Descargar Excel
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
          ) : registros.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No hay registros</p>
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
                  {registros.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 whitespace-nowrap">
                        {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
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
