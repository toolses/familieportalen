import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri, ResponseType } from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../config/firebase';
import { useAuthStore } from '../store/auth.store';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '745029363713-46vtnb75s4dob02ra9i9e6h053fok52a.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'FYLL_INN_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = 'FYLL_INN_ANDROID_CLIENT_ID.apps.googleusercontent.com';

/**
 * Wraps useAuthStore + expo-auth-session to expose a single signInWithGoogle function.
 * Use this hook in components that need to trigger sign-in.
 * For read-only access to user/loading state, use useAuthStore directly.
 */
export function useAuth() {
  const { user, loading, signOut } = useAuthStore();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    redirectUri: makeRedirectUri({ scheme: 'familieportalen' }),
    responseType: ResponseType.Token,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const { access_token } = response.params;
      signInWithCredential(auth, GoogleAuthProvider.credential(null, access_token))
        .catch(() => setError('Innlogging feilet. Prøv igjen.'))
        .finally(() => setSigningIn(false));
    } else if (response.type === 'error' || response.type === 'dismiss') {
      setError(response.type === 'error' ? 'Innlogging feilet. Prøv igjen.' : null);
      setSigningIn(false);
    }
  }, [response]);

  const signInWithGoogle = async () => {
    setError(null);
    setSigningIn(true);
    try {
      if (Platform.OS === 'web') {
        await signInWithPopup(auth, new GoogleAuthProvider());
        setSigningIn(false);
      } else {
        await promptAsync();
        // signingIn reset happens in the response useEffect
      }
    } catch {
      setError('Innlogging feilet. Prøv igjen.');
      setSigningIn(false);
    }
  };

  return {
    user,
    isLoading: loading,
    isSigningIn: signingIn,
    isReady: Platform.OS === 'web' || !!request,
    error,
    clearError: () => setError(null),
    signInWithGoogle,
    signOut,
  };
}
