import React from "react"
import { Link } from "react-router-dom"
import { Home, ArrowLeft } from "lucide-react"
import Aurora from "@shared/components/ui/Aurora"
import FadeContent from "@shared/components/ui/FadeContent"

export const NotFoundPage: React.FC = () => {
return (
<div className="w-screen h-screen relative overflow-hidden bg-gradient-to-br from-black via-black to-black">
{/* Aurora Background */}
<Aurora colorStops={["#ec4699", "#750c41", "#ec4699"]} blend={0.7} amplitude={1.3} speed={0.3} />

{/* 404 Content Container */}
<div className="relative z-10 w-screen h-screen bg-gradient-to-br from-black/20 via-transparent to-black/30 flex items-center justify-center">
<FadeContent
blur={true}
duration={1000}
easing="ease-out"
initialOpacity={0}
delay={200}
className="w-full h-full flex items-center justify-center"
>
<div className="flex flex-col items-center justify-center md:rounded-xl w-screen h-screen md:h-auto md:w-full md:max-w-2xl bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
{/* 404 Number */}
<div className="text-center mb-8">
<h1 className="text-8xl sm:text-9xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
404
</h1>
<h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
¡Página no encontrada!
</h2>
<p className="text-slate-300 text-lg mb-8 max-w-md">
Lo sentimos, la página que buscas no existe o ha sido movida.
</p>
</div>

{/* Action Buttons */}
<div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
<Link
to="/"
className="flex items-center justify-center gap-2 bg-transparent border border-primary text-white rounded-md px-6 py-3 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-primary/10"
>
<Home className="w-5 h-5" />
Ir al Inicio
</Link>
<button
onClick={() => window.history.back()}
className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white rounded-md px-6 py-3 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-white/20"
>
<ArrowLeft className="w-5 h-5" />
Volver Atrás
</button>
</div>

{/* Footer */}
<div className="mt-8 text-center">
<p className="text-white text-sm">
Desarrollado por{" "}
<a href="https://www.solware.agency/" className="text-blue-500 hover:text-blue-400">
Solware
</a>
</p>
</div>
</div>
</FadeContent>
</div>
</div>
)
}

export default NotFoundPage
