import { Stack } from 'expo-router';
import { colors } from '../../../../src/theme';

export default function EventLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
