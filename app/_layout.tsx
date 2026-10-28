import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import StartupSplashScreen from '@/components/SplashScreen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isAuthenticated, isLoading, user, loadToken } = useAuthStore();
  const segments = useSegments();
  const segmentList: string[]=[...segments];
  const router = useRouter();
  const hasHiddenNativeSplash = useRef(false);
  const [hasMinimumSplashDurationElapsed, setHasMinimumSplashDurationElapsed] =
    useState(false);
  const isDarkAuthScreen =
    segmentList[0] === '(auth)' &&
    (segmentList.at(1) === 'login' || segmentList.at(1) === 'register');

  const hideNativeSplash = () => {
    if (hasHiddenNativeSplash.current) return;

    hasHiddenNativeSplash.current = true;
    SplashScreen.hide();
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHasMinimumSplashDurationElapsed(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  useEffect(() => {
    if (isLoading || !hasMinimumSplashDurationElapsed) return;
    if (segmentList.at(0) === 'tourist') return;

    const inAuthGroup = segmentList[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated) {
      const currentGroup = segmentList[0];

      if (user?.role === 'ADMIN') {
        if (currentGroup !== '(admin)') {
          router.replace('/(admin)/dashboard');
        }
      } else if (user?.role === 'DRIVER') {
        if (currentGroup !== '(driver)') {
          router.replace('/(driver)/dashboard');
        }
      } else {
        // PASSENGER role
        if (currentGroup !== '(passenger)') {
          router.replace('/(passenger)/home');
        }
      }
    }
  }, [
    hasMinimumSplashDurationElapsed,
    isAuthenticated,
    isLoading,
    user,
    segments,
    router,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar
        animated
        barStyle={isDarkAuthScreen ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkAuthScreen ? '#087F86' : '#F8FBF9'}
        translucent={false}
      />
      <Stack screenOptions={{ headerShown: false }} />
      {(isLoading || !hasMinimumSplashDurationElapsed) && (
        <StartupSplashScreen onLayout={hideNativeSplash} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
