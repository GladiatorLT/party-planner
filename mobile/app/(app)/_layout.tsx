import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function AppLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#E5E7EB', height: 60 },
      tabBarActiveTintColor: '#7C3AED',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Events', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎉</Text> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }} />
    </Tabs>
  );
}
