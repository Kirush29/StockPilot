import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Button, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ModalScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Profile</Text>
      <View style={styles.separator} />

      {user ? (
        <View style={styles.infoContainer}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>

          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user.role}</Text>

          <Text style={styles.label}>Branch ID</Text>
          <Text style={styles.value}>{user.branchId || 'Headquarters'}</Text>

          <View style={{ marginTop: 32 }}>
            <Button title="Logout" onPress={logout} color="#dc2626" />
          </View>
        </View>
      ) : (
        <Text>Not logged in</Text>
      )}

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
    backgroundColor: '#e2e8f0',
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  }
});
