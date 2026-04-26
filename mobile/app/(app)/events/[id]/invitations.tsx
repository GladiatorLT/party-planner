import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/store/authStore';
import { api } from '../../../../src/services/api';
import { colors } from '../../../../src/theme';
import EventHeader from '../../../../src/components/EventHeader';

export default function InvitationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: event } = useQuery({ queryKey: ['event', id], queryFn: () => api.getEvent(accessToken!, id), enabled: !!accessToken && !!id });
  const { data: planning = [] } = useQuery({ queryKey: ['planning', id], queryFn: () => api.getPlanning(accessToken!, id), enabled: !!accessToken && !!id });
  const { data: guests = [] } = useQuery({ queryKey: ['guests', id], queryFn: () => api.getGuests(accessToken!, id), enabled: !!accessToken && !!id });
  const { data: invitations = [], isLoading } = useQuery({ queryKey: ['invitations', id], queryFn: () => api.getInvitations(accessToken!, id), enabled: !!accessToken && !!id });

  const aiPlan = planning.find((p: any) => p.category === 'AI_PLAN')?.content;
  const invitation = invitations[0];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createInvitation(accessToken!, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations', id] }),
  });

  const generateInvitation = async () => {
    if (!event) return;
    setGenerating(true);
    try {
      const eventContext = { ...event, aiPlan, guestCount: guests.length };
      const res = await api.ai(accessToken!, 'generate-invitation', { eventId: id, eventContext });
      const inv = res.invitation;
      await createMutation.mutateAsync({
        subject: inv.subject,
        htmlContent: inv.htmlBody,
        design: inv.designs?.[0] || {},
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const sendToAll = async () => {
    if (!invitation) return;
    const guestsWithEmail = guests.filter((g: any) => g.email);
    if (guestsWithEmail.length === 0) {
      Alert.alert('No emails', 'Add guest emails first before sending invitations.');
      return;
    }
    Alert.alert('Send Invitations', `Send to ${guestsWithEmail.length} guests with email addresses?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send', onPress: async () => {
          setSending(true);
          try {
            const res = await api.sendInvitation(accessToken!, id, invitation.invitationId, {});
            Alert.alert('Sent!', `Successfully sent to ${res.sentCount} guests.`);
            queryClient.invalidateQueries({ queryKey: ['invitations', id] });
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setSending(false);
          }
        }
      }
    ]);
  };

  const guestsWithEmail = guests.filter((g: any) => g.email).length;

  return (
    <View style={styles.container}>
      <EventHeader title={event?.title || ''} eventDate={event?.eventDate} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : !invitation ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✉️</Text>
            <Text style={styles.emptyTitle}>No invitation yet</Text>
            <Text style={styles.emptyText}>AI will design a beautiful personalized invitation based on your event theme.</Text>
            <TouchableOpacity style={styles.genBtn} onPress={generateInvitation} disabled={generating}>
              {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.genBtnText}>✨ Generate Invitation</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Subject preview */}
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>EMAIL SUBJECT</Text>
              <Text style={styles.previewSubject}>{invitation.subject}</Text>
            </View>

            {/* HTML preview */}
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>INVITATION PREVIEW</Text>
              <Text style={styles.previewHtml} numberOfLines={12}>{invitation.htmlContent?.replace(/<[^>]*>/g, '').trim()}</Text>
            </View>

            {/* Design info */}
            {invitation.design && (
              <View style={styles.designCard}>
                <Text style={styles.previewLabel}>DESIGN</Text>
                <View style={styles.designRow}>
                  {invitation.design.primaryColor && <View style={[styles.colorSwatch, { backgroundColor: invitation.design.primaryColor }]} />}
                  {invitation.design.accentColor && <View style={[styles.colorSwatch, { backgroundColor: invitation.design.accentColor }]} />}
                  {invitation.design.style && <Text style={styles.designStyle}>{invitation.design.style}</Text>}
                </View>
              </View>
            )}

            {/* Send stats */}
            <View style={styles.statsCard}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Guests with email</Text>
                <Text style={styles.statValue}>{guestsWithEmail}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Previously sent</Text>
                <Text style={styles.statValue}>{invitation.sentCount || 0}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.regenBtn} onPress={generateInvitation} disabled={generating}>
                <Text style={styles.regenBtnText}>{generating ? '...' : '✨ Regenerate'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sendBtn, guestsWithEmail === 0 && styles.sendBtnDisabled]} onPress={sendToAll} disabled={sending || guestsWithEmail === 0}>
                {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendBtnText}>📨 Send to {guestsWithEmail} Guests</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  genBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  genBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  previewCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  previewLabel: { fontSize: 10, color: colors.accentGlow, fontWeight: '700', letterSpacing: 1.5 },
  previewSubject: { fontSize: 16, fontWeight: '600', color: colors.text },
  previewHtml: { fontSize: 12, color: colors.textSecondary, lineHeight: 20 },
  designCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  designRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorSwatch: { width: 24, height: 24, borderRadius: 12 },
  designStyle: { fontSize: 13, color: colors.text, textTransform: 'capitalize' },
  statsCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 13, color: colors.textSecondary },
  statValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  actionRow: { flexDirection: 'row', gap: 10 },
  regenBtn: { flex: 1, backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  regenBtnText: { color: colors.accentGlow, fontSize: 13, fontWeight: '600' },
  sendBtn: { flex: 2, backgroundColor: colors.accent, borderRadius: 10, padding: 14, alignItems: 'center', shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
