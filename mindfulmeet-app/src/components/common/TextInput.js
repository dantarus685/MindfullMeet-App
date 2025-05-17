// src/components/common/TextInput.js
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  TextInput as RNTextInput,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useTheme } from '../../constants/theme';

const TextInput = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  icon,
  error,
  touched,
  onBlur,
  style,
  multiline = false,
  numberOfLines = 1,
  label,
  ...otherProps
}) => {
  const { colors, spacing, typography, effects } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const hasError = touched && error;

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.sm,
    },
    label: {
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.medium,
      color: colors.darkGrey,
      marginBottom: spacing.xs,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: hasError 
        ? colors.error 
        : isFocused 
          ? colors.primary 
          : colors.lightGrey,
      borderRadius: effects.borderRadius.md,
      backgroundColor: colors.white,
      paddingHorizontal: spacing.md,
      paddingVertical: multiline ? spacing.sm : 0,
      minHeight: multiline ? 100 : 50,
    },
    icon: {
      marginRight: spacing.sm,
      color: isFocused ? colors.primary : colors.grey,
    },
    input: {
      flex: 1,
      color: colors.black,
      fontFamily: 'System',
      fontSize: typography.fontSizes.md,
      paddingVertical: multiline ? spacing.xs : spacing.sm,
      textAlignVertical: multiline ? 'top' : 'center',
    },
    errorText: {
      color: colors.error,
      fontSize: typography.fontSizes.xs,
      marginTop: spacing.xs,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        {icon && (
          <Ionicons name={icon} size={20} style={styles.icon} />
        )}
        <RNTextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={styles.input}
          placeholderTextColor={colors.grey}
          {...otherProps}
        />
      </View>
      {hasError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

export default TextInput;9