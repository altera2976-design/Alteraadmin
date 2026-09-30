import { useEffect, useState, useRef } from 'react';

const DEITIES = [
  {
    id: 'shyam',
    image: '/assets/devotional/shyam_ji.jpg',
    title: 'जय श्री श्याम',
    subtitle: '🙏 Khatu Shyam Ji',
    accent: '#60a5fa',
    objectPos: 'center 20%',
    message: 'जिसके सिर पर हाथ हो श्याम का, उसका जीवन खुशियों से भर जाता है।',
  },
  {
    id: 'hanuman',
    image: '/assets/devotional/hanuman_ji.jpg',
    title: 'जय श्री राम 🚩',
    subtitle: '🙏 Sankat Mochan Hanuman Ji',
    accent: '#fb923c',
    objectPos: 'center 10%',
    message: 'संकट मोचन हनुमान आपके सभी कष्टों को दूर करें। जय बजरंगबली!',
  },
  {
    id: 'shiva',
    image: '/assets/devotional/shiva_ji.jpg',
    title: 'हर हर महादेव 🔱',
    subtitle: '🙏 Bholenath Shiva Ji',
    accent: '#a78bfa',
    objectPos: 'center 5%',
    message: 'ॐ नमः शिवाय! भोलेनाथ की कृपा से आपके जीवन में सुख-शांति आए।',
  },
  {
    id: 'krishna',
    image: '/assets/devotional/radha_krishna.png',
    title: 'राधे राधे ❤️',
    subtitle: '🙏 Shri Radha Krishna Ji',
    accent: '#4ade80',
    objectPos: 'center 15%',
    message: 'राधे राधे! श्री कृष्णा की कृपा से आपका जीवन प्रेम और खुशियों से भरा रहे।',
  },
  {
    id: 'durga',
    image: '/assets/devotional/maa_durga.jpg',
    title: 'जय माता दी 🙏',
    subtitle: '🙏 Maa Durga Ji',
    accent: '#f472b6',
    objectPos: 'center 10%',
    message: 'माँ दुर्गा की कृपा से आपके जीवन से सभी कष्ट दूर हों। जय माता दी!',
  },
];

const INTERVAL = 3500;

const CSS = `
  @keyframes slideProgress {
    from { width: 0%; }
    to { width: 100%; }
  }
  .dbanner-wrap { position: relative; width: 100%; height: 280px; border-radius: 18px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 12px 36px rgba(0,0,0,0.22); cursor: pointer; }
  .dbanner-track { display: flex; height: 100%; transition: transform 0.65s cubic-bezier(0.77,0,0.18,1); will-change: transform; }
  .dbanner-slide { flex: 0 0 100%; height: 100%; position: relative; }
  .dbanner-slide img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
  .dbanner-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.08) 100%); }
  .dbanner-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px 28px 18px; color: #fff; }
  .dbanner-title { font-size: 26px; font-weight: 900; margin: 0 0 4px; text-shadow: 0 2px 8px rgba(0,0,0,0.7); letter-spacing: 0.5px; }
  .dbanner-sub { font-size: 13px; font-weight: 600; opacity: 0.75; margin: 0 0 8px; letter-spacing: 0.3px; }
  .dbanner-msg { font-size: 14px; font-weight: 500; opacity: 0.95; margin: 0; line-height: 1.6; text-shadow: 0 1px 4px rgba(0,0,0,0.6); max-width: 680px; }
  .dbanner-progress { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.18); z-index: 10; }
  .dbanner-bar { height: 100%; animation: slideProgress var(--dur) linear forwards; border-radius: 2px; }
  .dbanner-dots { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 10; }
  .dbanner-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.4); border: 1.5px solid rgba(255,255,255,0.6); cursor: pointer; transition: all 0.3s ease; }
  .dbanner-dot.active { width: 22px; border-radius: 4px; background: #fff; border-color: #fff; }
  .dbanner-arrow { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.2); color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; z-index: 10; transition: background 0.25s, transform 0.25s; }
  .dbanner-arrow:hover { background: rgba(0,0,0,0.7); transform: translateY(-50%) scale(1.1); }
  .dbanner-arrow.left { left: 14px; }
  .dbanner-arrow.right { right: 14px; }
  .dbanner-accent-line { width: 48px; height: 3px; border-radius: 2px; margin-top: 10px; opacity: 0.85; }
`;

const DevotionalBanner = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [key, setKey] = useState(0);
  const timerRef = useRef(null);
  const total = DEITIES.length;

  const goTo = (idx) => {
    const next = (idx + total) % total;
    setCurrent(next);
    setKey(k => k + 1);
  };

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % total);
      setKey(k => k + 1);
    }, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [paused, total]);

  const d = DEITIES[current];

  return (
    <>
      <style>{CSS}</style>
      <div
        className='dbanner-wrap'
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Sliding track */}
        <div
          className='dbanner-track'
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {DEITIES.map((deity) => (
            <div key={deity.id} className='dbanner-slide'>
              <img
                src={deity.image}
                alt={deity.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: deity.objectPos || 'center 15%' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              <div className='dbanner-overlay' />
            </div>
          ))}
        </div>

        {/* Content overlay on current slide */}
        <div className='dbanner-content'>
          <div className='dbanner-title'>{d.title}</div>
          <div className='dbanner-sub'>{d.subtitle}</div>
          <div className='dbanner-msg'>{d.message}</div>
          <div className='dbanner-accent-line' style={{ background: d.accent }} />
        </div>

        {/* Dot indicators */}
        <div className='dbanner-dots'>
          {DEITIES.map((deity, i) => (
            <div
              key={deity.id}
              className={`dbanner-dot${i === current ? ' active' : ''}`}
              style={i === current ? { background: d.accent, borderColor: d.accent } : {}}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        {/* Prev / Next arrows */}
        <div className='dbanner-arrow left' onClick={() => goTo(current - 1)}>‹</div>
        <div className='dbanner-arrow right' onClick={() => goTo(current + 1)}>›</div>

        {/* Progress bar */}
        {!paused && (
          <div className='dbanner-progress'>
            <div
              key={key}
              className='dbanner-bar'
              style={{ '--dur': INTERVAL + 'ms', background: d.accent }}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default DevotionalBanner;

