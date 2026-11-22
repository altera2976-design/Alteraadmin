import { useEffect, useState, useRef } from 'react';

const DEITIES = [
  {
    id: 'shyam',
    image: '/assets/devotional/shyam_ji.jpg',
    title: 'जय श्री श्याम',
    subtitle: '🙏 Khatu Shyam Ji',
    accent: '#fbbf24',
    objectPos: 'center 15%',
    message: 'जिसके सिर पर हाथ हो श्याम का, उसका जीवन खुशियों से भर जाता है।',
  },
  {
    id: 'hanuman',
    image: '/assets/devotional/hanuman_ji.jpg',
    title: 'श्री बालाजी सरकार 🚩',
    subtitle: '🙏 Shri Balaji Sarkar • Salasar & Mehndipur Dham',
    accent: '#f97316',
    objectPos: 'center 16%',
    message: 'संकट मोचन श्री बालाजी महाराज आपके सभी संकट और कष्ट दूर करें। जय श्री राम!',
  },
  {
    id: 'shiva',
    image: '/assets/devotional/shiva_ji.jpg',
    title: 'ॐ नमः शिवाय 🔱',
    subtitle: '🙏 Har Har Mahadev • Kailash Pati',
    accent: '#38bdf8',
    objectPos: 'center top',
    message: 'भोलेनाथ और माता पार्वती की असीम कृपा से आपके जीवन में सुख, शांति और समृद्धि आए।',
  },
  {
    id: 'krishna',
    image: '/assets/devotional/radha_krishna.png',
    title: '॥ श्री ॥ राधे कृष्ण 🦚',
    subtitle: '🙏 Shri Radha Krishna Ji • Vrindavan Dham',
    accent: '#4ade80',
    objectPos: 'center top',
    message: 'राधे कृष्ण के पावन प्रेम और आशीर्वाद से आपका घर-आँगन सदैव आनंदित और खुशहाल रहे।',
  },
  {
    id: 'durga',
    image: '/assets/devotional/maa_durga.jpg',
    title: 'जय माता दी 🚩',
    subtitle: '🙏 Maa Durga Ji • Navdurga',
    accent: '#f43f5e',
    objectPos: 'center 10%',
    message: 'माँ भगवती की कृपा से आपके जीवन से सभी कष्ट दूर हों और यश-वैभव प्राप्त हो।',
  },
];

const INTERVAL = 4000;

const CSS = `
  @keyframes slideProgress {
    from { width: 0%; }
    to { width: 100%; }
  }
  .dbanner-wrap {
    position: relative;
    width: 100%;
    height: 310px;
    border-radius: 18px;
    overflow: hidden;
    margin-bottom: 24px;
    box-shadow: 0 16px 40px rgba(0,0,0,0.28);
    cursor: pointer;
    background: #000;
  }
  @media (max-width: 1024px) {
    .dbanner-wrap { height: 260px; border-radius: 16px; }
  }
  @media (max-width: 640px) {
    .dbanner-wrap { height: 220px; border-radius: 12px; }
  }
  .dbanner-track {
    display: flex;
    height: 100%;
    transition: transform 0.65s cubic-bezier(0.77,0,0.18,1);
    will-change: transform;
  }
  .dbanner-slide {
    flex: 0 0 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background: #000;
  }
  .dbanner-slide img {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    display: block;
    border: none;
    outline: none;
    box-shadow: none;
    transition: filter 0.3s ease;
  }
  .dbanner-wrap:hover .dbanner-slide img {
    filter: brightness(1.03);
  }
  .dbanner-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.22) 35%, transparent 70%);
    pointer-events: none;
  }
  .dbanner-content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 3;
    padding: 16px 28px 16px;
    color: #fff;
    pointer-events: none;
  }
  .dbanner-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }
  .dbanner-title {
    font-size: 24px;
    font-weight: 900;
    margin: 0;
    text-shadow: 0 2px 10px rgba(0,0,0,0.85);
    letter-spacing: 0.5px;
  }
  .dbanner-sub-pill {
    display: inline-flex;
    align-items: center;
    padding: 3px 12px;
    border-radius: 20px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.4px;
  }
  .dbanner-msg {
    font-size: 13.5px;
    font-weight: 500;
    opacity: 0.95;
    margin: 0;
    line-height: 1.5;
    text-shadow: 0 1px 6px rgba(0,0,0,0.9);
    max-width: 720px;
  }
  .dbanner-accent-line {
    width: 42px;
    height: 3px;
    border-radius: 2px;
    margin-top: 8px;
    opacity: 0.9;
  }
  .dbanner-progress { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.18); z-index: 10; }
  .dbanner-bar { height: 100%; animation: slideProgress var(--dur) linear forwards; border-radius: 2px; }
  .dbanner-dots { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 10; }
  .dbanner-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.4); border: 1.5px solid rgba(255,255,255,0.6); cursor: pointer; transition: all 0.3s ease; }
  .dbanner-dot.active { width: 22px; border-radius: 4px; background: #fff; border-color: #fff; }
  .dbanner-arrow { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.2); color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; z-index: 10; transition: background 0.25s, transform 0.25s; }
  .dbanner-arrow:hover { background: rgba(0,0,0,0.7); transform: translateY(-50%) scale(1.1); }
  .dbanner-arrow.left { left: 14px; }
  .dbanner-arrow.right { right: 14px; }
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
                style={{
                  objectPosition: deity.objectPos || 'center center',
                }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              <div className='dbanner-overlay' />
            </div>
          ))}
        </div>

        {/* Content overlay on current slide */}
        <div className='dbanner-content'>
          <div className='dbanner-title-row'>
            <span className='dbanner-title'>{d.title}</span>
            <span className='dbanner-sub-pill'>{d.subtitle}</span>
          </div>
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

