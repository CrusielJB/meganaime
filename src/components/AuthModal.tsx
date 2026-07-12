import React, { useState } from "react";
import { X, Mail, Lock, User, Sparkles, AlertCircle, Play } from "lucide-react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "firebase/auth";
import { setDoc, getDoc, doc } from "firebase/firestore";
import { auth, db, OperationType, handleFirestoreError } from "../lib/firebase";

interface AuthModalProps {
  onClose?: () => void;
  onSuccess: (user: any) => void;
  isFullScreen?: boolean;
}

export default function AuthModal({ onClose, onSuccess, isFullScreen = false }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isLogin) {
        // Firebase Login
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = userCredential.user;

        // Fetch User Profile from Firestore
        let userData: any;
        const isAdminUser = cleanEmail === "baezcabrera.j.r@gmail.com";
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            userData = userDoc.data();
            userData.isAdmin = isAdminUser;
          } else {
            // Auto-create on-the-fly if document is missing
            userData = {
              id: fbUser.uid,
              username: fbUser.displayName || email.split("@")[0],
              email: cleanEmail,
              favorites: [],
              history: [],
              isAdmin: isAdminUser,
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, "users", fbUser.uid), userData);
          }
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.GET, `users/${fbUser.uid}`);
        }

        onSuccess(userData);
      } else {
        // Firebase Signup
        if (username.trim().length < 2) {
          throw new Error("El nombre de usuario debe tener al menos 2 caracteres");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = userCredential.user;
        const isAdminUser = cleanEmail === "baezcabrera.j.r@gmail.com";

        // Create User Profile in Firestore
        const userData = {
          id: fbUser.uid,
          username: username.trim(),
          email: cleanEmail,
          favorites: [],
          history: [],
          isAdmin: isAdminUser,
          createdAt: new Date().toISOString()
        };

        try {
          await setDoc(doc(db, "users", fbUser.uid), userData);
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${fbUser.uid}`);
        }

        onSuccess(userData);
      }
    } catch (err: any) {
      let msg = err.message || "Ocurrió un error en la autenticación.";
      if (err.code === "auth/email-already-in-use") {
        msg = "Este correo electrónico ya está registrado.";
      } else if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        msg = "Correo electrónico o contraseña incorrectos.";
      } else if (err.code === "auth/weak-password") {
        msg = "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
      } else if (err.code === "auth/invalid-email") {
        msg = "El formato del correo electrónico no es válido.";
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;

      // Check if user doc exists
      let userData: any;
      const userDocRef = doc(db, "users", fbUser.uid);
      const userEmail = fbUser.email?.toLowerCase() || "";
      const isAdminUser = userEmail === "baezcabrera.j.r@gmail.com";
      
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          userData = userDoc.data();
          userData.isAdmin = isAdminUser;
        } else {
          userData = {
            id: fbUser.uid,
            username: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuario",
            email: userEmail,
            favorites: [],
            history: [],
            isAdmin: isAdminUser,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, userData);
        }
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.GET, `users/${fbUser.uid}`);
      }

      onSuccess(userData);
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setErrorMsg(err.message || "Error al iniciar sesión con Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const cardContent = (
    <div className={`relative w-full max-w-md rounded-3xl border border-white/10 ${isFullScreen ? 'bg-neutral-900/40 backdrop-blur-xl' : 'bg-neutral-950'} p-6 sm:p-8 text-neutral-100 shadow-2xl overflow-hidden`}>
      {/* Glow Effects */}
      <div className="absolute -top-16 -left-16 h-36 w-36 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 h-36 w-36 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-rose-500" />
          <h2 className="text-lg font-black tracking-tight text-white">
            {isLogin ? "Inicia Sesión en megaAnime" : "Únete a megaAnime"}
          </h2>
        </div>
        {!isFullScreen && onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-4 flex items-start space-x-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
          <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4 relative">
        {!isLogin && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400">Nombre de Usuario</label>
            <div className="relative">
              <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Tu alias favorito"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/5 bg-white/5 py-2.5 pr-4 pl-10 text-sm text-white placeholder-neutral-500 focus:border-rose-500/40 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-rose-500/40 transition-all"
                required={!isLogin}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-400">Correo Electrónico</label>
          <div className="relative">
            <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-white/5 py-2.5 pr-4 pl-10 text-sm text-white placeholder-neutral-500 focus:border-rose-500/40 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-rose-500/40 transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-400">Contraseña</label>
          <div className="relative">
            <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-white/5 py-2.5 pr-4 pl-10 text-sm text-white placeholder-neutral-500 focus:border-rose-500/40 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-rose-500/40 transition-all"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-sm font-bold text-white shadow-lg shadow-rose-600/15 hover:from-rose-500 hover:to-rose-400 active:scale-95 disabled:scale-100 disabled:opacity-50 transition cursor-pointer"
        >
          {loading ? "Procesando..." : isLogin ? "Iniciar Sesión" : "Registrarse Ahora"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-4 flex items-center justify-between text-neutral-600 text-[10px] uppercase font-bold tracking-wider relative">
        <div className="h-px bg-white/5 flex-grow" />
        <span className="px-3 text-neutral-500">O continúa con</span>
        <div className="h-px bg-white/5 flex-grow" />
      </div>

      {/* Google Login Button */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-2.5 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-200 transition flex items-center justify-center space-x-2 active:scale-95 disabled:scale-100 disabled:opacity-50 cursor-pointer relative"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        <span>Google</span>
      </button>

      {/* Toggle form button */}
      <div className="mt-5 border-t border-white/5 pt-4 text-center text-xs text-neutral-400 relative">
        <span>{isLogin ? "¿Nuevo en megaAnime?" : "¿Ya tienes una cuenta?"} </span>
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setErrorMsg("");
          }}
          className="font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
        >
          {isLogin ? "Crea una cuenta aquí" : "Inicia sesión aquí"}
        </button>
      </div>
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(244,63,94,0.15),rgba(255,255,255,0))]">
        {/* Animated grid lines pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 space-y-2.5 relative z-10 scale-105 sm:scale-110">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 shadow-xl shadow-rose-500/30">
            <Play className="h-7 w-7 fill-white text-white ml-0.5" />
          </div>
          <span className="bg-gradient-to-r from-white via-neutral-100 to-rose-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">
            mega<span className="text-rose-500">Anime</span>
          </span>
          <p className="text-xs text-neutral-400 max-w-xs text-center font-medium">El portal definitivo para anime, películas y mangas en alta calidad</p>
        </div>

        {cardContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      {cardContent}
    </div>
  );
}

