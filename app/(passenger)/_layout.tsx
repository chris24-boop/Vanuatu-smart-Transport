import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function PassengerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0A84FF',
        tabBarInactiveTintColor: '#8E8E93',

        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5EA',
          paddingBottom: 8,
          marginBottom: 50,
          paddingTop: 8,
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
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}