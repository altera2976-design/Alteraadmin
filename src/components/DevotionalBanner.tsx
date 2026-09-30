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
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 240;
const INTERVAL = 3500;

const DEITIES = [
  {
    id: "shyam",
    source: require("../../assets/images/devotional/shyam_ji.jpg"),
    title: "जय श्री श्याम",
    subtitle: "🙏 Khatu Shyam Ji",
    accent: "#60a5fa",
    message: "जिसके सिर पर हाथ हो श्याम का, उसका जीवन खुशियों से भर जाता है।",
  },
  {
    id: "hanuman",
    source: require("../../assets/images/devotional/hanuman_ji.jpg"),
    title: "जय श्री राम 🚩",
    subtitle: "🙏 Sankat Mochan Hanuman Ji",
    accent: "#fb923c",
    message: "संकट मोचन हनुमान आपके सभी कष्टों को दूर करें। जय बजरंगबली!",
  },
  {
    id: "shiva",
    source: require("../../assets/images/devotional/shiva_ji.jpg"),
    title: "हर हर महादेव 🔱",
    subtitle: "🙏 Bholenath Shiva Ji",
    accent: "#a78bfa",
    message: "ॐ नमः शिवाय! भोलेनाथ की कृपा से आपके जीवन में सुख-शांति आए।",
  },
  {
    id: "krishna",
    source: require("../../assets/images/devotional/radha_krishna.png"),
    title: "राधे राधे ❤️",
    subtitle: "🙏 Shri Radha Krishna Ji",
    accent: "#4ade80",
    message: "राधे राधे! श्री कृष्णा की कृपा से आपका जीवन प्रेम और खुशियों से भरा रहे।",
  },
  {
    id: "durga",
    source: require("../../assets/images/devotional/maa_durga.jpg"),
    title: "जय माता दी 🙏",
    subtitle: "🙏 Maa Durga Ji",
    accent: "#f472b6",
    message: "माँ दुर्गा की कृपा से आपके जीवन से सभी कष्ट दूर हों। जय माता दी!",
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
    // Reset progress bar
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
  };

  // Auto-slide timer
  useEffect(() => {
    if (paused) {
      progressAnim.stopAnimation();
      return;
    }
    // Animate progress bar
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
      {/* Carousel frame */}
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
            <View key={deity.id} style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT }}>
              <Image
                source={deity.source}
                style={styles.image}
                resizeMode="cover"
              />
              {/* Dark gradient at bottom for text visibility */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
                locations={[0.2, 0.6, 1]}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          ))}
        </Animated.ScrollView>

        {/* Content overlay */}
        <View style={styles.content} pointerEvents="none">
          <Text style={styles.title}>{d.title}</Text>
          <Text style={styles.subtitle}>{d.subtitle}</Text>
          <Text style={styles.message} numberOfLines={2}>{d.message}</Text>
          <View style={[styles.accentLine, { backgroundColor: d.accent }]} />
        </View>

        {/* Dot indicators */}
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

        {/* Prev arrow */}
        <TouchableOpacity
          style={[styles.arrow, styles.arrowLeft]}
          onPress={() => goTo(current - 1)}
          activeOpacity={0.75}
        >
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>

        {/* Next arrow */}
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
    backgroundColor: "#111",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  image: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    position: "absolute",
    top: 0,
    left: 0,
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
    backgroundColor: "transparent",
    // Simulate gradient with layered transparency
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  content: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 32,
    backgroundColor: "rgba(0,0,0,0.0)",
    // Strong bottom overlay
    background: "rgba(0,0,0,0)",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 2,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  message: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  accentLine: {
    height: 2,
    width: 44,
    borderRadius: 2,
    marginTop: 8,
    opacity: 0.9,
  },
  dotsRow: {
    position: "absolute",
    top: 12,
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
    backgroundColor: "rgba(255,255,255,0.4)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
  },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
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
