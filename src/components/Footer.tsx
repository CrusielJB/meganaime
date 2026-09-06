import React, { useState } from "react";
import { Mail, Check, Sparkles, Shield, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const contactEmail = "baezcabrera.j.r@gmail.com";

  const handleCopy = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <footer className="w-full mt-20 border-t border-white/5 bg-gradient-to-b from-neutral-950/40 via-neutral-950/90 to-black backdrop-blur-xl py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left Side: Brand info */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/20">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-black text-white tracking-tight">
              mega<span className="text-rose-500">Anime</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
            Tu plataforma definitiva para ver y disfrutar del mejor anime en calidad Full HD 1080p, rápido y sin anuncios.
          </p>
        </div>

        {/* Center / Right: Contact Card (Requested by User) */}
        <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-neutral-900/80 border border-white/10 hover:border-rose-500/30 rounded-2xl p-3 px-4 shadow-xl backdrop-blur-md transition-all group">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition">
              <Mail className="h-4.5 w-4.5" />
            </div>
            
            <div className="flex flex-col text-center sm:text-left">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                ¿Tienes dudas o sugerencias?
              </span>
              <a
                href={`mailto:${contactEmail}`}
                className="text-xs sm:text-sm font-extrabold text-white hover:text-rose-400 transition tracking-wide flex items-center gap-1.5"
              >
                <span>Contacto:</span>
                <span className="text-rose-400 underline decoration-rose-500/40 hover:decoration-rose-400">{contactEmail}</span>
              </a>
            </div>

            <button
              onClick={handleCopy}
              className="mt-2 sm:mt-0 sm:ml-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white rounded-xl text-[11px] font-bold border border-white/10 transition flex items-center gap-1 cursor-pointer"
              title="Copiar correo de contacto"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <span>Copiar</span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-neutral-500 font-medium">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-400" />
              Soporte Directo
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              Hecho con <Heart className="h-3 w-3 text-rose-500 fill-rose-500 inline" /> para la comunidad
            </span>
          </div>
        </div>

      </div>

      {/* Bottom Sub-footer */}
      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500 text-center sm:text-left">
        <p>© {new Date().getFullYear()} megaAnime. Todos los derechos reservados.</p>
        <p className="text-[10px] text-neutral-500">
          Streaming optimizado y catálogo actualizado diariamente.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
