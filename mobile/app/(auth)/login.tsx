import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { auth } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/authStore';
import { colors } from '../../src/theme';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setTokens } = useAuthStore();

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true);
    try {
      const tokens = await auth.signIn(username.trim(), password);
      await setTokens(tokens, username.trim());
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Party Planner</Text>
        <Text style={styles.subtitle}>AI-powered event planning</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor={colors.textDim}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Enter password"
              placeholderTextColor={colors.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Sign In →</Text>
          }
        </TouchableOpacity>

        <View style={styles.links}>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.link}>Create account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 28 },
  header: { alignItems: 'center', marginBottom: 48 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 34, fontWeight: 'bold', color: colors.accentGlow, letterSpacing: 1, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textSecondary, letterSpacing: 0.5 },
  form: { gap: 20 },
  inputWrapper: { gap: 6 },
  label: { fontSize: 12, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: colors.text },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14 },
  eyeText: { fontSize: 16 },
  button: { backgroundColor: colors.accent, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  link: { color: colors.accentGlow, fontSize: 13 },
});
