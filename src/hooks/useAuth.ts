import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, setDoc, doc } from "firebase/firestore";
import { auth, db, OperationType, handleFirestoreError } from "../lib/firebase";
import { User, Profile } from "../types";
import { safeLocalStorage } from "../utils/safeStorage";

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        try {
          const userDocRef = doc(db, "users", fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let userData: any;
          const isAdminUser = fbUser.email?.trim().toLowerCase() === "baezcabrera.j.r@gmail.com";
          
          if (userDoc.exists()) {
            userData = userDoc.data();
            
            // Check and initialize profiles
            let profilesChanged = false;
            if (!userData.profiles || userData.profiles.length === 0) {
              userData.profiles = [
                {
                  id: "default",
                  name: userData.username || fbUser.displayName || "Principal",
                  avatarUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop",
                  favorites: userData.favorites || [],
                  history: userData.history || [],
                  isChild: false
                }
              ];
              profilesChanged = true;
            }
            if (!userData.activeProfileId) {
              userData.activeProfileId = "default";
              profilesChanged = true;
            }

            const updates: any = {
              lastActive: new Date().toISOString(),
              isAdmin: isAdminUser
            };
            if (profilesChanged) {
              updates.profiles = userData.profiles;
              updates.activeProfileId = userData.activeProfileId;
            }

            await setDoc(userDocRef, updates, { merge: true });
            userData.lastActive = new Date().toISOString();
            userData.isAdmin = isAdminUser;
          } else {
            const defaultProfile = {
              id: "default",
              name: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuario",
              avatarUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop",
              favorites: [],
              history: [],
              isChild: false
            };
            userData = {
              id: fbUser.uid,
              username: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuario",
              email: fbUser.email?.toLowerCase() || "",
              favorites: [],
              history: [],
              profiles: [defaultProfile],
              activeProfileId: "default",
              isAdmin: isAdminUser,
              lastActive: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, userData);
          }
          
          setCurrentUser(userData as User);
          try { safeLocalStorage.setItem("megaAnime_user", JSON.stringify(userData)); } catch (e) {}
        } catch (error) {
          console.error("Firestore loading failed on auth state change:", error);
          const cachedUser = safeLocalStorage.getItem("megaAnime_user");
          if (cachedUser) {
            try {
              setCurrentUser(JSON.parse(cachedUser));
            } catch (e) {
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        }
      } else {
        setCurrentUser(null);
        try { safeLocalStorage.removeItem("megaAnime_user"); } catch (e) {}
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const switchProfile = async (profileId: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, activeProfileId: profileId };
    setCurrentUser(updatedUser);
    try { safeLocalStorage.setItem("megaAnime_user", JSON.stringify(updatedUser)); } catch (e) {}

    try {
      const userDocRef = doc(db, "users", currentUser.id);
      await setDoc(userDocRef, { activeProfileId: profileId }, { merge: true });
    } catch (error) {
      console.warn("Firestore sync failed for switchProfile:", error);
    }
  };

  const createProfile = async (name: string, avatarUrl: string, isChild: boolean = false) => {
    if (!currentUser) return;
    const newProfile: Profile = {
      id: "profile_" + Date.now(),
      name,
      avatarUrl,
      favorites: [],
      history: [],
      isChild
    };
    
    const currentProfiles = currentUser.profiles || [];
    const updatedProfiles = [...currentProfiles, newProfile];
    
    const updatedUser = { ...currentUser, profiles: updatedProfiles };
    setCurrentUser(updatedUser);
    try { safeLocalStorage.setItem("megaAnime_user", JSON.stringify(updatedUser)); } catch(e) {}

    try {
      const userDocRef = doc(db, "users", currentUser.id);
      await setDoc(userDocRef, { profiles: updatedProfiles }, { merge: true });
    } catch (error) {
      console.warn("Firestore sync failed for createProfile:", error);
    }
  };

  const updateProfile = async (profileId: string, name: string, avatarUrl: string, isChild: boolean = false) => {
    if (!currentUser) return;
    const currentProfiles = currentUser.profiles || [];
    const updatedProfiles = currentProfiles.map(p => {
      if (p.id === profileId) {
        return { ...p, name, avatarUrl, isChild };
      }
      return p;
    });
    
    const updatedUser = { ...currentUser, profiles: updatedProfiles };
    setCurrentUser(updatedUser);
    try { safeLocalStorage.setItem("megaAnime_user", JSON.stringify(updatedUser)); } catch(e) {}

    try {
      const userDocRef = doc(db, "users", currentUser.id);
      await setDoc(userDocRef, { profiles: updatedProfiles }, { merge: true });
    } catch (error) {
      console.warn("Firestore sync failed for updateProfile:", error);
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!currentUser || profileId === "default") return;
    const currentProfiles = currentUser.profiles || [];
    const updatedProfiles = currentProfiles.filter(p => p.id !== profileId);
    
    // If the deleted profile was active, switch active profile back to "default"
    let newActiveId = currentUser.activeProfileId;
    if (newActiveId === profileId) {
      newActiveId = "default";
    }
    
    const updatedUser = { 
      ...currentUser, 
      profiles: updatedProfiles,
      activeProfileId: newActiveId
    };
    setCurrentUser(updatedUser);
    try { safeLocalStorage.setItem("megaAnime_user", JSON.stringify(updatedUser)); } catch(e) {}

    try {
      const userDocRef = doc(db, "users", currentUser.id);
      await setDoc(userDocRef, { 
        profiles: updatedProfiles,
        activeProfileId: newActiveId
      }, { merge: true });
    } catch (error) {
      console.warn("Firestore sync failed for deleteProfile:", error);
    }
  };

  return { currentUser, setCurrentUser, loading, switchProfile, createProfile, updateProfile, deleteProfile };
}
