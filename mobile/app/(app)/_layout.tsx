import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/theme';

export default function AppLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 60 },
      tabBarActiveTintColor: colors.accentGlow,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    }}>
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Events', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🎉</Text> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text> }}
      />
      <Tabs.Screen
        name="events"
        options={{ href: null }}
      />
    </Tabs>
  );
}
