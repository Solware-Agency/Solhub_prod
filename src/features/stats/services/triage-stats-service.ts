import { supabase } from '@/services/supabase/config/config'
import type { HabitLevel } from '@/services/supabase/triage/triage-service'

// NOTA: triaje_records no está en los tipos generados de Supabase
// Ejecutar: npx supabase gen types typescript --local > src/types/supabase.ts
// para actualizar los tipos después de migrar la BD

// Interfaz para los datos de historia clínica (subset mínimo para estadísticas)
interface TriageRecordRaw {
	heart_rate: number | null
	respiratory_rate: number | null
	oxygen_saturation: number | null
	temperature_celsius: number | null
	bmi: number | null
	blood_pressure: number | null
	blood_glucose: number | null // Glicemia (mg/dL)
	tabaco: number | null // Índice tabáquico (paquetes-año)
	cafe: number | null // Tazas de café por día
	alcohol: HabitLevel | null
	measurement_date: string
}

export interface TriageStats {
	totalTriages: number
	averages: {
		heartRate: number | null
		respiratoryRate: number | null
		oxygenSaturation: number | null
		temperature: number | null
		bmi: number | null
		systolicBP: number | null
		diastolicBP: number | null
		bloodGlucose: number | null
	}
	ranges: {
		heartRate: { low: number; normal: number; high: number }
		respiratoryRate: { low: number; normal: number; high: number }
		oxygenSaturation: { low: number; normal: number; high: number }
		temperature: { low: number; normal: number; high: number }
		bmi: { underweight: number; normal: number; overweight: number; obese: number }
		bloodPressure: { low: number; normal: number; high: number }
		bloodGlucose: { low: number; normal: number; high: number }
	}
	habits: {
		tabaco: { [key: string]: number }
		cafe: { [key: string]: number }
		alcohol: { [key: string]: number }
	}
}

export interface TriageTrend {
	date: string
	avgHeartRate: number | null
	avgRespiratoryRate: number | null
	avgOxygenSaturation: number | null
	avgTemperature: number | null
	avgSystolicBP: number | null
	avgBloodGlucose: number | null
	count: number
}

/**
 * Obtiene estadísticas agregadas de historia clínica para un laboratorio
 */
export async function getTriageStats(
	laboratoryId: string,
	startDate?: Date,
	endDate?: Date
): Promise<{ success: boolean; data?: TriageStats; error?: string }> {
	try {
		let query = (supabase as any)
			.from('triaje_records')
			.select('heart_rate, respiratory_rate, oxygen_saturation, temperature_celsius, bmi, blood_pressure, tabaco, cafe, alcohol, measurement_date')
			.eq('laboratory_id', laboratoryId)

		if (startDate) {
			query = query.gte('measurement_date', startDate.toISOString())
		}
		if (endDate) {
			query = query.lte('measurement_date', endDate.toISOString())
		}

		const { data: triages, error } = await query

		if (error) {
			console.error('Error fetching triage stats:', error)
			return { success: false, error: 'Error al obtener estadísticas de historia clínica' }
		}

		if (!triages || triages.length === 0) {
			return {
				success: true,
				data: {
					totalTriages: 0,
					averages: {
						heartRate: null,
						respiratoryRate: null,
						oxygenSaturation: null,
						temperature: null,
						bmi: null,
						systolicBP: null,
						diastolicBP: null,
						bloodGlucose: null,
					},
					ranges: {
						heartRate: { low: 0, normal: 0, high: 0 },
						respiratoryRate: { low: 0, normal: 0, high: 0 },
						oxygenSaturation: { low: 0, normal: 0, high: 0 },
						temperature: { low: 0, normal: 0, high: 0 },
						bmi: { underweight: 0, normal: 0, overweight: 0, obese: 0 },
						bloodPressure: { low: 0, normal: 0, high: 0 },
						bloodGlucose: { low: 0, normal: 0, high: 0 },
					},
					habits: {
						tabaco: {},
						cafe: {},
						alcohol: {},
					},
				},
			}
		}

		const records = triages as TriageRecordRaw[]

		// Filtrar solo registros que tienen al menos un signo vital
		const validRecords = records.filter((t) => 
			t.heart_rate !== null ||
			t.respiratory_rate !== null ||
			t.oxygen_saturation !== null ||
			t.temperature_celsius !== null ||
			t.bmi !== null ||
			t.blood_pressure !== null ||
			t.blood_glucose !== null
		)

		// Calcular promedios
		const heartRates = validRecords.map((t) => t.heart_rate).filter((v): v is number => v !== null)
		const respiratoryRates = validRecords.map((t) => t.respiratory_rate).filter((v): v is number => v !== null)
		const oxygenSaturations = validRecords.map((t) => t.oxygen_saturation).filter((v): v is number => v !== null)
		const temperatures = validRecords.map((t) => t.temperature_celsius).filter((v): v is number => v !== null)
		const bmis = validRecords.map((t) => t.bmi).filter((v): v is number => v !== null)

		// Extraer presión arterial (entero en mmHg)
		const bloodPressures = records.map((t) => t.blood_pressure).filter((v): v is number => v !== null)
		// Si el formato es string "120/80", parsear (aunque debería ser un entero)
		const systolicBPs = bloodPressures
		const diastolicBPs: number[] = [] // No disponible si es un solo valor

		// Extraer glicemia (mg/dL)
		const bloodGlucoses = validRecords.map((t) => t.blood_glucose).filter((v): v is number => v !== null)

		const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

		// Clasificar por rangos
		const classifyHeartRate = (hr: number) => {
			if (hr < 60) return 'low'
			if (hr > 100) return 'high'
			return 'normal'
		}

		const classifyRespiratoryRate = (rr: number) => {
			if (rr < 12) return 'low'
			if (rr > 20) return 'high'
			return 'normal'
		}

		const classifyOxygenSaturation = (os: number) => {
			if (os < 95) return 'low'
			if (os > 100) return 'high'
			return 'normal'
		}

		const classifyTemperature = (temp: number) => {
			if (temp < 36) return 'low'
			if (temp > 37.5) return 'high'
			return 'normal'
		}

		const classifyBMI = (bmi: number) => {
			if (bmi < 18.5) return 'underweight'
			if (bmi < 25) return 'normal'
			if (bmi < 30) return 'overweight'
			return 'obese'
		}

		const classifyBloodPressure = (bp: number) => {
			if (bp < 90) return 'low'
			if (bp > 120) return 'high'
			return 'normal'
		}

		const classifyBloodGlucose = (bg: number) => {
			if (bg < 70) return 'low' // Hipoglicemia
			if (bg > 140) return 'high' // Hiperglicemia
			return 'normal' // Normal: 70-140 mg/dL
		}

		const hrRanges = { low: 0, normal: 0, high: 0 }
		heartRates.forEach((hr) => {
			const range = classifyHeartRate(hr)
			hrRanges[range]++
		})

		const rrRanges = { low: 0, normal: 0, high: 0 }
		respiratoryRates.forEach((rr) => {
			const range = classifyRespiratoryRate(rr)
			rrRanges[range]++
		})

		const osRanges = { low: 0, normal: 0, high: 0 }
		oxygenSaturations.forEach((os) => {
			const range = classifyOxygenSaturation(os)
			osRanges[range]++
		})

		const tempRanges = { low: 0, normal: 0, high: 0 }
		temperatures.forEach((temp) => {
			const range = classifyTemperature(temp)
			tempRanges[range]++
		})

		const bmiRanges = { underweight: 0, normal: 0, overweight: 0, obese: 0 }
		bmis.forEach((bmi) => {
			const range = classifyBMI(bmi)
			bmiRanges[range]++
		})

		const bpRanges = { low: 0, normal: 0, high: 0 }
		systolicBPs.forEach((bp) => {
			const range = classifyBloodPressure(bp)
			bpRanges[range]++
		})

		const bgRanges = { low: 0, normal: 0, high: 0 }
		bloodGlucoses.forEach((bg) => {
			const range = classifyBloodGlucose(bg)
			bgRanges[range]++
		})

		// Contar hábitos
		const countHabits = (field: 'tabaco' | 'cafe' | 'alcohol') => {
			const counts: { [key: string]: number } = {}
			validRecords.forEach((t) => {
				const value = t[field]
				if (value !== null && value !== undefined) {
					let category: string
					
					if (field === 'tabaco') {
						// Categorizar índice tabáquico
						const index = value as number
						if (index === 0) {
							category = 'No fuma'
						} else if (index < 10) {
							category = 'Nulo'
						} else if (index <= 20) {
							category = 'Riesgo moderado'
						} else if (index <= 40) {
							category = 'Riesgo intenso'
						} else {
							category = 'Riesgo alto'
						}
					} else if (field === 'cafe') {
						// Categorizar café por tazas por día
						const cups = value as number
						if (cups === 0) {
							category = 'No toma'
						} else if (cups <= 2) {
							category = 'Bajo (1-2 tazas)'
						} else if (cups <= 4) {
							category = 'Moderado (3-4 tazas)'
						} else if (cups <= 6) {
							category = 'Alto (5-6 tazas)'
						} else {
							category = 'Muy alto (7+ tazas)'
						}
					} else {
						// Alcohol sigue siendo HabitLevel (string)
						category = value as string
					}
					
					counts[category] = (counts[category] || 0) + 1
				}
			})
			return counts
		}

		return {
			success: true,
			data: {
				totalTriages: validRecords.length,
				averages: {
					heartRate: avg(heartRates),
					respiratoryRate: avg(respiratoryRates),
					oxygenSaturation: avg(oxygenSaturations),
					temperature: avg(temperatures),
					bmi: avg(bmis),
					systolicBP: avg(systolicBPs),
					diastolicBP: avg(diastolicBPs),
					bloodGlucose: avg(bloodGlucoses),
				},
				ranges: {
					heartRate: hrRanges,
					respiratoryRate: rrRanges,
					oxygenSaturation: osRanges,
					temperature: tempRanges,
					bmi: bmiRanges,
					bloodPressure: bpRanges,
					bloodGlucose: bgRanges,
				},
				habits: {
					tabaco: countHabits('tabaco'),
					cafe: countHabits('cafe'),
					alcohol: countHabits('alcohol'),
				},
			},
		}
	} catch (error) {
		console.error('Error in getTriageStats:', error)
		return { success: false, error: 'Error interno al obtener estadísticas' }
	}
}

/**
 * Obtiene tendencias de historia clínica en el tiempo
 */
export async function getTriageTrends(
	laboratoryId: string,
	days: number = 30
): Promise<{ success: boolean; data?: TriageTrend[]; error?: string }> {
	try {
		const endDate = new Date()
		const startDate = new Date()
		startDate.setDate(startDate.getDate() - days)

		const { data: triages, error } = await (supabase as any)
			.from('triaje_records')
			.select('heart_rate, respiratory_rate, oxygen_saturation, temperature_celsius, blood_pressure, blood_glucose, measurement_date')
			.eq('laboratory_id', laboratoryId)
			.gte('measurement_date', startDate.toISOString())
			.lte('measurement_date', endDate.toISOString())
			.order('measurement_date', { ascending: true })

		if (error) {
			console.error('Error fetching triage trends:', error)
			return { success: false, error: 'Error al obtener tendencias de historia clínica' }
		}

		const records = (triages as TriageRecordRaw[]) || []

		// Agrupar por día
		const groupedByDay: { [date: string]: TriageTrend } = {}

		records.forEach((t) => {
			const date = new Date(t.measurement_date).toISOString().split('T')[0]
			if (!groupedByDay[date]) {
				groupedByDay[date] = {
					date,
					avgHeartRate: null,
					avgRespiratoryRate: null,
					avgOxygenSaturation: null,
					avgTemperature: null,
					avgSystolicBP: null,
					avgBloodGlucose: null,
					count: 0,
				}
			}

			const day = groupedByDay[date]
			day.count++

			if (t.heart_rate !== null) {
				day.avgHeartRate = (day.avgHeartRate || 0) + t.heart_rate
			}
			if (t.respiratory_rate !== null) {
				day.avgRespiratoryRate = (day.avgRespiratoryRate || 0) + t.respiratory_rate
			}
			if (t.oxygen_saturation !== null) {
				day.avgOxygenSaturation = (day.avgOxygenSaturation || 0) + t.oxygen_saturation
			}
			if (t.temperature_celsius !== null) {
				day.avgTemperature = (day.avgTemperature || 0) + t.temperature_celsius
			}
			if (t.blood_pressure !== null) {
				day.avgSystolicBP = (day.avgSystolicBP || 0) + t.blood_pressure
			}
			if (t.blood_glucose !== null) {
				day.avgBloodGlucose = (day.avgBloodGlucose || 0) + t.blood_glucose
			}
		})

		// Calcular promedios - necesitamos contar cuántos valores no nulos hay por día
		const trends = Object.values(groupedByDay).map((day) => {
			// Filtrar registros del día actual
			const dayRecords = records.filter(r => {
				const rDate = new Date(r.measurement_date).toISOString().split('T')[0]
				return rDate === day.date
			})

			// Contar valores no nulos para cada métrica
			const heartRateValues = dayRecords.filter(r => r.heart_rate !== null).map(r => r.heart_rate!)
			const respiratoryRateValues = dayRecords.filter(r => r.respiratory_rate !== null).map(r => r.respiratory_rate!)
			const oxygenSaturationValues = dayRecords.filter(r => r.oxygen_saturation !== null).map(r => r.oxygen_saturation!)
			const temperatureValues = dayRecords.filter(r => r.temperature_celsius !== null).map(r => r.temperature_celsius!)
			const bloodPressureValues = dayRecords.filter(r => r.blood_pressure !== null).map(r => r.blood_pressure!)
			const bloodGlucoseValues = dayRecords.filter(r => r.blood_glucose !== null).map(r => r.blood_glucose!)

			return {
				...day,
				avgHeartRate: heartRateValues.length > 0 ? heartRateValues.reduce((a, b) => a + b, 0) / heartRateValues.length : null,
				avgRespiratoryRate: respiratoryRateValues.length > 0 ? respiratoryRateValues.reduce((a, b) => a + b, 0) / respiratoryRateValues.length : null,
				avgOxygenSaturation: oxygenSaturationValues.length > 0 ? oxygenSaturationValues.reduce((a, b) => a + b, 0) / oxygenSaturationValues.length : null,
				avgTemperature: temperatureValues.length > 0 ? temperatureValues.reduce((a, b) => a + b, 0) / temperatureValues.length : null,
				avgSystolicBP: bloodPressureValues.length > 0 ? bloodPressureValues.reduce((a, b) => a + b, 0) / bloodPressureValues.length : null,
				avgBloodGlucose: bloodGlucoseValues.length > 0 ? bloodGlucoseValues.reduce((a, b) => a + b, 0) / bloodGlucoseValues.length : null,
			}
		})

		return { success: true, data: trends }
	} catch (error) {
		console.error('Error in getTriageTrends:', error)
		return { success: false, error: 'Error interno al obtener tendencias' }
	}
}
