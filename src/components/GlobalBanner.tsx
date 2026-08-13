import React, { useEffect, useState } from "react";
import { Info, AlertTriangle, Sparkles, X } from "lucide-react";
import { getGlobalBannerAlert, GlobalBannerAlert } from "../utils/systemAlerts";

export function GlobalBanner() {
  const [banner, setBanner] = useState<GlobalBannerAlert | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getGlobalBannerAlert().then((data) => {
      if (data && data.active && data.message) {
        setBanner(data);
      }
    });
  }, []);

  if (!banner || !banner.active || dismissed || !banner.message) return null;

  const bgStyles = {
    info: "bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-blue-700/90 border-blue-400/30 text-blue-100",
    warning: "bg-gradient-to-r from-amber-600/90 via-rose-600/90 to-red-700/90 border-amber-400/30 text-amber-100",
    promo: "bg-gradient-to-r from-rose-600/90 via-purple-600/90 to-rose-700/90 border-rose-400/30 text-white"
  };

  const IconComponent = banner.type === "warning" ? AlertTriangle : banner.type === "promo" ? Sparkles : Info;

  return (
    <div className={`w-full py-2.5 px-4 border-b backdrop-blur-md transition-all shadow-xl ${bgStyles[banner.type] || bgStyles.info}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <IconComponent className="h-4 w-4 flex-shrink-0 animate-pulse" />
          <span className="truncate">{banner.message}</span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {banner.actionText && banner.actionUrl && (
            <a 
              href={banner.actionUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition backdrop-blur-sm"
            >
              {banner.actionText}
            </a>
          )}
          <button 
            onClick={() => setDismissed(true)} 
            className="p-1 hover:bg-black/20 rounded-md transition text-white/80 hover:text-white"
            title="Cerrar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
