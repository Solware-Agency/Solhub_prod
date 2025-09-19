import { useNavigate } from 'react-router-dom'
import { signOut } from '@lib/supabase/auth'
import { useUserProfile } from '@shared/hooks/useUserProfile'

function Header() {
	const navigate = useNavigate()
	const { profile } = useUserProfile()

	const handleLogout = async () => {
		await signOut()
		navigate('/')
	}
	return (
		<header className="flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-[10px] rounded-bl-xl sticky top-0 left-0 z-50 p-4">
			<div className="flex items-center gap-3">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Formulario</h1>
				</div>
				{profile?.display_name && (
					<span className="text-sm text-primary font-medium">Bienvenido, {profile.display_name}</span>
				)}
			</div>
			<div className="flex items-center gap-4">
				<button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 text-white">
					Cerrar sesión
				</button>
			</div>
		</header>
	)
}

export default Header