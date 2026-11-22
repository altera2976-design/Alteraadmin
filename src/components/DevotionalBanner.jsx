import { useEffect, useState, useRef } from 'react';

const DEITIES = [
  {
    id: 'shyam',
    image: '/assets/devotional/shyam_ji.jpg',
    title: 'जय श्री श्याम',
    subtitle: '🙏 खाटू श्याम जी',
    accent: '#fbbf24',
    objectPos: 'center 60%',
    scale: 1, 
  },
  {
    id: 'hanuman',
    image: '/assets/devotional/hanuman_ji.jpg',
    title: 'श्री बालाजी सरकार',
    subtitle: '🙏 श्री बालाजी सरकार • सालासर धाम',
    accent: '#f97316',
    objectPos: 'center 56%',
    scale: 1,
  },
  {
    id: 'shiva',
    image: '/assets/devotional/shiva_ji.jpg',
    title: 'ॐ नमः शिवाय',
    subtitle: '🙏 हर हर महादेव • कैलाश पति',
    accent: '#38bdf8',
    objectPos: 'center 40%',
    scale: 1,
  },
  {
    id: 'krishna',
    image: '/assets/devotional/radha_krishna.jpg',
    title: '॥ श्री ॥ राधे कृष्ण',
    subtitle: '🙏 श्री राधा कृष्ण जी • वृन्दावन धाम',
    accent: '#4ade80',
    objectPos: 'center 42%',
    scale: 1,
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
    height: 520px;
    border-radius: 18px;
    overflow: hidden;
    margin-bottom: 24px;
    box-shadow: 0 12px 35px rgba(0,0,0,0.28);
    cursor: pointer;
    background: #000;
    border: none !important;
    outline: none !important;
  }
  @media (min-width: 1600px) {
    .dbanner-wrap { height: 560px; }
  }
  @media (max-width: 1400px) {
    .dbanner-wrap { height: 480px; }
  }
  @media (max-width: 1024px) {
    .dbanner-wrap { height: 380px; border-radius: 14px; }
  }
  @media (max-width: 640px) {
    .dbanner-wrap { height: 280px; border-radius: 12px; }
  }
  .dbanner-track {
    display: flex;
    height: 100%;
    transition: transform 0.65s cubic-bezier(0.77,0,0.18,1);
    will-change: transform;
    border: none !important;
  }
  .dbanner-slide {
    flex: 0 0 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none !important;
    outline: none !important;
  }
  .dbanner-slide img {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    transition: filter 0.3s ease, transform 0.3s ease;
  }
  .dbanner-wrap:hover .dbanner-slide img {
    filter: brightness(1.02);
  }
  .dbanner-badge {
    position: absolute;
    top: 14px;
    right: 16px;
    z-index: 4;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    letter-spacing: 0.4px;
    pointer-events: none;
    border: none !important;
    outline: none !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .dbanner-progress { 
    position: absolute; 
    bottom: 0; 
    left: 0; 
    right: 0; 
    height: 3px; 
    background: rgba(255,255,255,0.18); 
    z-index: 10; 
    border: none !important;
  }
  .dbanner-bar { 
    height: 100%; 
    animation: slideProgress var(--dur) linear forwards; 
    border-radius: 2px; 
    border: none !important;
  }
  .dbanner-dots { 
    position: absolute; 
    bottom: 12px; 
    left: 50%; 
    transform: translateX(-50%); 
    display: flex; 
    gap: 7px; 
    z-index: 10; 
    border: none !important;
  }
  .dbanner-dot { 
    width: 8px; 
    height: 8px; 
    border-radius: 50%; 
    background: rgba(255,255,255,0.45); 
    border: none !important; 
    outline: none !important;
    cursor: pointer; 
    transition: all 0.3s ease; 
  }
  .dbanner-dot.active { 
    width: 22px; 
    border-radius: 4px; 
    background: #fff; 
    border: none !important; 
  }
  .dbanner-arrow { 
    position: absolute; 
    top: 50%; 
    transform: translateY(-50%); 
    background: rgba(0,0,0,0.38); 
    backdrop-filter: blur(6px); 
    border: none !important; 
    outline: none !important;
    color: #fff; 
    width: 36px; 
    height: 36px; 
    border-radius: 50%; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    cursor: pointer; 
    font-size: 20px; 
    z-index: 10; 
    transition: background 0.25s, transform 0.25s; 
    user-select: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .dbanner-arrow:hover { 
    background: rgba(0,0,0,0.7); 
    transform: translateY(-50%) scale(1.08); 
  }
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
                  objectPosition: deity.objectPos || 'center top',
                  transform: deity.scale ? `scale(${deity.scale})` : 'scale(1)',
                }}
                onError={e => {
                  const target = e.currentTarget;
                  if (!target.dataset.retried) {
                    target.dataset.retried = '1';
                    if (target.src && target.src.includes('/assets/devotional/')) {
                      const filename = target.src.split('/assets/devotional/').pop();
                      target.src = `./assets/devotional/${filename}`;
                      return;
                    }
                  }
                  target.style.display = 'none';
                }}
              />
            </div>
          ))}
        </div>

        {/* Minimal elegant badge in corner - no intrusive dark overlay blocking artwork */}
        <div className='dbanner-badge'>
          {d.subtitle}
        </div>

        {/* Dot indicators - borderless */}
        <div className='dbanner-dots'>
          {DEITIES.map((deity, i) => (
            <div
              key={deity.id}
              className={`dbanner-dot${i === current ? ' active' : ''}`}
              style={i === current ? { background: d.accent } : {}}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        {/* Prev / Next arrows - borderless */}
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
