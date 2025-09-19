import { supabase } from '@lib/supabase/config'
import { format, getYear, getMonth } from 'date-fns'

/**
 * Generates a unique medical record code following the format:
 * [caseType][yearSince2000][monthlyCounter][monthLetter]
 * 
 * @param examType - The type of exam (Citología, Biopsia, Inmunohistoquímica)
 * @param caseDate - The date of the case
 * @param currentRecordId - Optional ID of current record (for updates)
 * @returns Promise<string> - The generated unique code
 */
export async function generateMedicalRecordCode(
  examType: string,
  caseDate: Date | string,
  currentRecordId?: string
): Promise<string> {
  try {
    console.log('🔢 Generating code for:', { examType, caseDate, currentRecordId })

    // Convert string date to Date object if needed
    const date = typeof caseDate === 'string' ? new Date(caseDate) : caseDate

    // 1. Get case type number
    const caseTypeMap: Record<string, string> = {
      'Citología': '1',
      'citologia': '1',
      'Biopsia': '2',
      'biopsia': '2',
      'Inmunohistoquímica': '3',
      'inmunohistoquimica': '3'
    }

    const caseTypeNumber = caseTypeMap[examType] || caseTypeMap[examType.toLowerCase()]
    if (!caseTypeNumber) {
      throw new Error(`Unknown exam type: ${examType}`)
    }

    // 2. Get year since 2000 (2-digit format)
    const year = getYear(date)
    const yearSince2000 = String(year - 2000).padStart(2, '0')

    // 3. Get month letter (A=January, B=February, ..., L=December)
    const month = getMonth(date) + 1 // getMonth() returns 0-11, we need 1-12
    const monthLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    const monthLetter = monthLetters[month - 1]

    // 4. Count existing cases for the same type, year, and month
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

    console.log('📊 Counting existing cases:', {
      examType,
      startOfMonth: format(startOfMonth, 'yyyy-MM-dd'),
      endOfMonth: format(endOfMonth, 'yyyy-MM-dd')
    })

    // Build query to count existing cases
    let query = supabase
      .from('medical_records_clean')
      .select('id', { count: 'exact', head: true })
      .eq('exam_type', examType)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString())

    // Exclude current record if updating
    if (currentRecordId) {
      query = query.neq('id', currentRecordId)
    }

    const { count, error } = await query

    if (error) {
      console.error('❌ Error counting existing cases:', error)
      throw error
    }

    // 5. Calculate monthly counter (including current case)
    const monthlyCounter = String((count || 0) + 1).padStart(3, '0')

    // 6. Generate final code
    const generatedCode = `${caseTypeNumber}${yearSince2000}${monthlyCounter}${monthLetter}`

    console.log('✅ Generated code:', {
      caseType: caseTypeNumber,
      year: yearSince2000,
      counter: monthlyCounter,
      month: monthLetter,
      finalCode: generatedCode
    })

    // 7. Verify code uniqueness
    const { data: existingCode } = await supabase
      .from('medical_records_clean')
      .select('id')
      .eq('code', generatedCode)
      .maybeSingle()

    if (existingCode && existingCode.id !== currentRecordId) {
      console.warn('⚠️ Code collision detected, regenerating...')
      // If there's a collision, increment counter and try again
      const newCounter = String((count || 0) + 2).padStart(3, '0')
      const newCode = `${caseTypeNumber}${yearSince2000}${newCounter}${monthLetter}`
      console.log('🔄 New code after collision:', newCode)
      return newCode
    }

    return generatedCode

  } catch (error) {
    console.error('❌ Error generating medical record code:', error)
    throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Batch update all existing records without codes
 * This function should be run once to generate codes for existing records
 */
export async function generateCodesForExistingRecords(): Promise<{ success: number; errors: number }> {
  try {
    console.log('🔄 Starting batch code generation for existing records...')

    // Get all records without codes
    const { data: records, error } = await supabase
      .from('medical_records_clean')
      .select('id, exam_type, date')
      .is('code', null)
      .order('date', { ascending: true })

    if (error) {
      throw error
    }

    if (!records || records.length === 0) {
      console.log('✅ No records need code generation')
      return { success: 0, errors: 0 }
    }

    console.log(`📋 Found ${records.length} records without codes`)

    let successCount = 0
    let errorCount = 0

    // Process records in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (record) => {
          try {
            const code = await generateMedicalRecordCode(
              record.exam_type,
              record.date,
              record.id
            )

            const { error: updateError } = await supabase
              .from('medical_records_clean')
              .update({ code })
              .eq('id', record.id)

            if (updateError) {
              throw updateError
            }

            successCount++
            console.log(`✅ Generated code ${code} for record ${record.id}`)
          } catch (error) {
            errorCount++
            console.error(`❌ Failed to generate code for record ${record.id}:`, error)
          }
        })
      )

      // Small delay between batches
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`🎉 Batch generation complete: ${successCount} success, ${errorCount} errors`)
    return { success: successCount, errors: errorCount }

  } catch (error) {
    console.error('❌ Error in batch code generation:', error)
    throw error
  }
}