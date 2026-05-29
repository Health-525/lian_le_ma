/**
 * iOS 风格底部弹出面板。
 *
 * 特性：BlurView 背景、弹簧弹出/收回、拖拽手柄、点击遮罩关闭。
 */
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import { colors, font, radius, spacing } from "./theme";
import { springBouncy, duration } from "./animation";

interface Props {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export default function Sheet({ visible, title, children, onClose }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(300);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: duration.fast });
      translateY.value = withSpring(0, springBouncy);
    } else {
      opacity.value = withTiming(0, { duration: duration.fast });
      translateY.value = withSpring(300, springBouncy);
    }
  }, [visible, opacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle]} pointerEvents="box-none">
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {children}
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: spacing(5),
  },
  blur: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: "hidden",
    padding: spacing(5),
    paddingBottom: spacing(8),
  },
  handle: {
    alignItems: "center",
    marginBottom: spacing(4),
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.border,
  },
  title: {
    fontSize: font.h1,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(5),
  },
});
