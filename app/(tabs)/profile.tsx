import { View, StyleSheet } from 'react-native';
import { Text, Button, List, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth, useApp } from '../../stores/auth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { children, selectChild } = useApp();
  const router = useRouter();
  const theme = useTheme();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall">{user?.user_metadata?.name || 'Parent'}</Text>
        <Text variant="bodyMedium" style={{ opacity: 0.6 }}>{user?.email}</Text>
      </View>

      <List.Section>
        <List.Subheader>Children</List.Subheader>
        {children.map((child) => (
          <List.Item
            key={child.id}
            title={child.name}
            description={child.date_of_birth || 'No DOB set'}
            left={(props) => <List.Icon {...props} icon="child" />}
            onPress={() => selectChild(child)}
          />
        ))}
        <List.Item
          title="Add Child"
          left={(props) => <List.Icon {...props} icon="plus" />}
          onPress={() => router.push('/child/new')}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Settings</List.Subheader>
        <List.Item title="Notifications" left={(props) => <List.Icon {...props} icon="bell" />} />
        <List.Item title="Privacy" left={(props) => <List.Icon {...props} icon="shield-lock" />} />
        <List.Item title="Help & Support" left={(props) => <List.Icon {...props} icon="help-circle" />} />
      </List.Section>

      <Button mode="outlined" onPress={handleSignOut} style={styles.signOut} textColor="#EF4444">
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 24, backgroundColor: '#2563EB' },
  signOut: { margin: 16, borderColor: '#EF4444' },
});
