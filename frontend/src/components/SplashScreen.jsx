import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Total duration: 5 seconds for a dramatic, slow-paced cinematic intro
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 2000); // 2 seconds for the slow cinematic exit transition
    }, 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Buttery-smooth cinematic easing curve
  const cinematicEase = [0.16, 1, 0.3, 1];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="cinematic-splash"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.15, // Slow push-in on exit
            filter: "blur(20px)",
            transition: { duration: 2, ease: cinematicEase } 
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: '#000000', // Pitch black film-like background
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Subtle Ambient Lens Flare Glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 3, delay: 1, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '120vw',
              height: '20vh',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
              filter: 'blur(30px)'
            }}
          />

          <div style={{ position: 'relative', width: '100%', height: '100px', display: 'flex', justifyContent: 'center' }}>
            
            {/* The Horizon Line (Expanding Light) */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 2.5, ease: cinematicEase }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '15%',
                right: '15%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
                boxShadow: '0 0 15px rgba(255,255,255,0.6)',
                transformOrigin: 'center',
                zIndex: 10
              }}
            />

            {/* Container for masking text rising from the horizon line */}
            <div style={{
              position: 'absolute',
              bottom: '50%',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              overflow: 'hidden',
              paddingTop: '20px' // Space for text to rise into
            }}>
              <motion.h1
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 2.5, delay: 0.8, ease: cinematicEase }}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '5.5vw',
                  fontWeight: 200, // Thin, elegant, cinematic weight
                  letterSpacing: '0.45em',
                  color: '#FFFFFF',
                  margin: 0,
                  textTransform: 'uppercase',
                  paddingLeft: '0.45em', // Balance the letter spacing visually
                  lineHeight: 1
                }}
              >
                Polaris
              </motion.h1>
            </div>

            {/* Container for subtitle falling below the horizon line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <motion.p
                initial={{ y: '-100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ duration: 2, delay: 1.8, ease: cinematicEase }}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.9rem',
                  fontWeight: 400,
                  letterSpacing: '0.6em',
                  color: 'rgba(255,255,255,0.5)',
                  margin: 0,
                  textTransform: 'uppercase',
                  paddingTop: '20px'
                }}
              >
                Digital Twin Platform
              </motion.p>
            </div>
          </div>
          
        </motion.div>
      )}
    </AnimatePresence>
  );
}
