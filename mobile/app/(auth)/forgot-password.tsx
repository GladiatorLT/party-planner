import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { auth } from '../../src/services/auth';
import { colors } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!username) return;
    setLoading(true);
    try {
      await auth.forgotPassword(username.trim());
      setStep('reset');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!code || !newPassword) return;
    setLoading(true);
    try {
      await auth.confirmForgotPassword(username.trim(), code.trim(), newPassword);
      Alert.alert('Success', 'Password reset! Please sign in.');
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{step === 'request' ? 'Reset Password' : 'Enter New Password'}</Text>
      <Text style={styles.subtitle}>
        {step === 'request' ? 'Enter your username and we\'ll send a reset code.' : `Enter the code sent to your email and choose a new password.`}
      </Text>

      <View style={styles.form}>
        {step === 'request' ? (
          <>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Username</Text>
              <TextInput style={styles.input} placeholder="Your username" placeholderTextColor={colors.textDim} value={username} onChangeText={setUsername} autoCapitalize="none" />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleRequest} disabled={loading || !username}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Code →</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Reset Code</Text>
              <TextInput style={styles.input} placeholder="6-digit code" placeholderTextColor={colors.textDim} value={code} onChangeText={setCode} keyboardType="number-pad" />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordRow}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Min 6 characters" placeholderTextColor={colors.textDim} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPassword} />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading || !code || !newPassword}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password →</Text>}
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
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 36, lineHeight: 20 },
  form: { gap: 20 },
  inputWrapper: { gap: 6 },
  label: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: colors.text },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14 },
  eyeText: { fontSize: 16 },
  button: { backgroundColor: colors.accent, borderRadius: 10, padding: 16, alignItems: 'center', shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
