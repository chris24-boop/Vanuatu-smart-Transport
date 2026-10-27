import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTransportStore } from '@/store/transportStore';
import { DriverVerificationStatus } from '@/types/user';

import { Pressable, Alert } from 'react-native';
import { useAuthStore } from '@/store/authStore';

export default function AdminLayout() {
  const { logout } = useAuthStore();
  const drivers = useTransportStore((s) => s.drivers);
  const pendingCount = drivers.filter(
    (d) => d.verificationStatus === DriverVerificationStatus.PENDING_VERIFICATION
  ).length;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of the Admin panel?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF9500',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5EA',
          paddingBottom: 8,
          marginBottom: 35,      
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: '#1C1C1E',
        },
        headerRight: () => (
          <Pressable
            onPress={handleLogout}
            style={{ marginRight: 16, padding: 6 }}
          >
            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Drivers',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#FF3B30', fontSize: 10 },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trip Control',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'map' : 'map-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
