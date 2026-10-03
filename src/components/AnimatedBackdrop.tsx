import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

export default function AnimatedBackdrop() {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 11000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 11000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    sweep.start();
    return () => sweep.stop();
  }, [progress]);

  const forwardTravel = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-96, 96],
  });
  const reverseTravel = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [80, -80],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.trackTop} />
      <Animated.View
        style={[
          styles.violetLine,
          { transform: [{ translateX: forwardTravel }] },
        ]}
      />
      <Animated.View
        style={[
          styles.cyanLine,
          { transform: [{ translateX: reverseTravel }] },
        ]}
      />
      <View style={styles.trackBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  trackTop: {
    backgroundColor: "rgba(168, 85, 247, 0.06)",
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
    top: "18%",
  },
  violetLine: {
    backgroundColor: "rgba(192, 132, 252, 0.28)",
    height: 1,
    left: "12%",
    position: "absolute",
    top: "18%",
    width: 150,
  },
  cyanLine: {
    backgroundColor: "rgba(34, 211, 238, 0.18)",
    height: 1,
    position: "absolute",
    right: "10%",
    top: "72%",
    width: 120,
  },
  trackBottom: {
    backgroundColor: "rgba(34, 211, 238, 0.05)",
    bottom: "28%",
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
