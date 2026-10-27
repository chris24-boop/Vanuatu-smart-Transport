import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '@/components/Input';
import Button from '@/components/Button';
import {
  confirmPasswordResetApi,
  requestPasswordResetApi,
} from '@/api/auth';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'confirm' | 'complete'>('request');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const getErrorMessage = (error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'data' in error.response &&
      typeof error.response.data === 'object' &&
      error.response.data !== null &&
      'message' in error.response.data
    ) {
      const message = error.response.data.message;
      return Array.isArray(message) ? message.join('\n') : String(message);
    }
    return error instanceof Error
      ? error.message
      : 'Unable to complete password recovery. Please try again.';
  };

  const handleRequestCode = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await requestPasswordResetApi({ phone: phone.trim() });
      setStep('confirm');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await confirmPasswordResetApi({
        phone: phone.trim(),
        code: code.trim(),
        newPassword,
      });
      setStep('complete');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 'request'
              ? "Enter your phone number and we'll send you a reset code."
              : step === 'confirm'
                ? 'Enter the code sent to your phone and choose a new password.'
                : 'Your password has been changed successfully.'}
          </Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {step === 'complete' ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              You can now sign in using your new password.
            </Text>
            <Button
              title="Back to Login"
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: 24 }}
            />
          </View>
        ) : step === 'request' ? (
          <View style={styles.form}>
            <Input
              label="Phone Number"
              placeholder="+678 XXXXXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
            />
            <Button
              title="Send Reset Code"
              onPress={() => void handleRequestCode()}
              disabled={!phone.trim()}
              loading={isSubmitting}
            />
            <Button
              title="Back to Login"
              onPress={() => router.back()}
              variant="outline"
              style={{ marginTop: 12 }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.neutralNotice}>
              If an account exists for this number, a reset code has been sent.
            </Text>
            <Input
              label="Six-digit reset code"
              placeholder="000000"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              maxLength={6}
            />
            <Input
              label="New password"
              placeholder="At least 12 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button
              title="Reset Password"
              onPress={() => void handleResetPassword()}
              disabled={code.length !== 6 || newPassword.length < 12}
              loading={isSubmitting}
            />
            <Button
              title="Change Phone Number"
              onPress={() => {
                setStep('request');
                setCode('');
                setNewPassword('');
                setErrorMessage('');
              }}
              variant="outline"
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: { marginBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: '#8E8E93', lineHeight: 22 },
  form: {},
  successBox: { alignItems: 'center', paddingVertical: 24 },
  successText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    marginBottom: 16,
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
  },
  neutralNotice: {
    marginBottom: 16,
    color: '#687871',
    fontSize: 14,
    lineHeight: 20,
  },
});
