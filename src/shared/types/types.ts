export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '12.2.3 (519615d)'
	}
	public: {
		Tables: {
			change_logs: {
				Row: {
					changed_at: string
					created_at: string | null
					deleted_record_info: string | null
					entity_type: string | null
					field_label: string
					field_name: string
					id: string
					medical_record_id: string | null
					new_value: string | null
					old_value: string | null
					patient_id: string | null
					user_display_name: string | null
					user_email: string
					user_id: string
				}
				Insert: {
					changed_at?: string
					created_at?: string | null
					deleted_record_info?: string | null
					entity_type?: string | null
					field_label: string
					field_name: string
					id?: string
					medical_record_id?: string | null
					new_value?: string | null
					old_value?: string | null
					patient_id?: string | null
					user_display_name?: string | null
					user_email: string
					user_id: string
				}
				Update: {
					changed_at?: string
					created_at?: string | null
					deleted_record_info?: string | null
					entity_type?: string | null
					field_label?: string
					field_name?: string
					id?: string
					medical_record_id?: string | null
					new_value?: string | null
					old_value?: string | null
					patient_id?: string | null
					user_display_name?: string | null
					user_email?: string
					user_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'change_logs_medical_record_id_fkey'
						columns: ['medical_record_id']
						isOneToOne: false
						referencedRelation: 'medical_records_clean'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'change_logs_patient_id_fkey'
						columns: ['patient_id']
						isOneToOne: false
						referencedRelation: 'patients'
						referencedColumns: ['id']
					},
				]
			}
			deletion_logs: {
				Row: {
					deleted_at: string
					deleted_medical_record_id: string
					deleted_patient_id: string | null
					deleted_record_info: string
					entity_type: string | null
					id: string
					user_display_name: string | null
					user_email: string
					user_id: string
				}
				Insert: {
					deleted_at?: string
					deleted_medical_record_id: string
					deleted_patient_id?: string | null
					deleted_record_info: string
					entity_type?: string | null
					id?: string
					user_display_name?: string | null
					user_email: string
					user_id: string
				}
				Update: {
					deleted_at?: string
					deleted_medical_record_id?: string
					deleted_patient_id?: string | null
					deleted_record_info?: string
					entity_type?: string | null
					id?: string
					user_display_name?: string | null
					user_email?: string
					user_id?: string
				}
				Relationships: []
			}
			immuno_requests: {
				Row: {
					case_id: string
					created_at: string | null
					id: string
					inmunorreacciones: string
					n_reacciones: number
					pagado: boolean
					precio_unitario: number
					total: number
					updated_at: string | null
				}
				Insert: {
					case_id: string
					created_at?: string | null
					id?: string
					inmunorreacciones: string
					n_reacciones: number
					pagado?: boolean
					precio_unitario?: number
					total: number
					updated_at?: string | null
				}
				Update: {
					case_id?: string
					created_at?: string | null
					id?: string
					inmunorreacciones?: string
					n_reacciones?: number
					pagado?: boolean
					precio_unitario?: number
					total?: number
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'immuno_requests_case_id_fkey'
						columns: ['case_id']
						isOneToOne: true
						referencedRelation: 'medical_records_clean'
						referencedColumns: ['id']
					},
				]
			}
			medical_records_clean: {
				Row: {
					attachment_url: string | null
					branch: string
					cito_status: Database['public']['Enums']['cito_status_type'] | null
					code: string | null
					comments: string | null
					created_at: string | null
					created_by: string | null
					created_by_display_name: string | null
					date: string
					doc_aprobado: Database['public']['Enums']['doc_aprobado_status']
					exam_type: string
					exchange_rate: number | null
					generated_at: string | null
					generated_by: string | null
					generated_by_display_name: string | null
					googledocs_url: string | null
					id: string
					ims: string | null
					informe_qr: string | null
					informepdf_url: string | null
					number_of_samples: number
					origin: string
					patient_id: string | null
					payment_amount_1: number | null
					payment_amount_2: number | null
					payment_amount_3: number | null
					payment_amount_4: number | null
					payment_method_1: string | null
					payment_method_2: string | null
					payment_method_3: string | null
					payment_method_4: string | null
					payment_reference_1: string | null
					payment_reference_2: string | null
					payment_reference_3: string | null
					payment_reference_4: string | null
					payment_status: Database['public']['Enums']['payment_status_type']
					pdf_en_ready: boolean | null
					relationship: string | null
					remaining: number | null
					sample_type: string
					token: string | null
					total_amount: number
					treating_doctor: string
					updated_at: string | null
				}
				Insert: {
					attachment_url?: string | null
					branch: string
					cito_status?: Database['public']['Enums']['cito_status_type'] | null
					code?: string | null
					comments?: string | null
					created_at?: string | null
					created_by?: string | null
					created_by_display_name?: string | null
					date: string
					doc_aprobado?: Database['public']['Enums']['doc_aprobado_status']
					exam_type: string
					exchange_rate?: number | null
					generated_at?: string | null
					generated_by?: string | null
					generated_by_display_name?: string | null
					googledocs_url?: string | null
					id?: string
					ims?: string | null
					informe_qr?: string | null
					informepdf_url?: string | null
					number_of_samples: number
					origin: string
					patient_id?: string | null
					payment_amount_1?: number | null
					payment_amount_2?: number | null
					payment_amount_3?: number | null
					payment_amount_4?: number | null
					payment_method_1?: string | null
					payment_method_2?: string | null
					payment_method_3?: string | null
					payment_method_4?: string | null
					payment_reference_1?: string | null
					payment_reference_2?: string | null
					payment_reference_3?: string | null
					payment_reference_4?: string | null
					payment_status?: string
					pdf_en_ready?: boolean | null
					relationship?: string | null
					remaining?: number | null
					sample_type: string
					token?: string | null
					total_amount: number
					treating_doctor: string
					updated_at?: string | null
				}
				Update: {
					attachment_url?: string | null
					branch?: string
					cito_status?: Database['public']['Enums']['cito_status_type'] | null
					code?: string | null
					comments?: string | null
					created_at?: string | null
					created_by?: string | null
					created_by_display_name?: string | null
					date?: string
					doc_aprobado?: Database['public']['Enums']['doc_aprobado_status']
					exam_type?: string
					exchange_rate?: number | null
					generated_at?: string | null
					generated_by?: string | null
					generated_by_display_name?: string | null
					googledocs_url?: string | null
					id?: string
					ims?: string | null
					informe_qr?: string | null
					informepdf_url?: string | null
					number_of_samples?: number
					origin?: string
					patient_id?: string | null
					payment_amount_1?: number | null
					payment_amount_2?: number | null
					payment_amount_3?: number | null
					payment_amount_4?: number | null
					payment_method_1?: string | null
					payment_method_2?: string | null
					payment_method_3?: string | null
					payment_method_4?: string | null
					payment_reference_1?: string | null
					payment_reference_2?: string | null
					payment_reference_3?: string | null
					payment_reference_4?: string | null
					payment_status?: string
					pdf_en_ready?: boolean | null
					relationship?: string | null
					remaining?: number | null
					sample_type?: string
					token?: string | null
					total_amount?: number
					treating_doctor?: string
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'medical_records_clean_patient_id_fkey'
						columns: ['patient_id']
						isOneToOne: false
						referencedRelation: 'patients'
						referencedColumns: ['id']
					},
				]
			}
			patients: {
				Row: {
					cedula: string
					created_at: string | null
					edad: string | null
					email: string | null
					gender: Database['public']['Enums']['gender_type'] | null
					id: string
					nombre: string
					telefono: string | null
					updated_at: string | null
					version: number | null
				}
				Insert: {
					cedula: string
					created_at?: string | null
					edad?: string | null
					email?: string | null
					gender?: Database['public']['Enums']['gender_type'] | null
					id?: string
					nombre: string
					telefono?: string | null
					updated_at?: string | null
					version?: number | null
				}
				Update: {
					cedula?: string
					created_at?: string | null
					edad?: string | null
					email?: string | null
					gender?: Database['public']['Enums']['gender_type'] | null
					id?: string
					nombre?: string
					telefono?: string | null
					updated_at?: string | null
					version?: number | null
				}
				Relationships: []
			}
			profiles: {
				Row: {
					assigned_branch: string | null
					created_at: string | null
					display_name: string | null
					email: string
					email_lower: string | null
					estado: string
					id: string
					phone: string | null
					role: string
					updated_at: string | null
				}
				Insert: {
					assigned_branch?: string | null
					created_at?: string | null
					display_name?: string | null
					email: string
					email_lower?: string | null
					estado?: string
					id: string
					phone?: string | null
					role?: string
					updated_at?: string | null
				}
				Update: {
					assigned_branch?: string | null
					created_at?: string | null
					display_name?: string | null
					email?: string
					email_lower?: string | null
					estado?: string
					id?: string
					phone?: string | null
					role?: string
					updated_at?: string | null
				}
				Relationships: []
			}
			user_settings: {
				Row: {
					created_at: string | null
					id: string
					session_timeout: number
					updated_at: string | null
				}
				Insert: {
					created_at?: string | null
					id: string
					session_timeout?: number
					updated_at?: string | null
				}
				Update: {
					created_at?: string | null
					id?: string
					session_timeout?: number
					updated_at?: string | null
				}
				Relationships: []
			}
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			actualizar_pdf_en_ready_medical: {
				Args: Record<PropertyKey, never>
				Returns: undefined
			}
			email_exists_auth: {
				Args: { p_email: string }
				Returns: boolean
			}
			generate_medical_record_code_from_table: {
				Args: { case_date_input: string; exam_type_input: string }
				Returns: string
			}
			get_all_change_logs_with_deleted: {
				Args: Record<PropertyKey, never>
				Returns: {
					changed_at: string
					created_at: string
					deleted_record_info: string
					field_label: string
					field_name: string
					id: string
					medical_record_id: string
					new_value: string
					old_value: string
					record_code: string
					record_full_name: string
					user_email: string
					user_id: string
				}[]
			}
			hook_block_duplicate_email: {
				Args: { event: Json }
				Returns: Json
			}
			save_change_log_for_deleted_record: {
				Args: {
					p_deleted_record_info: string
					p_medical_record_id: string
					p_user_email: string
					p_user_id: string
				}
				Returns: undefined
			}
			sync_missing_profiles: {
				Args: Record<PropertyKey, never>
				Returns: undefined
			}
		}
		Enums: {
			cito_status_type: 'positivo' | 'negativo'
			doc_aprobado_status: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado'
			gender_type: 'Masculino' | 'Femenino'
			payment_status_type: 'Incompleto' | 'Pagado'
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
}

type DefaultSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database
	}
		? keyof (Database[DefaultSchemaTableNameOrOptions['schema']] extends { Tables: any; Views: any }
				? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
						Database[DefaultSchemaTableNameOrOptions['schema']]['Views']
				: never)
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions['schema']] extends { Tables: any; Views: any }
		? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
				Row: infer R
		  }
			? R
			: never
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
	? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
			Row: infer R
	  }
		? R
		: never
	: never

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database
	}
		? keyof (Database[DefaultSchemaTableNameOrOptions['schema']] extends { Tables: any }
				? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
				: never)
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions['schema']] extends { Tables: any }
		? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
				Insert: infer I
		  }
			? I
			: never
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
	? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
			Insert: infer I
	  }
		? I
		: never
	: never

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database
	}
		? keyof (Database[DefaultSchemaTableNameOrOptions['schema']] extends { Tables: any }
				? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
				: never)
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions['schema']] extends { Tables: any }
		? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
				Update: infer U
		  }
			? U
			: never
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
	? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
			Update: infer U
	  }
		? U
		: never
	: never

export type Enums<
	DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof Database
	}
		? keyof (Database[DefaultSchemaEnumNameOrOptions['schema']] extends { Enums: any }
				? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
				: never)
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaEnumNameOrOptions['schema']] extends { Enums: any }
		? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
		: never
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
	? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
	: never

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes'] | { schema: keyof Database },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof Database
	}
		? keyof (Database[PublicCompositeTypeNameOrOptions['schema']] extends { CompositeTypes: any }
				? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
				: never)
		: never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
	? Database[PublicCompositeTypeNameOrOptions['schema']] extends { CompositeTypes: any }
		? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
		: never
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
	? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
	: never

export const Constants = {
	public: {
		Enums: {},
	},
} as const

export type MedicalRecordInsert = TablesInsert<'medical_records_clean'>

// Tipo unificado para MedicalRecord que incluye todos los campos necesarios
export interface MedicalRecord {
	// Campos de medical_records_clean
	id: string
	patient_id: string | null
	exam_type: string
	origin: string
	treating_doctor: string
	sample_type: string
	number_of_samples: number
	relationship: string | null
	branch: string
	date: string
	total_amount: number
	exchange_rate: number | null
	payment_status: 'Incompleto' | 'Pagado'
	remaining: number
	payment_method_1: string | null
	payment_amount_1: number | null
	payment_reference_1: string | null
	payment_method_2: string | null
	payment_amount_2: number | null
	payment_reference_2: string | null
	payment_method_3: string | null
	payment_amount_3: number | null
	payment_reference_3: string | null
	payment_method_4: string | null
	payment_amount_4: number | null
	payment_reference_4: string | null
	comments: string | null
	code: string | null
	created_at: string | null
	updated_at: string | null
	created_by: string | null
	created_by_display_name: string | null
	material_remitido: string | null
	informacion_clinica: string | null
	descripcion_macroscopica: string | null
	diagnostico: string | null
	comentario: string | null
	pdf_en_ready: boolean | null
	attachment_url: string | null
	doc_aprobado: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado' | null
	generated_by: string | null
	version: number | null
	cito_status: 'positivo' | 'negativo' | null // Nueva columna para estado citológico
	// Campos de patients
	cedula: string
	nombre: string
	edad: string | null
	telefono: string | null
	patient_email: string | null
	gender: 'Masculino' | 'Femenino' | null
	// Alias para compatibilidad con el código existente
	full_name: string // apunta a nombre
	id_number: string // apunta a cedula
	phone: string | null // apunta a telefono
	edad_display?: string // para compatibilidad
	email: string | null // apunta a patient_email
	// Campos adicionales para compatibilidad
	inmuno?: string // Campo legacy
	ims?: string | null // Campo para inmunorreacciones
	positivo?: string | null
	negativo?: string | null
	ki67?: string | null
	conclusion_diagnostica?: string | null
	archivo_adjunto_url?: string | null
}
