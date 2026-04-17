import { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../stores/auth';

type FieldError = { field: string; message: string };

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  const validate = (): boolean => {
    const newErrors: FieldError[] = [];

    if (!name.trim()) {
      newErrors.push({ field: 'name', message: 'Name is required' });
    }

    if (!email.trim()) {
      newErrors.push({ field: 'email', message: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.push({ field: 'email', message: 'Enter a valid email address' });
    }

    if (!password) {
      newErrors.push({ field: 'password', message: 'Password is required' });
    } else if (password.length < 6) {
      newErrors.push({ field: 'password', message: 'Must be at least 6 characters' });
    }

    if (!confirmPassword) {
      newErrors.push({ field: 'confirm', message: 'Please confirm your password' });
    } else if (password !== confirmPassword) {
      newErrors.push({ field: 'confirm', message: 'Passwords do not match' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors([]);

    try {
      await signUp(email.trim(), password, name.trim());
      setSuccess(true);
      // Show success state briefly, then redirect to login
      setTimeout(() => {
        setSuccess(false);
        router.replace('/(auth)/login');
      }, 2500);
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong';
      // Categorize Supabase errors
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('User already registered')) {
        setErrors([{ field: 'email', message: 'This email is already registered' }]);
      } else if (msg.includes('Password') || msg.includes('password')) {
        setErrors([{ field: 'password', message: msg }]);
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
        setErrors([{ field: 'form', message: 'Network error — check your connection' }]);
      } else {
        setErrors([{ field: 'form', message: msg }]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" />
        </View>
        <Text style={styles.successTitle}>Account Created</Text>
        <Text style={styles.successSubtitle}>
          You can now sign in with your credentials.
        </Text>
      </View>
    );
  }

  const formError = getError('form');
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoContainer}>
            <View style={styles.logoGradient}>
              <Ionicons name="home" size={20} color="#fff" />
            </View>
            <Text style={styles.brandName}>Smart Parenting</Text>
          </View>

          <Text style={styles.heading}>
            Start your{' '}
            <Text style={styles.headingAccent}>journey</Text>
          </Text>
          <Text style={styles.subtitle}>
            Create an account to track your child's growth.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Form-level error */}
          {formError && (
            <View style={styles.formError}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrapper, getError('name') && styles.inputError]}>
              <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                value={name}
                onChangeText={(t) => { setName(t); setErrors((prev) => prev.filter((e) => e.field !== 'name')); }}
                placeholder="Sarah Johnson"
                autoCapitalize="words"
                style={styles.input}
                underlineColorAndroid="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#94A3B8"
                contentStyle={styles.inputContent}
              />
            </View>
            {getError('name') && <Text style={styles.fieldError}>{getError('name')}</Text>}
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <View style={[styles.inputWrapper, getError('email') && styles.inputError]}>
              <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((prev) => prev.filter((e) => e.field !== 'email')); }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
                underlineColorAndroid="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#94A3B8"
                contentStyle={styles.inputContent}
              />
              {email.length > 0 && !getError('email') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              )}
            </View>
            {getError('email') && <Text style={styles.fieldError}>{getError('email')}</Text>}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, getError('password') && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((prev) => prev.filter((e) => e.field !== 'password')); }}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                style={styles.input}
                underlineColorAndroid="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#94A3B8"
                contentStyle={styles.inputContent}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
            {getError('password') && <Text style={styles.fieldError}>{getError('password')}</Text>}
            {password.length > 0 && !getError('password') && (
              <View style={styles.strengthRow}>
                <View style={[styles.strengthBar, password.length >= 6 && styles.strengthGood]} />
                <View style={[styles.strengthBar, password.length >= 8 && styles.strengthGood]} />
                <View style={[styles.strengthBar, password.length >= 10 && styles.strengthGood]} />
                <Text style={styles.strengthText}>
                  {password.length < 6 ? 'Too short' : password.length < 8 ? 'Fair' : password.length < 10 ? 'Good' : 'Strong'}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrapper, (getError('confirm') || !passwordsMatch) && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setErrors((prev) => prev.filter((e) => e.field !== 'confirm')); }}
                placeholder="••••••••"
                secureTextEntry={!showConfirm}
                autoComplete="new-password"
                style={styles.input}
                underlineColorAndroid="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#94A3B8"
                contentStyle={styles.inputContent}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
            {(getError('confirm') || !passwordsMatch) && (
              <Text style={styles.fieldError}>
                {getError('confirm') || (!passwordsMatch ? 'Passwords do not match' : '')}
              </Text>
            )}
            {confirmPassword.length > 0 && passwordsMatch && (
              <View style={styles.matchRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.matchText}>Passwords match</Text>
              </View>
            )}
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
            style={styles.loginButtonWrapper}
          >
            <View style={[styles.loginButton, loading && styles.loginButtonLoading]}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <View style={styles.spinner} />
                  <Text style={styles.loginButtonText}>Creating account…</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign Up</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
              <Ionicons name="logo-google" size={18} color="#4285F4" />
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
              <Ionicons name="logo-apple" size={18} color="#0F172A" />
              <Text style={styles.socialText}>Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Link */}
        <View style={styles.bottomLink}>
          <Text style={styles.bottomText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.bottomLinkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  logoGradient: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FF7F60',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF7F60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 32,
  },
  headingAccent: {
    color: '#FF7F60',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#FFFDFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  formErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFBF6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
  },
  inputError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 14,
    height: 52,
    color: '#0F172A',
  },
  inputContent: {
    paddingHorizontal: 0,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 4,
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  strengthGood: {
    backgroundColor: '#10B981',
  },
  strengthText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  matchText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  loginButtonWrapper: {
    marginTop: 8,
    borderRadius: 16,
    shadowColor: '#FF7F60',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  loginButton: {
    backgroundColor: '#FF7F60',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonLoading: {
    backgroundColor: '#93C5FD',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderTopColor: 'transparent',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFDFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
  },
  socialText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  bottomLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  bottomText: {
    fontSize: 14,
    color: '#64748B',
  },
  bottomLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7F60',
  },
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFDFF',
    padding: 24,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
