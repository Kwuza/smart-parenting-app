import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../stores/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineLarge" style={styles.title}>Smart Parenting</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>Monitor your child's daily activities</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          style={styles.button}
        >
          Login
        </Button>
        <Button
          mode="text"
          onPress={() => router.push('/(auth)/signup')}
          style={styles.link}
        >
          Don't have an account? Sign Up
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontWeight: 'bold' },
  subtitle: { opacity: 0.6, marginTop: 8 },
  form: { gap: 16 },
  input: { backgroundColor: '#fff' },
  button: { marginTop: 8, paddingVertical: 4 },
  link: { marginTop: 4 },
});
