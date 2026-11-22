import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 220;
const INTERVAL = 4000;

const DEITIES = [
  {
    id: "shyam",
    source: require("../../assets/images/devotional/shyam_ji.jpg"),
    title: "जय श्री श्याम",
    subtitle: "🙏 खाटू श्याम जी",
    accent: "#fbbf24",
    scale: 1,
  },
  {
    id: "hanuman",
    source: require("../../assets/images/devotional/hanuman_ji.jpg"),
    title: "श्री बालाजी सरकार",
    subtitle: "🙏 श्री बालाजी सरकार",
    accent: "#f97316",
    scale: 1,
  },
  {
    id: "shiva",
    source: require("../../assets/images/devotional/shiva_ji.jpg"),
    title: "ॐ नमः शिवाय",
    subtitle: "🙏 हर हर महादेव",
    accent: "#38bdf8",
    scale: 0.92,
  },
  {
    id: "krishna",
    source: require("../../assets/images/devotional/radha_krishna.jpg"),
    title: "॥ श्री ॥ राधे कृष्ण",
    subtitle: "🙏 श्री राधा कृष्ण जी",
    accent: "#4ade80",
    scale: 0.92,
  },
];

export default function DevotionalBanner() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const total = DEITIES.length;

  const goTo = (idx: number) => {
    const next = ((idx % total) + total) % total;
    setCurrent(next);
    scrollRef.current?.scrollTo({ x: next * BANNER_WIDTH, animated: true });
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
  };

  useEffect(() => {
    if (paused) {
      progressAnim.stopAnimation();
      return;
    }
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: INTERVAL,
      useNativeDriver: false,
    }).start();

    timerRef.current = setTimeout(() => {
      const next = (current + 1) % total;
      setCurrent(next);
      scrollRef.current?.scrollTo({ x: next * BANNER_WIDTH, animated: true });
    }, INTERVAL);

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [current, paused]);

  const d = DEITIES[current];

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT }}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
        >
          {DEITIES.map((deity) => (
            <View key={deity.id} style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
              <Image
                source={deity.source}
                style={[
                  styles.image,
                  deity.scale < 1 ? { transform: [{ scale: deity.scale }] } : null,
                ]}
                resizeMode="cover"
              />
            </View>
          ))}
        </Animated.ScrollView>

        {/* Minimal pill badge - borderless */}
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{d.subtitle}</Text>
        </View>

        {/* Dot indicators - borderless */}
        <View style={styles.dotsRow} pointerEvents="box-none">
          {DEITIES.map((deity, i) => (
            <TouchableOpacity
              key={deity.id}
              onPress={() => goTo(i)}
              style={[
                styles.dot,
                i === current && { width: 20, borderRadius: 4, backgroundColor: d.accent },
              ]}
            />
          ))}
        </View>

        {/* Prev arrow - borderless */}
        <TouchableOpacity
          style={[styles.arrow, styles.arrowLeft]}
          onPress={() => goTo(current - 1)}
          activeOpacity={0.75}
        >
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>

        {/* Next arrow - borderless */}
        <TouchableOpacity
          style={[styles.arrow, styles.arrowRight]}
          onPress={() => goTo(current + 1)}
          activeOpacity={0.75}
        >
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>

        {/* Progress bar */}
        {!paused && (
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: d.accent,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "center",
    marginBottom: 20,
  },
  container: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  image: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  dotsRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLeft: { left: 10 },
  arrowRight: { right: 10 },
  arrowText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "300",
    lineHeight: 28,
  },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
  },
});
