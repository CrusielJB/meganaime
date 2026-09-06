import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthScreenProps {
  onSuccess: (user: any) => void;
  onCancel?: () => void;
}

export function AuthScreen({ onSuccess, onCancel }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Introduce un correo electrónico válido');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!isLogin && username.trim().length < 2) {
      setErrorMsg('Introduce un nombre de usuario válido');
      return;
    }

    setLoading(true);
    try {
      let fbUser: any;
      if (isLogin) {
        const cred = await Promise.race([
          signInWithEmailAndPassword(auth, cleanEmail, password),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]) as any;
        fbUser = cred.user;
      } else {
        const cred = await Promise.race([
          createUserWithEmailAndPassword(auth, cleanEmail, password),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]) as any;
        fbUser = cred.user;
      }

      const isAdminUser = cleanEmail === 'baezcabrera.j.r@gmail.com';
      let userData: any = null;

      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const docSnap = await Promise.race([
          getDoc(userDocRef),
          new Promise((_, reject) => setTimeout(() => reject(new Error('doc_timeout')), 2500))
        ]) as any;

        if (docSnap && docSnap.exists()) {
          userData = docSnap.data();
          userData.isAdmin = isAdminUser;
        }
      } catch (e) {
        console.warn('Firestore fetch timeout/error, using fallback:', e);
      }

      if (!userData) {
        userData = {
          id: fbUser.uid,
          username: isLogin ? (fbUser.displayName || cleanEmail.split('@')[0]) : username.trim(),
          email: cleanEmail,
          avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png',
          favorites: [],
          history: [],
          isAdmin: isAdminUser,
          createdAt: new Date().toISOString()
        };
        setDoc(doc(db, 'users', fbUser.uid), userData, { merge: true }).catch(() => {});
      }

      await AsyncStorage.setItem('megaAnime_native_user', JSON.stringify(userData));
      onSuccess(userData);
    } catch (err: any) {
      let msg = 'Ocurrió un error en la autenticación.';
      if (err.message === 'timeout') {
        msg = 'Tiempo de espera agotado. Revisa tu conexión.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = 'Correo electrónico o contraseña incorrectos.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este correo ya está registrado. Inicia sesión.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>
                mega<Text style={styles.logoHighlight}>Anime</Text>
              </Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Inicia Sesión en tu Cuenta' : 'Crea tu Cuenta Gratuita'}
              </Text>
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre de Usuario</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: OtakuMaster"
                  placeholderTextColor="#666"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setErrorMsg('');
                setIsLogin(!isLogin);
              }}
            >
              <Text style={styles.switchText}>
                {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <Text style={styles.switchHighlight}>
                  {isLogin ? 'Regístrate aquí' : 'Inicia Sesión'}
                </Text>
              </Text>
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText}>Continuar como Invitado</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: '#171717',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#e11d48',
    letterSpacing: -0.5
  },
  logoHighlight: {
    color: '#ffffff'
  },
  subtitle: {
    color: '#a3a3a3',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500'
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    color: '#d4d4d4',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 15
  },
  primaryButton: {
    backgroundColor: '#e11d48',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  buttonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center'
  },
  switchText: {
    color: '#a3a3a3',
    fontSize: 13
  },
  switchHighlight: {
    color: '#e11d48',
    fontWeight: '700'
  },
  cancelButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8
  },
  cancelText: {
    color: '#737373',
    fontSize: 13,
    fontWeight: '500'
  }
});
