import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/store/authStore';
import { api } from '../../../../src/services/api';
import { colors } from '../../../../src/theme';
import EventHeader from '../../../../src/components/EventHeader';

const SECTIONS = [
  { key: 'timeline', emoji: '📋', label: 'Timeline', desc: 'Tasks & deadlines' },
  { key: 'guests', emoji: '👥', label: 'Guests', desc: 'Manage & RSVP' },
  { key: 'menu', emoji: '🍽️', label: 'Menu', desc: 'Food & drinks' },
  { key: 'budget', emoji: '💰', label: 'Budget', desc: 'Track spending' },
  { key: 'invitations', emoji: '✉️', label: 'Invitations', desc: 'Design & send' },
  { key: 'chat', emoji: '✨', label: 'AI Chat', desc: 'Ask anything' },
];

export default function EventHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.getEvent(accessToken!, id),
    enabled: !!accessToken && !!id,
  });

  const { data: planning = [] } = useQuery({
    queryKey: ['planning', id],
    queryFn: () => api.getPlanning(accessToken!, id),
    enabled: !!accessToken && !!id,
  });

  const aiPlan = planning.find((p: any) => p.category === 'AI_PLAN')?.content;

  const handleDelete = () => {
    Alert.alert('Delete Event', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await api.deleteEvent(accessToken!, id);
          queryClient.invalidateQueries({ queryKey: ['events'] });
          router.replace('/(app)/dashboard');
        }
      }
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <EventHeader title="Loading..." />
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (!event) return null;

  return (
    <View style={styles.container}>
      <EventHeader title={event.title} eventDate={event.eventDate} type={event.type} />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* AI Summary Card */}
        {aiPlan && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>✨ AI PLAN SUMMARY</Text>
            <Text style={styles.summaryText}>{aiPlan.summary || `${event.title} — AI plan ready`}</Text>
            {aiPlan.theme && (
              <View style={styles.themeRow}>
                {aiPlan.theme.colorPalette?.map((c: string, i: number) => (
                  <View key={i} style={[styles.colorDot, { backgroundColor: c }]} />
                ))}
                <Text style={styles.themeName}>{aiPlan.theme.name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Event Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>TYPE</Text>
            <Text style={styles.detailValue}>{event.type || 'Custom'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>DATE</Text>
            <Text style={styles.detailValue}>{event.eventDate ? new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>STATUS</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>● {event.status}</Text>
            </View>
          </View>
          {event.theme && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>THEME</Text>
              <Text style={styles.detailValue}>{event.theme}</Text>
            </View>
          )}
        </View>

        {/* Section Grid */}
        <Text style={styles.sectionTitle}>PLANNING SECTIONS</Text>
        <View style={styles.grid}>
          {SECTIONS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={styles.gridCard}
              onPress={() => router.push(`/(app)/events/${id}/${s.key}` as any)}
            >
              <Text style={styles.gridEmoji}>{s.emoji}</Text>
              <Text style={styles.gridLabel}>{s.label}</Text>
              <Text style={styles.gridDesc}>{s.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Event</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  summaryCard: { backgroundColor: colors.surfaceHigh, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.borderBright, gap: 10 },
  summaryLabel: { fontSize: 10, color: colors.accentGlow, fontWeight: '700', letterSpacing: 1.5 },
  summaryText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  themeName: { fontSize: 12, color: colors.textSecondary },
  detailsCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 10, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, color: colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },
  statusBadge: { backgroundColor: '#1E3A5F', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, color: colors.accentGlow, fontWeight: '600', textTransform: 'capitalize' },
  sectionTitle: { fontSize: 10, color: colors.textSecondary, letterSpacing: 1.5, fontWeight: '700', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, width: '47%', gap: 6 },
  gridEmoji: { fontSize: 28 },
  gridLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  gridDesc: { fontSize: 11, color: colors.textSecondary },
  deleteBtn: { marginTop: 8, borderWidth: 1, borderColor: colors.danger, borderRadius: 10, padding: 14, alignItems: 'center' },
  deleteBtnText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
