import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { colors } from '../theme';

const TABS = [
  { key: 'index', label: '🏠 Hub' },
  { key: 'timeline', label: '📋 Timeline' },
  { key: 'guests', label: '👥 Guests' },
  { key: 'menu', label: '🍽️ Menu' },
  { key: 'budget', label: '💰 Budget' },
  { key: 'invitations', label: '✉️ Invites' },
  { key: 'chat', label: '✨ AI Chat' },
];

interface Props {
  title: string;
  eventDate?: string;
  type?: string;
}

export default function EventHeader({ title, eventDate, type }: Props) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pathname = usePathname();

  const activeTab = TABS.find(t => {
    if (t.key === 'index') return pathname.endsWith(`/${id}`);
    return pathname.endsWith(t.key);
  })?.key || 'index';

  const navigate = (key: string) => {
    const path = key === 'index'
      ? `/(app)/events/${id}`
      : `/(app)/events/${id}/${key}`;
    router.push(path as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.push('/(app)/dashboard')}>
          <Text style={styles.back}>← Events</Text>
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {eventDate && <Text style={styles.date}>{new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>}
        </View>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => navigate(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: 56 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  back: { color: colors.accentGlow, fontSize: 14, width: 60 },
  titleBlock: { flex: 1, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  date: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 0, gap: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: colors.accent },
  tabText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  activeTabText: { color: colors.accentGlow },
});
