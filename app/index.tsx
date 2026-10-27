import { Redirect } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    if (Platform.OS !== 'web') return null;

    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0D705B" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user?.role === 'ADMIN') {
    return <Redirect href="/(admin)/dashboard" />;
  }

  if (user?.role === 'DRIVER') {
    return <Redirect href="/(driver)/dashboard" />;
  }

  return <Redirect href="/(passenger)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7F5',
  },
});
