import EyeTrackingComponent from '@features/dashboard/components/RobotTraking'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { getAseguradorasStats } from '@services/supabase/aseguradoras/aseguradoras-stats-service'

const AseguradorasHomePage = () => {
	const { data, isLoading } = useQuery({
		queryKey: ['aseguradoras-stats'],
		queryFn: getAseguradorasStats,
		staleTime: 1000 * 60 * 5,
	})
	const { profile } = useUserProfile()
	const { laboratory } = useLaboratory()

	return (
		<div className="overflow-x-hidden">
			<div className="mb-4 sm:mb-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
					<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
						Resumen del módulo de aseguradoras de Inntegras
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-3 md:gap-4">
				<Card className="col-span-1 sm:col-span-2 lg:col-span-12 dark:bg-background bg-white rounded-xl py-2 sm:py-4 md:py-6 px-2 sm:px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between shadow-lg">
					<div className="flex-1 text-center sm:text-left mb-2 sm:mb-0">
						<div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2 mb-1 sm:mb-2">
							<div>
								<h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
									Bienvenido a {laboratory?.name || 'Inntegras'}
								</h1>
								<div className="flex items-center justify-center sm:justify-start gap-2 mt-1 font-semibold">
									{profile?.display_name && (
										<span className="text-sm sm:text-md" style={{ color: laboratory?.branding?.primaryColor || undefined }}>
											{profile.display_name}
										</span>
									)}
								</div>
							</div>
						</div>
						<p className="text-gray-600 dark:text-gray-300 mb-1 sm:mb-2 md:mb-4 text-xs sm:text-sm md:text-base">
							Gestiona el portafolio de asegurados, pólizas y pagos.
						</p>
					</div>
					<div className="relative">
						<div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-5 animate-pulse"></div>
						<EyeTrackingComponent className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 z-10" />
					</div>
				</Card>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-gray-500">Asegurados</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{isLoading ? '...' : data?.asegurados ?? 0}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-gray-500">Pólizas</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{isLoading ? '...' : data?.polizas ?? 0}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-gray-500">Por vencer (30d)</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{isLoading ? '...' : data?.porVencer ?? 0}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-gray-500">Vencidas</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{isLoading ? '...' : data?.vencidas ?? 0}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-gray-500">Pagos</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{isLoading ? '...' : data?.pagos ?? 0}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

export default AseguradorasHomePage
