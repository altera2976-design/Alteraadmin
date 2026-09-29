import axios from 'axios';
import { useEffect, useState } from 'react';

const STATIC_BANNERS = {
  morning: {
    image: '/assets/devotional/khatu-shyam-morning.webp',
    title: 'जय श्री श्याम',
    message: 'जिसके सिर पर हाथ हो श्याम का, उसका जीवन खुशियों से भर जाता है।'
  },
  afternoon: {
    image: '/assets/devotional/khatu-shyam-afternoon.webp',
    title: 'जय श्री श्याम',
    message: 'श्याम नाम का सहारा रखो, हर मुश्किल किनारा बन जाएगी।'
  },
  evening: {
    image: '/assets/devotional/khatu-shyam-evening.webp',
    title: 'जय श्री श्याम',
    message: 'जहाँ श्याम का नाम है, वहाँ हर पल सुख और शांति है।'
  },
  night: {
    image: '/assets/devotional/khatu-shyam-night.webp',
    title: 'जय श्री श्याम',
    message: 'आज की सारी चिंताएँ श्याम को सौंप दो, कल की राह वही आसान करेंगे।'
  },
  lateNight: {
    image: '/assets/devotional/khatu-shyam-late-night.webp',
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

const DevotionalBanner = () => {
  const [banner, setBanner] = useState(getStaticBanner());

  useEffect(() => {
    let isMounted = true;

    const fetchFestival = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await axios.get(`${apiUrl}/festivals/active`);
        if (isMounted) {
          if (response.data?.success && response.data?.data) {
            const festival = response.data.data;
            setBanner({
              isFestival: true,
              image: festival.imageUrl,
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
    <div style={{
      width: '100%',
      height: '180px',
      borderRadius: '16px',
      overflow: 'hidden',
      position: 'relative',
      marginBottom: '24px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
    }}>
      <img
        src={banner.image}
        alt="Banner"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(e) => {
          e.target.src = getStaticBanner().image;
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
        padding: '24px 20px 16px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {banner.title}
        </h2>
        <p style={{ margin: 0, fontSize: '15px', opacity: 0.95, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          {banner.message}
        </p>
      </div>
    </div>
  );
};

export default DevotionalBanner;
