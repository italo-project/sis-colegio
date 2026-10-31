import { Link } from 'react-router-dom';
import { Code2, Cpu, Rocket, Briefcase, ChevronRight } from 'lucide-react';
import logoViotech from '@/assets/logoViotech.png'; 
import logoVioeduca from '@/assets/logoVioeduca.png';
import logoViopassya from '@/assets/logoViopassya.png'; // Asegúrate de tener este logo

export const ViotechLanding = () => {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white overflow-x-hidden">
      {/* NAVBAR OSCURO */}
      <nav className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoViotech} alt="Viotech" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold tracking-tight">Viotech <span className="text-primary-400">Informatics</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#servicios" className="hover:text-white transition-colors">Servicios</a>
            <a href="#productos" className="hover:text-white transition-colors">Nuestros Productos</a>
            <a href="#contacto" className="hover:text-white transition-colors">Contacto</a>
          </div>
          <div>
            <a href="#contacto" className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all">
              Hablemos de tu proyecto
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-40 pb-24 px-6 relative">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-600/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-primary-300 text-sm font-medium mb-8">
            <Rocket className="w-4 h-4" /> Innovación y Software de clase mundial
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8">
            Creamos el software que <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-cyan-300">
              impulsa tu negocio.
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Somos una empresa de tecnología dedicada a diseñar soluciones digitales, consultoría y productos SaaS de alto impacto para empresas y organizaciones.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#contacto" className="w-full sm:w-auto bg-white text-slate-900 hover:bg-gray-100 px-8 py-4 rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-2">
              Solicitar cotización <ChevronRight className="w-5 h-5" />
            </a>
            <a href="#productos" className="w-full sm:w-auto bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all flex items-center justify-center">
              Ver nuestros productos
            </a>
          </div>
        </div>
      </section>

      {/* SERVICIOS (Bento Grid estilo Apple) */}
      <section id="servicios" className="py-24 px-6 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Lo que hacemos</h2>
            <p className="text-slate-400 text-lg">Soluciones tecnológicas a la medida de tus requerimientos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 border border-slate-700 p-10 rounded-3xl hover:border-primary-500/50 transition-colors group">
              <Code2 className="w-10 h-10 text-primary-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">Desarrollo a Medida</h3>
              <p className="text-slate-400">Diseñamos y construimos sistemas web, aplicaciones móviles y plataformas completas según los procesos exactos de tu empresa.</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 p-10 rounded-3xl hover:border-primary-500/50 transition-colors group">
              <Briefcase className="w-10 h-10 text-cyan-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">Consultoría Tecnológica</h3>
              <p className="text-slate-400">Asesoramos a las empresas en la transformación digital, auditoría de sistemas, elección de arquitecturas cloud y optimización de procesos.</p>
            </div>
            <div className="md:col-span-2 bg-slate-800/50 border border-slate-700 p-10 rounded-3xl hover:border-primary-500/50 transition-colors group flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <Cpu className="w-10 h-10 text-purple-400 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-bold mb-3">Productos SaaS Propios</h3>
                <p className="text-slate-400">No solo hacemos software para otros; creamos y operamos nuestras propias plataformas digitales para resolver problemas reales en el mercado.</p>
              </div>
              <div className="w-full md:w-1/3 flex flex-wrap gap-2 justify-center">
                 <span className="px-4 py-2 bg-slate-900 rounded-lg text-sm font-medium border border-slate-700 text-slate-300">SaaS</span>
                 <span className="px-4 py-2 bg-slate-900 rounded-lg text-sm font-medium border border-slate-700 text-slate-300">Cloud</span>
                 <span className="px-4 py-2 bg-slate-900 rounded-lg text-sm font-medium border border-slate-700 text-slate-300">Innovación</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTOS DESTACADOS */}
      <section id="productos" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Nuestro Ecosistema</h2>
            <p className="text-slate-400 text-lg">Productos creados por Viotech para transformar industrias.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* Tarjeta de Vioeduca */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-8 relative overflow-hidden flex flex-col items-center text-center">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/20 rounded-full blur-[60px]"></div>
              
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center p-2 shadow-2xl mb-6 relative z-10">
                <img src={logoVioeduca} alt="Vioeduca" className="w-full h-full object-contain" />
              </div>
              
              <div className="inline-block px-3 py-1 bg-primary-500/20 text-primary-300 text-xs font-bold uppercase tracking-wider rounded-md mb-3 relative z-10">Educación</div>
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10">Vioeduca</h3>
              <p className="text-slate-400 mb-6 text-sm relative z-10 flex-1">La plataforma integral de gestión escolar que centraliza notas, finanzas y comunicación en un solo lugar.</p>
              
              <Link to="/landing-vioeduca" className="w-full inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold transition-all relative z-10">
                Conocer Vioeduca <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Tarjeta de Viopassya */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-8 relative overflow-hidden flex flex-col items-center text-center">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px]"></div>
              
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center p-2 shadow-2xl mb-6 relative z-10">
                <img src={logoViopassya} alt="Viopassya" className="w-full h-full object-contain" />
              </div>
              
              <div className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider rounded-md mb-3 relative z-10">Eventos</div>
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10">Viopassya</h3>
              <p className="text-slate-400 mb-6 text-sm relative z-10 flex-1">Plataforma online de venta de entradas para eventos, conciertos y experiencias inolvidables.</p>
              
              <a href="https://viopassya.com" target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold transition-all relative z-10">
                Conocer Viopassya <ChevronRight className="w-4 h-4" />
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* CONTACTO / CTA */}
      <section id="contacto" className="py-24 px-6 bg-slate-900 border-t border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">¿Tienes un proyecto en mente?</h2>
          <p className="text-slate-400 text-lg mb-10">Cuéntanos tus requerimientos y te ayudaremos a diseñar la solución tecnológica perfecta.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
             <a href="mailto:contacto@viotechinformatics.com" className="bg-white text-slate-900 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all">
               Enviar un correo
             </a>
             <a href="https://wa.me/51999999999" target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#20b858] transition-all">
               Escribir por WhatsApp
             </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} Viotech Informatics SAC. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};