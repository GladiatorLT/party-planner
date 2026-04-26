import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/store/authStore';
import { api } from '../../../../src/services/api';
import { colors } from '../../../../src/theme';
import EventHeader from '../../../../src/components/EventHeader';

interface Message { role: 'ai' | 'user'; text: string; }

const SUGGESTIONS = [
  'What should I do this week?',
  'Suggest decoration ideas',
  'Help me write a speech',
  'What could go wrong?',
  'Give me a day-of checklist',
];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hi! I'm your AI assistant for this event 🎉 Ask me anything — decoration ideas, vendor questions, day-of tips, or anything else!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: event } = useQuery({ queryKey: ['event', id], queryFn: () => api.getEvent(accessToken!, id), enabled: !!accessToken && !!id });
  const { data: planning = [] } = useQuery({ queryKey: ['planning', id], queryFn: () => api.getPlanning(accessToken!, id), enabled: !!accessToken && !!id });

  const aiPlan = planning.find((p: any) => p.category === 'AI_PLAN')?.content;

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const eventContext = { ...event, aiPlan };
      const res = await api.ai(accessToken!, 'chat', { eventContext, userMessage: userMsg });
      setMessages(prev => [...prev, { role: 'ai', text: res.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <EventHeader title={event?.title || ''} eventDate={event?.eventDate} />
      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {messages.map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {msg.role === 'ai' && <Text style={styles.aiLabel}>✨ AI</Text>}
            <Text style={[styles.bubbleText, msg.role === 'user' && styles.userText]}>{msg.text}</Text>
          </View>
        ))}
        {loading && (
          <View style={styles.aiBubble}>
            <Text style={styles.aiLabel}>✨ AI</Text>
            <ActivityIndicator color={colors.accent} size="small" />
          </View>
        )}
        {messages.length === 1 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestLabel}>QUICK QUESTIONS</Text>
            {SUGGESTIONS.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestion} onPress={() => send(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask anything about your event..."
          placeholderTextColor={colors.textDim}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={() => send(input)} disabled={loading || !input.trim()}>
          <Text style={styles.sendText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  messages: { flex: 1 },
  bubble: { borderRadius: 14, padding: 14, maxWidth: '85%' },
  aiBubble: { backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  userBubble: { backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.accent, alignSelf: 'flex-end' },
  aiLabel: { fontSize: 10, color: colors.accentGlow, fontWeight: '700', marginBottom: 6, letterSpacing: 1 },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  userText: { color: '#fff' },
  suggestions: { gap: 8, marginTop: 8 },
  suggestLabel: { fontSize: 10, color: colors.textSecondary, letterSpacing: 1.5, fontWeight: '700' },
  suggestion: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12 },
  suggestionText: { fontSize: 13, color: colors.accentGlow },
  inputRow: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: colors.text, maxHeight: 100 },
  sendBtn: { backgroundColor: colors.accent, borderRadius: 10, width: 46, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
