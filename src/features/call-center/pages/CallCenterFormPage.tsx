import React, { useState } from 'react'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { createCallCenterRegistro } from '@services/supabase/call-center/call-center-registros-service'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import { FormDropdown, createDropdownOptions } from '@shared/components/ui/form-dropdown'
import { useToast } from '@shared/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const MOTIVO_OPCIONES = [
  'Precios',
  'Dirección',
  'Horarios',
  'Resultado Pendiente - Laboratorio',
  'Resultado Pendiente - Imagenología',
  'Vuelve a llamar por sus resultados',
  'Servicio/Estudio no realizado en SPT',
  'Faltan días para que el resultado esté listo',
  'Metodos de Pago',
  'Se corto la llamada',
  'Vuelto Pendiente',
  'Reclamo',
  'Otro',
]
const SEDE_OPCIONES = [
  'Ambulatorio Hatillo',
  'Cafetal',
  'Paseo El Hatillo',
  'Santa Fe',
  'Las Minas',
  'NA',
]

const inputStyles =
  'h-10 rounded-md border border-input bg-background px-3 py-2 text-sm transition-transform duration-300 focus:border-primary focus:ring-primary hover:border-primary/50'

const CallCenterFormPage: React.FC = () => {
  const { laboratory } = useLaboratory()
  const { profile } = useUserProfile()
  const { toast } = useToast()
  const [nombreApellido, setNombreApellido] = useState('')
  const [telefono1, setTelefono1] = useState('')
  const [telefono2, setTelefono2] = useState('')
  const [motivoLlamada, setMotivoLlamada] = useState('')
  const [respuestaObservaciones, setRespuestaObservaciones] = useState('')
  const [referidoSede, setReferidoSede] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!laboratory?.id) return
    if (!nombreApellido.trim()) {
      toast({ title: 'Nombre y apellido es requerido', variant: 'destructive' })
      return
    }
    if (!motivoLlamada) {
      toast({ title: 'Motivo de la llamada es requerido', variant: 'destructive' })
      return
    }
    if (!referidoSede?.trim()) {
      toast({ title: 'Referido a sede es requerido', variant: 'destructive' })
      return
    }
    setSaving(true)
    const result = await createCallCenterRegistro(laboratory.id, {
      nombre_apellido: nombreApellido.trim(),
      telefono_1: telefono1.trim() || undefined,
      telefono_2: telefono2.trim() || undefined,
      motivo_llamada: motivoLlamada,
      respuesta_observaciones: respuestaObservaciones.trim() || undefined,
      referido_sede: referidoSede || undefined,
      atendido_por: profile?.display_name ?? undefined,
    })
    setSaving(false)
    if (result.success) {
      toast({ title: 'Registro guardado correctamente' })
      setNombreApellido('')
      setTelefono1('')
      setTelefono2('')
      setMotivoLlamada('')
      setRespuestaObservaciones('')
      setReferidoSede('')
    } else {
      toast({ title: result.error ?? 'Error al guardar', variant: 'destructive' })
    }
  }

  if (!laboratory?.id) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="">
      <div className="flex justify-between mb-3 sm:mb-4 md:mb-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
                Registro de llamadas
              </h2>
              <div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
            </div>
          </div>
          <h3 className="text-sm font-semibold mt-2 sm:mt-3">
            Bienvenido,{' '}
            <span style={{ color: laboratory?.branding?.primaryColor || undefined }}>
              {profile?.display_name ?? 'Usuario'}
            </span>
          </h3>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-6">
        <Card className="transition-transform duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Datos de la llamada</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 flex flex-wrap gap-2 sm:gap-3">
            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label htmlFor="nombre">Nombre y apellido *</Label>
              <Input
                id="nombre"
                value={nombreApellido}
                onChange={(e) => setNombreApellido(e.target.value)}
                placeholder="John Doe"
                className={inputStyles}
                required
              />
            </div>
            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label htmlFor="tel1">Número de teléfono 1</Label>
              <Input
                id="tel1"
                type="tel"
                value={telefono1}
                onChange={(e) => setTelefono1(e.target.value)}
                placeholder="0412-1234567"
                className={inputStyles}
              />
            </div>
            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label htmlFor="tel2">Número de teléfono 2</Label>
              <Input
                id="tel2"
                type="tel"
                value={telefono2}
                onChange={(e) => setTelefono2(e.target.value)}
                placeholder="0412-1234567"
                className={inputStyles}
              />
            </div>
            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label>Motivo de la llamada *</Label>
              <FormDropdown
                options={createDropdownOptions(MOTIVO_OPCIONES.map((m) => ({ value: m, label: m })))}
                value={motivoLlamada}
                onChange={setMotivoLlamada}
                placeholder="Seleccione una opción"
                className={inputStyles}
              />
            </div>
            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label>Referido a sede *</Label>
              <FormDropdown
                options={createDropdownOptions(SEDE_OPCIONES.map((s) => ({ value: s, label: s })))}
                value={referidoSede}
                onChange={setReferidoSede}
                placeholder="Seleccione una sede"
                className={inputStyles}
              />
            </div>
            <div className="w-full space-y-1.5">
              <Label htmlFor="observaciones">Respuesta / Observaciones</Label>
              <textarea
                id="observaciones"
                value={respuestaObservaciones}
                onChange={(e) => setRespuestaObservaciones(e.target.value)}
                placeholder="Añadir comentarios adicionales"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform duration-300 hover:border-primary/50"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={saving}
            className="w-full font-bold text-sm sm:text-base py-1.5 sm:py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-transform duration-300 transform hover:-translate-y-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Enviar'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CallCenterFormPage
