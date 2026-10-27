import { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.focused,
          error && styles.errorInput,
          style,
        ]}
        placeholderTextColor="#8E8E93"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#F2F2F7',
  },
  focused: {
    borderColor: '#0A84FF',
    backgroundColor: '#FFFFFF',
  },
  errorInput: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});
