import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { api } from '../../../src/services/api';
import { colors } from '../../../src/theme';
import { useQueryClient } from '@tanstack/react-query';

interface Message {
  role: 'ai' | 'user';
  text: string;
}

export default function NewEventScreen() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hi! I'm your AI party planner 🎉 Let's create something amazing. What are we celebrating?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [planReady, setPlanReady] = useState<any>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const history = newMessages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
      const data = await api.ai(accessToken!, 'questionnaire', { userMessage: history });

      const aiReply = data.reply as string;
      setMessages(prev => [...prev, { role: 'ai', text: aiReply }]);

      // Check if AI returned a plan
      const planMatch = aiReply.match(/<plan>([\s\S]*?)<\/plan>/);
      if (planMatch) {
        try {
          const plan = JSON.parse(planMatch[1]);
          setPlanReady(plan);
        } catch {}
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const createEvent = async () => {
    if (!planReady) return;
    setCreating(true);
    try {
      await api.createEvent(accessToken!, {
        title: planReady.eventType || 'My Event',
        type: (planReady.eventType || 'custom').toLowerCase(),
        eventDate: planReady.suggestedDate || '',
        theme: planReady.theme || '',
        status: 'planning',
        aiSummary: JSON.stringify(planReady),
      });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI Event Planner</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {messages.map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {msg.role === 'ai' && <Text style={styles.aiLabel}>✨ AI</Text>}
            <Text style={[styles.bubbleText, msg.role === 'user' && styles.userText]}>
              {msg.text.replace(/<plan>[\s\S]*?<\/plan>/g, '').trim()}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={styles.aiBubble}>
            <Text style={styles.aiLabel}>✨ AI</Text>
            <ActivityIndicator color={colors.accent} size="small" />
          </View>
        )}
        {planReady && (
          <TouchableOpacity style={styles.createBtn} onPress={createEvent} disabled={creating}>
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.createBtnText}>🚀 Create This Event</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type your answer..."
          placeholderTextColor={colors.textDim}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={loading || !input.trim()}>
          <Text style={styles.sendText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.accentGlow, fontSize: 15, width: 60 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  messages: { flex: 1 },
  bubble: { borderRadius: 14, padding: 14, maxWidth: '85%' },
  aiBubble: { backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  userBubble: { backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.accent, alignSelf: 'flex-end' },
  aiLabel: { fontSize: 10, color: colors.accentGlow, fontWeight: '700', marginBottom: 6, letterSpacing: 1 },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  userText: { color: '#fff' },
  createBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: colors.text, maxHeight: 100 },
  sendBtn: { backgroundColor: colors.accent, borderRadius: 10, width: 46, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
