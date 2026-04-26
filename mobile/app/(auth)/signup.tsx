import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { auth } from '../../src/services/auth';
import { colors } from '../../src/theme';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'signup' | 'verify'>('signup');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!username || !email || !password) return;
    setLoading(true);
    try {
      await auth.signUp(username.trim(), password, email.trim());
      setStep('verify');
    } catch (err: any) {
      Alert.alert('Sign up failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code) return;
    setLoading(true);
    try {
      await auth.confirmSignUp(username.trim(), code.trim());
      Alert.alert('Success', 'Account created! Please sign in.');
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Verification failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{step === 'signup' ? 'Create Account' : 'Verify Email'}</Text>
      <Text style={styles.subtitle}>
        {step === 'signup' ? 'Free forever. Pay only per event.' : `Check ${email} for your code`}
      </Text>

      <View style={styles.form}>
        {step === 'signup' ? (
          <>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Username</Text>
              <TextInput style={styles.input} placeholder="Choose a username" placeholderTextColor={colors.textDim} value={username} onChangeText={setUsername} autoCapitalize="none" />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} placeholder="your@email.com" placeholderTextColor={colors.textDim} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Min 6 characters" placeholderTextColor={colors.textDim} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account →</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput style={styles.input} placeholder="6-digit code" placeholderTextColor={colors.textDim} value={code} onChangeText={setCode} keyboardType="number-pad" />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify →</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 28, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { color: colors.accentGlow, fontSize: 15 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 36 },
  form: { gap: 20 },
  inputWrapper: { gap: 6 },
  label: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: colors.text },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14 },
  eyeText: { fontSize: 16 },
  button: { backgroundColor: colors.accent, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
