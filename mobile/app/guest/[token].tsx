import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../src/services/api';
import { colors } from '../../src/theme';

export default function GuestPortalScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['rsvp', token],
    queryFn: () => api.getRsvp(token),
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (status: string) => api.submitRsvp(token, { rsvpStatus: status }),
    onSuccess: () => setSubmitted(true),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>🔗</Text>
        <Text style={styles.errorTitle}>Invalid Link</Text>
        <Text style={styles.errorText}>This invitation link is invalid or has expired.</Text>
      </View>
    );
  }

  const { guest, event } = data;

  if (submitted) {
    return (
      <View style={styles.center}>
        <Text style={styles.successEmoji}>{selected === 'yes' ? '🎉' : selected === 'no' ? '😢' : '🤔'}</Text>
        <Text style={styles.successTitle}>
          {selected === 'yes' ? "You're going!" : selected === 'no' ? 'Maybe next time' : 'Response recorded'}
        </Text>
        <Text style={styles.successText}>
          {selected === 'yes' ? `See you at ${event?.title}!` : 'Thanks for letting us know.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🎉</Text>
        <Text style={styles.headerTitle}>You're Invited!</Text>
      </View>

      <View style={styles.eventCard}>
        <Text style={styles.eventTitle}>{event?.title}</Text>
        {event?.eventDate && (
          <Text style={styles.eventDate}>
            📅 {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        )}
        {event?.venue && <Text style={styles.eventVenue}>📍 {event.venue}</Text>}
      </View>

      <View style={styles.guestCard}>
        <Text style={styles.guestGreeting}>Hello, <Text style={styles.guestName}>{guest?.name}</Text>!</Text>
        <Text style={styles.guestText}>Please let us know if you can make it.</Text>
      </View>

      <View style={styles.rsvpSection}>
        <Text style={styles.rsvpTitle}>Will you attend?</Text>
        {[
          { key: 'yes', emoji: '✅', label: "Yes, I'll be there!", color: colors.success },
          { key: 'maybe', emoji: '🤔', label: 'Maybe', color: colors.warning },
          { key: 'no', emoji: '❌', label: "Sorry, can't make it", color: colors.danger },
        ].map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.rsvpOption, selected === opt.key && { borderColor: opt.color, backgroundColor: opt.color + '15' }]}
            onPress={() => setSelected(opt.key)}
          >
            <Text style={styles.rsvpEmoji}>{opt.emoji}</Text>
            <Text style={[styles.rsvpLabel, selected === opt.key && { color: opt.color }]}>{opt.label}</Text>
            {selected === opt.key && <Text style={[styles.rsvpCheck, { color: opt.color }]}>●</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, !selected && styles.submitBtnDisabled]}
        onPress={() => selected && submitMutation.mutate(selected)}
        disabled={!selected || submitMutation.isPending}
      >
        {submitMutation.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>Submit RSVP</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 60, gap: 20, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  errorEmoji: { fontSize: 56 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  errorText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  successEmoji: { fontSize: 72 },
  successTitle: { fontSize: 26, fontWeight: '700', color: colors.text },
  successText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  header: { alignItems: 'center', gap: 8 },
  headerEmoji: { fontSize: 56 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: colors.accentGlow },
  eventCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.borderBright, gap: 8 },
  eventTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  eventDate: { fontSize: 14, color: colors.textSecondary },
  eventVenue: { fontSize: 14, color: colors.textSecondary },
  guestCard: { backgroundColor: colors.surfaceHigh, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 4 },
  guestGreeting: { fontSize: 16, color: colors.text },
  guestName: { color: colors.accentGlow, fontWeight: '700' },
  guestText: { fontSize: 13, color: colors.textSecondary },
  rsvpSection: { gap: 10 },
  rsvpTitle: { fontSize: 14, fontWeight: '700', color: colors.text, letterSpacing: 0.5 },
  rsvpOption: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: colors.border },
  rsvpEmoji: { fontSize: 22 },
  rsvpLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  rsvpCheck: { fontSize: 16 },
  submitBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
