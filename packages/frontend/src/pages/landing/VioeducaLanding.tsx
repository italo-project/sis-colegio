import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, BarChart3, Users, School, Quote } from 'lucide-react';
import logoVioeduca from '@/assets/logoVioeduca.png';

export const VioeducaLanding = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoVioeduca} alt="Vioeduca" className="w-10 h-10 object-contain" />
            <span className="text-2xl font-extrabold tracking-tight">Vioeduca</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium text-gray-600">
            <a href="#caracteristicas" className="hover:text-primary-600 transition-colors">Características</a>
            <a href="#beneficios" className="hover:text-primary-600 transition-colors">Beneficios</a>
            <a href="#precios" className="hover:text-primary-600 transition-colors">Planes</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 hidden sm:block">
              Iniciar Sesión
            </Link>
            <Link to="/login" className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
              Probar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary-50 rounded-full blur-3xl -z-10 opacity-60"></div>
        
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></span>
            Plataforma #1 para colegios en Perú
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 text-gray-900">
            La gestión escolar, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-400">
              reinventada.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Centraliza notas, asistencias, finanzas y la comunicación con los padres en una sola plataforma intuitiva, segura y diseñada para el futuro.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2">
              Comenzar ahora <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#demo" className="w-full sm:w-auto bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-8 py-4 rounded-2xl text-lg font-semibold transition-all flex items-center justify-center">
              Ver demostración
            </a>
          </div>
        </div>
      </section>

      {/* CARACTERÍSTICAS */}
      <section id="caracteristicas" className="py-24 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que tu colegio necesita</h2>
            <p className="text-gray-500 text-lg">Módulos diseñados para facilitar el trabajo de directores, docentes y padres.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Users className="w-6 h-6 text-primary-600" />, title: 'Gestión de Alumnos', desc: 'Matrículas, expedientes, historial académico y asignación de secciones en segundos.' },
              { icon: <BarChart3 className="w-6 h-6 text-primary-600" />, title: 'Notas y Asistencia', desc: 'Registro de calificaciones por competencias y control de asistencia en tiempo real.' },
              { icon: <ShieldCheck className="w-6 h-6 text-primary-600" />, title: 'Pagos y Finanzas', desc: 'Cobros automatizados, conciliación de Yape/Transferencias y reportes de morosidad.' },
              { icon: <Zap className="w-6 h-6 text-primary-600" />, title: 'Portal para Padres', desc: 'Acceso 24/7 para ver notas, justificar faltas y pagar pensiones en línea.' },
              { icon: <School className="w-6 h-6 text-primary-600" />, title: 'Cierre de Año', desc: 'Promoción automática de alumnos, cálculo de promedios finales y libretas digitales.' },
              { icon: <CheckCircle2 className="w-6 h-6 text-primary-600" />, title: '100% Cloud', desc: 'Sin instalaciones. Accede desde cualquier dispositivo, en cualquier lugar del mundo.' },
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-apple-hover transition-all duration-300">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFICIOS (Testimonio e Imagen) */}
      <section id="beneficios" className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              Menos papeleo, <br/>
              <span className="text-primary-600">más educación.</span>
            </h2>
            <p className="text-lg text-gray-500 mb-8 leading-relaxed">
              Digitaliza tu colegio por completo. Ahorra horas de trabajo administrativo y permite que tus docentes se enfoquen en lo que realmente importa: enseñar.
            </p>
            
            <ul className="space-y-4 mb-10">
              {[
                'Reduce hasta un 80% el tiempo en tareas administrativas.',
                'Comunicación directa y transparente con los padres.',
                'Reportes financieros en tiempo real para la dirección.',
                'Seguridad de nivel bancario para los datos de tus alumnos.'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1 relative">
            {/* Adorno de fondo */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-100 to-blue-50 rounded-3xl transform rotate-3 scale-105 -z-10"></div>
            
            {/* Tarjeta de testimonio simulada */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
              <Quote className="w-10 h-10 text-primary-200 mb-4" />
              <p className="text-xl text-gray-700 font-medium italic mb-6">
                "Antes usábamos Excel y cuadernos. Con Vioeduca, los padres pagan la pensión desde su celular y nosotros vemos todo en un solo panel. Nos cambió la vida."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  MV
                </div>
                <div>
                  <div className="font-bold text-gray-900">María Vargas</div>
                  <div className="text-sm text-gray-500">Directora del Colegio San Martín</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANES / PRECIOS (Ocultando el precio real) */}
      <section id="precios" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Un plan a la medida de tu colegio</h2>
          <p className="text-gray-500 text-lg mb-12">Sin costos ocultos. Paga solo por lo que usas.</p>

          <div className="bg-white rounded-[2.5rem] p-10 md:p-16 shadow-apple border border-gray-100 relative overflow-hidden max-w-2xl mx-auto">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-600 to-blue-400"></div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Vioeduca Premium</h3>
            <p className="text-gray-500 mb-8">Acceso total a todos los módulos del sistema.</p>
            
            <div className="text-4xl font-extrabold text-gray-900 mb-2">
              Cotización <span className="text-lg text-gray-500 font-medium">a medida</span>
            </div>
            <p className="text-sm text-gray-500 mb-8">El costo se adapta a la cantidad de alumnos de tu institución.</p>

            <ul className="text-left space-y-4 mb-10 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              {[
                'Alumnos ilimitados',
                'Módulo de Finanzas y Pagos',
                'Portal para Padres',
                'App para Docentes',
                'Soporte prioritario 24/7',
                'Capacitación incluida'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary-600" />
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <a href="mailto:ventas@vioeduca.pe" className="block w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-primary-600/20">
              Solicitar Cotización
            </a>
            <p className="text-xs text-gray-400 mt-4">Respuesta en menos de 24 horas.</p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/30 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">¿Listo para modernizar tu colegio?</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">Únete a los colegios que ya están ahorrando tiempo y dinero con Vioeduca.</p>
            <Link to="/login" className="inline-block bg-white text-slate-900 hover:bg-gray-100 px-8 py-4 rounded-2xl text-lg font-bold transition-all">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Vioeduca. Un producto de <a href="/landing-viotech" className="text-primary-600 font-semibold hover:underline">Viotech Informatics SAC</a>.</p>
      </footer>
    </div>
  );
};