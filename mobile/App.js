import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { registerForPushNotifications } from './src/utils/notifications';
import { colors } from './src/utils/theme';

import LoginScreen from './src/screens/LoginScreen';
import ListsScreen from './src/screens/ListsScreen';
import ListDetailScreen from './src/screens/ListDetailScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.s1 },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600', fontSize: 16 },
  contentStyle: { backgroundColor: colors.bg },
};

function TabIcon({ label }) {
  const icons = {
    'Λίστες': '🛒',
    'Ιστορικό': '📜',
    'Ρυθμίσεις': '⚙️',
  };
  return <Text style={{ fontSize: 20 }}>{icons[label] || '📦'}</Text>;
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarStyle: {
          backgroundColor: colors.s1,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: () => <TabIcon label={route.name} />,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      })}
    >
      <Tab.Screen
        name="Λίστες"
        component={ListsScreen}
        options={{ title: 'Λίστες Αγορών' }}
      />
      <Tab.Screen
        name="Ιστορικό"
        component={HistoryScreen}
        options={{ title: 'Ιστορικό' }}
      />
      <Tab.Screen
        name="Ρυθμίσεις"
        component={SettingsScreen}
        options={{ title: 'Ρυθμίσεις' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const navigationRef = useRef(null);
  useKeepAwake();

  useEffect(() => {
    if (user) {
      registerForPushNotifications();
    }
  }, [user]);

  // Handle notification tap — navigate to list
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      // Could navigate to specific list if data includes listId
      if (navigationRef.current) {
        navigationRef.current.navigate('Home');
      }
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={screenOptions}>
        {user ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ListDetail"
              component={ListDetailScreen}
              options={({ route }) => ({ title: route.params?.title || 'Λίστα' })}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
