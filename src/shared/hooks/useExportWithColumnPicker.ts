import { useCallback, useMemo, useState } from 'react'
import type { AseguradorasExportColumnDef } from '@shared/constants/aseguradorasExportColumns'

/**
 * Modal de confirmación + personalización de columnas (mismo flujo que casos médicos).
 */
export function useExportWithColumnPicker(catalog: AseguradorasExportColumnDef[]) {
	const allKeys = useMemo(() => catalog.map((c) => c.key), [catalog])
	const widthByKey = useMemo(() => Object.fromEntries(catalog.map((c) => [c.key, c.defaultWidth])), [catalog])

	const exportColumnOptions = useMemo(
		() => catalog.map((c) => ({ key: c.key, label: c.label, group: c.group })),
		[catalog],
	)

	const [isConfirmOpen, setIsConfirmOpen] = useState(false)
	const [isColumnsOpen, setIsColumnsOpen] = useState(false)
	const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[] | null>(null)
	const [pendingCount, setPendingCount] = useState(0)

	const getKeysToExport = useCallback((): string[] => {
		if (selectedColumnKeys != null && selectedColumnKeys.length > 0) return selectedColumnKeys
		return allKeys
	}, [selectedColumnKeys, allKeys])

	const handleApplyColumnSelection = useCallback(
		(keys: string[]) => {
			setSelectedColumnKeys(keys.length === allKeys.length ? null : keys)
			setIsColumnsOpen(false)
		},
		[allKeys.length],
	)

	const openConfirm = useCallback((count: number) => {
		setPendingCount(count)
		setIsConfirmOpen(true)
	}, [])

	return {
		exportColumnOptions,
		widthByKey,
		allKeys,
		getKeysToExport,
		isConfirmOpen,
		setIsConfirmOpen,
		isColumnsOpen,
		setIsColumnsOpen,
		selectedColumnKeys,
		pendingCount,
		openConfirm,
		handleApplyColumnSelection,
	}
}
