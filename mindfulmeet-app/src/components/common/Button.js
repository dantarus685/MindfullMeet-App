import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../constants/theme';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  isLoading = false,
  style,
  textStyle,
}) => {
  const { colors, typography, spacing, effects } = useTheme();

  const getStyleForVariant = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.white,
          borderColor: colors.primary,
          borderWidth: 1,
          color: colors.primary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.primary,
          borderWidth: 1,
          color: colors.primary,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          color: colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primary,
          color: colors.white,
        };
    }
  };

  const getStyleForSize = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          fontSize: typography.fontSizes.sm,
        };
      case 'large':
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          fontSize: typography.fontSizes.lg,
        };
      case 'medium':
      default:
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: typography.fontSizes.md,
        };
    }
  };

  const variantStyle = getStyleForVariant();
  const sizeStyle = getStyleForSize();

  const buttonStyles = [
    styles.button,
    { backgroundColor: variantStyle.backgroundColor },
    variantStyle.borderColor && { borderColor: variantStyle.borderColor },
    variantStyle.borderWidth && { borderWidth: variantStyle.borderWidth },
    {
      paddingVertical: sizeStyle.paddingVertical,
      paddingHorizontal: sizeStyle.paddingHorizontal,
      borderRadius: effects.borderRadius.md,
    },
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    { color: variantStyle.color },
    { fontSize: sizeStyle.fontSize },
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;