import React, { useState } from "react";
import { Plus, Edit3, Trash2, Check, X, Shield, Smile } from "lucide-react";
import { User, Profile } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ProfileSelectorProps {
  currentUser: User;
  onSwitchProfile: (id: string) => void;
  onCreateProfile: (name: string, avatarUrl: string, isChild?: boolean) => void;
  onUpdateProfile: (id: string, name: string, avatarUrl: string, isChild?: boolean) => void;
  onDeleteProfile: (id: string) => void;
  onClose?: () => void;
  isSettingsMode?: boolean; // If opened from settings/header as a modal instead of blocking startup
}

export const PRESET_AVATARS = [
  { name: "Guerrero de Fuego", url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop" },
  { name: "Ciber Punk", url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&h=150&fit=crop" },
  { name: "Maga Elfa", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop" },
  { name: "Ninja Legendario", url: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=150&h=150&fit=crop" },
  { name: "Idol Radiante", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop" },
  { name: "Samurái de Acero", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" }
];

export default function ProfileSelector({
  currentUser,
  onSwitchProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onClose,
  isSettingsMode = false
}: ProfileSelectorProps) {
  const [isManaging, setIsManaging] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [profileName, setProfileName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].url);
  const [isChild, setIsChild] = useState(false);

  const profiles = currentUser.profiles || [];

  const handleSelectProfile = (profile: Profile) => {
    if (isManaging) {
      setEditingProfile(profile);
      setProfileName(profile.name);
      setSelectedAvatar(profile.avatarUrl);
      setIsChild(!!profile.isChild);
    } else {
      onSwitchProfile(profile.id);
      if (onClose) onClose();
    }
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setProfileName("");
    setSelectedAvatar(PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)].url);
    setIsChild(false);
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;
    if (editingProfile) {
      onUpdateProfile(editingProfile.id, profileName.trim(), selectedAvatar, isChild);
      setEditingProfile(null);
    } else if (isAdding) {
      onCreateProfile(profileName.trim(), selectedAvatar, isChild);
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este perfil? Se perderá todo su historial y favoritos.")) {
      onDeleteProfile(id);
      setEditingProfile(null);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4`}>
      <div className="w-full max-w-4xl text-center">
        {onClose && isSettingsMode && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {!isAdding && !editingProfile ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {isManaging ? "Administrar Perfiles" : "¿Quién está viendo ahora?"}
              </h2>

              <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    onClick={() => handleSelectProfile(profile)}
                    className="group relative flex flex-col items-center cursor-pointer max-w-[120px] sm:max-w-[140px]"
                  >
                    <div className="relative aspect-square w-24 sm:w-28 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-rose-500 transition-all duration-300 group-hover:scale-105 shadow-xl">
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {isManaging && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                          <Edit3 className="h-6 w-6 text-white" />
                        </div>
                      )}
                      {currentUser.activeProfileId === profile.id && !isManaging && (
                        <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <span className="mt-3 text-sm sm:text-base font-semibold text-neutral-300 group-hover:text-white transition truncate w-full text-center">
                      {profile.name}
                    </span>
                    {profile.isChild && (
                      <span className="mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 flex items-center gap-1">
                        <Smile className="h-3 w-3" /> Infantil
                      </span>
                    )}
                  </div>
                ))}

                {profiles.length < 5 && !isManaging && (
                  <button
                    onClick={handleStartAdd}
                    className="flex flex-col items-center justify-center group max-w-[120px] sm:max-w-[140px]"
                  >
                    <div className="flex aspect-square w-24 sm:w-28 rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-900/40 items-center justify-center group-hover:border-rose-500 group-hover:bg-neutral-900 transition-all duration-300 group-hover:scale-105">
                      <Plus className="h-8 w-8 text-neutral-500 group-hover:text-rose-400" />
                    </div>
                    <span className="mt-3 text-sm sm:text-base font-medium text-neutral-500 group-hover:text-neutral-300 transition">
                      Añadir perfil
                    </span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
                <button
                  onClick={() => setIsManaging(!isManaging)}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm border transition ${
                    isManaging
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/20"
                      : "bg-transparent border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500"
                  }`}
                >
                  {isManaging ? "Listo" : "Administrar Perfiles"}
                </button>
                
                {onClose && isSettingsMode && (
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm bg-neutral-850 hover:bg-neutral-800 text-neutral-300 transition"
                  >
                    Volver al sitio
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto bg-neutral-900 border border-white/5 rounded-3xl p-6 sm:p-8 text-left shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white">
                  {editingProfile ? "Editar Perfil" : "Crear Perfil"}
                </h3>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingProfile(null);
                  }}
                  className="p-1 rounded-full text-neutral-500 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Avatar Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Selecciona tu Avatar
                  </label>
                  <div className="flex items-center gap-4">
                    <img
                      src={selectedAvatar}
                      alt="Seleccionado"
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-rose-500 shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 grid grid-cols-6 gap-2">
                      {PRESET_AVATARS.map((av, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedAvatar(av.url)}
                          className={`aspect-square rounded-lg overflow-hidden border transition ${
                            selectedAvatar === av.url ? "border-rose-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img src={av.url} alt={av.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Profile Name Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Nombre del Perfil
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value.slice(0, 15))}
                    placeholder="Escribe el nombre del perfil..."
                    className="w-full px-4 py-3 bg-neutral-950 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500/50 transition font-medium"
                    maxLength={15}
                  />
                </div>

                {/* Kids mode toggle */}
                <div className="flex items-center justify-between p-4 bg-neutral-950/50 rounded-2xl border border-white/5">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">¿Perfil Infantil?</p>
                      <p className="text-xs text-neutral-400">Filtra contenido para niños y restringe accesos maduros.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChild(!isChild)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isChild ? "bg-amber-500" : "bg-neutral-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isChild ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 gap-4">
                  {editingProfile && editingProfile.id !== "default" ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingProfile.id)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-950/20 text-rose-400 border border-rose-900/30 hover:bg-rose-900/30 transition mr-auto"
                    >
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </button>
                  ) : <div />}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingProfile(null);
                      }}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={!profileName.trim()}
                      className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 transition"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
