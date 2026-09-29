import axios from 'axios';
import { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { getApiUrl } from '../services/api';

const { width } = Dimensions.get('window');

// Local Static Assets
const STATIC_IMAGES = {
  morning: require('../../assets/devotional/khatu-shyam-morning.webp'),
  afternoon: require('../../assets/devotional/khatu-shyam-afternoon.webp'),
  evening: require('../../assets/devotional/khatu-shyam-evening.webp'),
  night: require('../../assets/devotional/khatu-shyam-night.webp'),
  lateNight: require('../../assets/devotional/khatu-shyam-late-night.webp')
};

const STATIC_BANNERS = {
  morning: {
    source: STATIC_IMAGES.morning,
    title: 'जय श्री श्याम',
    message: 'जिसके सिर पर हाथ हो श्याम का, उसका जीवन खुशियों से भर जाता है।'
  },
  afternoon: {
    source: STATIC_IMAGES.afternoon,
    title: 'जय श्री श्याम',
    message: 'श्याम नाम का सहारा रखो, हर मुश्किल किनारा बन जाएगी।'
  },
  evening: {
    source: STATIC_IMAGES.evening,
    title: 'जय श्री श्याम',
    message: 'जहाँ श्याम का नाम है, वहाँ हर पल सुख और शांति है।'
  },
  night: {
    source: STATIC_IMAGES.night,
    title: 'जय श्री श्याम',
    message: 'आज की सारी चिंताएँ श्याम को सौंप दो, कल की राह वही आसान करेंगे।'
  },
  lateNight: {
    source: STATIC_IMAGES.lateNight,
    title: 'जय श्री श्याम',
    message: 'सोने से पहले बस इतना कहना—हारे के सहारे, मेरे खाटू वाले श्याम।'
  }
};

const getStaticBanner = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return STATIC_BANNERS.morning;
  if (hour >= 12 && hour < 16) return STATIC_BANNERS.afternoon;
  if (hour >= 16 && hour < 20) return STATIC_BANNERS.evening;
  if (hour >= 20 && hour <= 23) return STATIC_BANNERS.night;
  return STATIC_BANNERS.lateNight; // 00:00 - 04:59
};

export default function DevotionalBanner() {
  const [banner, setBanner] = useState(getStaticBanner());

  useEffect(() => {
    let isMounted = true;

    const fetchFestival = async () => {
      try {
        const apiUrl = getApiUrl();
        const response = await axios.get(`${apiUrl}/festivals/active`);
        if (isMounted) {
          if (response.data?.success && response.data?.data) {
            const festival = response.data.data;
            setBanner({
              isFestival: true,
              source: { uri: festival.imageUrl },
              title: festival.hindiTitle,
              message: festival.hindiMessage
            });
          } else {
            setBanner(getStaticBanner());
          }
        }
      } catch (error) {
        if (isMounted) {
          setBanner(getStaticBanner());
        }
      }
    };

    fetchFestival();

    const interval = setInterval(() => {
      if (!banner.isFestival) {
        setBanner(getStaticBanner());
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [banner.isFestival]);

  return (
    <View style={styles.container}>
      <Image
        source={banner.source}
        style={styles.image}
        resizeMode="cover"
        defaultSource={getStaticBanner().source} // fallback
        onError={() => {
          if (banner.isFestival) {
            setBanner(getStaticBanner());
          }
        }}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>{banner.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{banner.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width - 32, // assuming 16px padding on sides
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: '#000',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', // fallback
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  message: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});
