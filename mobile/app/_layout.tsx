import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import '../global.css';
import { useAuthStore } from '../src/store/auth.store';
import { useUserStore } from '../src/store/useUserStore';
import { useFamilyStore } from '../src/store/useFamilyStore';
import { useListStore } from '../src/store/useListStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  const listenToUserDocument = useUserStore((s) => s.listenToUserDocument);
  const resetUser = useUserStore((s) => s.reset);
  const householdId = useUserStore((s) => s.householdId);

  const listenToHousehold = useFamilyStore((s) => s.listenToHousehold);
  const resetFamily = useFamilyStore((s) => s.reset);

  const listenToLists = useListStore((s) => s.listenToLists);
  const resetLists = useListStore((s) => s.reset);

  const router = useRouter();
  const segments = useSegments();

  const userDocUnsub = useRef<(() => void) | null>(null);
  const householdUnsub = useRef<(() => void) | null>(null);
  const listsUnsub = useRef<(() => void) | null>(null);

  // Boot Firebase Auth listener once
  useEffect(() => {
    return init();
  }, []);

  // Step 1: Auth state → start/stop user document listener
  useEffect(() => {
    userDocUnsub.current?.();
    userDocUnsub.current = null;

    if (user) {
      userDocUnsub.current = listenToUserDocument(user.uid);
    } else {
      resetUser();
      resetFamily();
    }

    return () => {
      userDocUnsub.current?.();
      userDocUnsub.current = null;
    };
  }, [user?.uid]);

  // Step 2: householdId from user doc → start/stop household listener
  useEffect(() => {
    householdUnsub.current?.();
    householdUnsub.current = null;

    if (householdId) {
      householdUnsub.current = listenToHousehold(householdId);
      listsUnsub.current = listenToLists(householdId);
    } else {
      resetFamily();
      resetLists();
    }

    return () => {
      householdUnsub.current?.();
      householdUnsub.current = null;
      listsUnsub.current?.();
      listsUnsub.current = null;
    };
  }, [householdId]);

  // Navigation guard + splash hide
  useEffect(() => {
    if (authLoading) return;

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, authLoading, segments]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
