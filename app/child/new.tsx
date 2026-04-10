import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { createChild } from '../../lib/api';
import { useApp } from '../../stores/auth';

export default function NewChildScreen() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const { loadChildren } = useApp();
  const router = useRouter();
  const theme = useTheme();

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    setLoading(true);
    try {
      await createChild(name.trim(), dob);
      await loadChildren();
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>Add Child Profile</Text>

      <View style={styles.form}>
        <TextInput label="Child's Name" value={name} onChangeText={setName} />
        <TextInput label="Date of Birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} placeholder="2020-01-15" />
        <Button mode="contained" onPress={handleCreate} loading={loading} style={styles.button}>
          Create Profile
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 24, marginTop: 16 },
  form: { gap: 16 },
  button: { marginTop: 8 },
});
