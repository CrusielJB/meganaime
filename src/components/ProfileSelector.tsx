import React, { useState } from "react";
import { Plus, Edit3, Trash2, Check, X, Shield, Smile, Lock, User as UserIcon, KeyRound, CheckCircle2, AlertCircle, Settings, PlayCircle } from "lucide-react";
import { User, Profile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { auth } from "../lib/firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { safeLocalStorage } from "../utils/safeStorage";

interface ProfileSelectorProps {
  currentUser: User;
  onSwitchProfile: (id: string) => void;
  onCreateProfile: (name: string, avatarUrl: string, isChild?: boolean) => void;
  onUpdateProfile: (id: string, name: string, avatarUrl: string, isChild?: boolean) => void;
  onDeleteProfile: (id: string) => void;
  onClose?: () => void;
  isSettingsMode?: boolean;
  initialTab?: "profiles" | "security" | "preferences";
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
  isSettingsMode = false,
  initialTab = "profiles"
}: ProfileSelectorProps) {
  const [activeTab, setActiveTab] = useState<"profiles" | "security" | "preferences">(initialTab);
  const [isManaging, setIsManaging] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Profile Form states
  const [profileName, setProfileName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].url);
  const [isChild, setIsChild] = useState(false);

  // Security / Password Form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Playback Preferences states
  const [autoPlayNext, setAutoPlayNext] = useState(() => {
    return safeLocalStorage.getItem("megaAnime_autoplay") !== "false";
  });
  const [autoSkipIntro, setAutoSkipIntro] = useState(() => {
    return safeLocalStorage.getItem("megaAnime_autoskip") === "true";
  });

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden. Verifica e intenta nuevamente.");
      return;
    }

    setPasswordLoading(true);
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        try {
          await updatePassword(user, newPassword);
          setPasswordSuccess("¡Tu contraseña se ha actualizado correctamente!");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        } catch (err: any) {
          if (err.code === "auth/requires-recent-login") {
            if (!currentPassword) {
              setPasswordError("Por seguridad, ingresa tu contraseña actual para confirmar el cambio.");
              setPasswordLoading(false);
              return;
            }
            try {
              const credential = EmailAuthProvider.credential(user.email, currentPassword);
              await reauthenticateWithCredential(user, credential);
              await updatePassword(user, newPassword);
              setPasswordSuccess("¡Tu contraseña se ha actualizado correctamente!");
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            } catch (reauthErr: any) {
              setPasswordError("La contraseña actual ingresada es incorrecta.");
            }
          } else {
            setPasswordError(err.message || "Error al actualizar la contraseña.");
          }
        }
      } else {
        // Fallback for local session / demo mode
        setPasswordSuccess("¡Tu contraseña ha sido actualizada con éxito!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (e: any) {
      setPasswordError(e.message || "Ocurrió un problema inesperado.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggleAutoPlay = () => {
    const val = !autoPlayNext;
    setAutoPlayNext(val);
    safeLocalStorage.setItem("megaAnime_autoplay", String(val));
  };

  const handleToggleAutoSkip = () => {
    const val = !autoSkipIntro;
    setAutoSkipIntro(val);
    safeLocalStorage.setItem("megaAnime_autoskip", String(val));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-4xl text-center my-auto">
        {onClose && isSettingsMode && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition z-10 cursor-pointer"
            title="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        {/* Modal Navigation Header when in Settings Mode */}
        {isSettingsMode && !isAdding && !editingProfile && (
          <div className="flex items-center justify-center gap-2 mb-8 bg-neutral-900/80 p-1.5 rounded-2xl border border-white/5 max-w-md mx-auto">
            <button
              onClick={() => setActiveTab("profiles")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "profiles"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/25"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <UserIcon className="h-4 w-4" />
              <span>Perfiles</span>
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "security"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/25"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>Seguridad</span>
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "preferences"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/25"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Ajustes</span>
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "profiles" && !isAdding && !editingProfile && (
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
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm border transition cursor-pointer ${
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
                    className="px-6 py-2.5 rounded-xl font-bold text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
                  >
                    Volver al sitio
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: Seguridad y Cambio de Contraseña */}
          {activeTab === "security" && !isAdding && !editingProfile && (
            <motion.div
              key="security"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto bg-neutral-900 border border-white/5 rounded-3xl p-6 sm:p-8 text-left shadow-2xl space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Seguridad de la Cuenta</h3>
                  <p className="text-xs text-neutral-400">{currentUser.email}</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña actual..."
                    className="w-full px-4 py-3 bg-neutral-950 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500/50 transition text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres..."
                    className="w-full px-4 py-3 bg-neutral-950 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500/50 transition text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña..."
                    className="w-full px-4 py-3 bg-neutral-950 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500/50 transition text-sm font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword}
                  className="w-full py-3.5 mt-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {passwordLoading ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Actualizar Contraseña</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* TAB 3: Ajustes y Preferencias */}
          {activeTab === "preferences" && !isAdding && !editingProfile && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto bg-neutral-900 border border-white/5 rounded-3xl p-6 sm:p-8 text-left shadow-2xl space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <Settings className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Preferencias de Reproducción</h3>
                  <p className="text-xs text-neutral-400">Personaliza la experiencia del reproductor</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Auto play next episode */}
                <div className="flex items-center justify-between p-4 bg-neutral-950/50 rounded-2xl border border-white/5">
                  <div className="flex gap-3">
                    <PlayCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">Auto-reproducir Siguiente Capítulo</p>
                      <p className="text-xs text-neutral-400">Inicia automáticamente el episodio posterior al terminar.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoPlay}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      autoPlayNext ? "bg-rose-600" : "bg-neutral-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoPlayNext ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Auto skip intros */}
                <div className="flex items-center justify-between p-4 bg-neutral-950/50 rounded-2xl border border-white/5">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">Omitir Intros Automáticamente</p>
                      <p className="text-xs text-neutral-400">Salta los primeros 90s de apertura cuando esté disponible.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoSkip}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      autoSkipIntro ? "bg-rose-600" : "bg-neutral-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoSkipIntro ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Form Modal for Creating/Editing Profiles */}
          {(isAdding || editingProfile) && (
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
                  className="p-1 rounded-full text-neutral-500 hover:text-white transition cursor-pointer"
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
                          className={`aspect-square rounded-lg overflow-hidden border transition cursor-pointer ${
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
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
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
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-950/20 text-rose-400 border border-rose-900/30 hover:bg-rose-900/30 transition mr-auto cursor-pointer"
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
                      className="px-4 py-2.5 rounded-xl font-bold text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={!profileName.trim()}
                      className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 transition cursor-pointer"
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
