import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [scrollIndicatorOpacity, setScrollIndicatorOpacity] = useState(1);
  const [problemCardsVisible, setProblemCardsVisible] = useState([false, false, false]);
  const [problemSectionProgress, setProblemSectionProgress] = useState(0);
  const problemSectionRef = useRef(null);
  const problemCardRefs = useRef([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const problemCardsData = [
    {
      number: '01',
      title: 'They track numbers, not outcomes',
      text: 'Endless calorie counting without showing how food actually affects your body\'s energy, mood, and performance.',
      accent: 'linear-gradient(135deg, rgba(248, 113, 113, 0.95) 0%, rgba(251, 191, 36, 0.9) 100%)',
      chip: 'Past-only data',
      stat: 'Energy drift',
      statValue: '-24%',
      bars: [72, 46, 61],
      align: 'left',
    },
    {
      number: '02',
      title: 'They show the past, not the future',
      text: 'Traditional tracking only tells you what you ate yesterday, not what it will do to you tomorrow.',
      accent: 'linear-gradient(135deg, rgba(96, 165, 250, 0.95) 0%, rgba(45, 212, 191, 0.9) 100%)',
      chip: 'No prediction',
      stat: 'Tomorrow signal',
      statValue: '0h',
      bars: [42, 84, 58],
      align: 'center',
    },
    {
      number: '03',
      title: 'They create guilt instead of insight',
      text: 'Red numbers and warnings promote shame and anxiety rather than genuine understanding and growth.',
      accent: 'linear-gradient(135deg, rgba(244, 114, 182, 0.95) 0%, rgba(192, 132, 252, 0.9) 100%)',
      chip: 'Shame loop',
      stat: 'Confidence drop',
      statValue: '-31%',
      bars: [68, 37, 79],
      align: 'right',
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scroll = window.scrollY;
      setScrollY(scroll);
      
      // Calculate hero opacity - fades out after scrolling 200px
      const newHeroOpacity = Math.max(0, 1 - (scroll / 300));
      setHeroOpacity(newHeroOpacity);
      
      // Calculate scroll indicator opacity - fades out faster, after scrolling 100px
      const newScrollIndicatorOpacity = Math.max(0, 1 - (scroll / 100));
      setScrollIndicatorOpacity(newScrollIndicatorOpacity);

      if (problemSectionRef.current) {
        const rect = problemSectionRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const rawProgress = (viewportHeight - rect.top) / (viewportHeight + rect.height * 0.35);
        const normalizedProgress = Math.min(Math.max(rawProgress, 0), 1);
        setProblemSectionProgress(normalizedProgress);
      }

      const nextVisible = problemCardRefs.current.map((card) => {
        if (!card) return false;
        const rect = card.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        return rect.top < viewportHeight * 0.82 && rect.bottom > viewportHeight * 0.2;
      });

      if (nextVisible.length) {
        setProblemCardsVisible((prev) =>
          prev.map((visible, index) => visible || Boolean(nextVisible[index]))
        );
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };

    const handleResize = () => {
    setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate parallax effects
  const heroTranslateY = scrollY * 0.5;
  const problemCardsScale = 0.92 + (problemSectionProgress * 0.08);
  const featuresOpacity = 1 - Math.min((scrollY - 800) * 0.002, 1);

  const styles = {
    // Global styles


    // Hero Section
    hero: {
      position: 'relative',
      height: '100vh',
      minHeight: '800px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: '-20px',
    },
    heroVideo: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: 'translate(-50%, -50%)',
      opacity: videoLoaded ? 0.4 : 0,
      transition: 'opacity 1s ease',
      filter: 'brightness(0.3) contrast(1.2)',
    },
    heroOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(180deg, rgba(10,10,10,0.8) 0%, rgba(10,10,10,0.4) 100%)',
    },
    heroContent: {
      position: 'relative',
      zIndex: 2,
      textAlign: 'center',
      padding: '0 0px',
      maxWidth: '1400px',
      margin: '0',
      transform: `translateY(${heroTranslateY}px)`,
      opacity: heroOpacity,
      transition: 'transform 0.1s ease-out, opacity 0.2s ease-out', 
      pointerEvents: heroOpacity < 0.1 ? 'none' : 'auto',
    },
    logo: {
      position: 'absolute',
      top: isMobile ? '20px' : '40px',
      left: isMobile ? '20px' : '40px',
      fontSize: isMobile ? '28px' : '32px',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #fca90e 0%, #e7d507 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '-1px',
      zIndex: 10,
    },
    headline: {
      fontSize: isMobile ? '36px' : 'clamp(62px, 2vw, 90px)',
      fontWeight: '800',
      lineHeight: 1.1,
      marginBottom: isMobile ? '80px' : '28px',
      background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #38bdf8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      animation: 'fadeIn 1s ease-out',
      letterSpacing: '-2px',
      marginTop: isMobile ? '-150px' : '-80px',
      padding: isMobile ? '0 16px' : '0',
    },
    subtext: {
      fontSize: isMobile ? '14px' : 'clamp(18px, 2vw, 24px)',
      padding: isMobile ? '0 10px' : '0',
      fontWeight: '400',
      color: '#d1d5db',
      maxWidth: '800px',
      margin: '0 auto 48px',
      lineHeight: 1.6,
      animation: 'fadeIn 1s ease-out 0.3s both',
    },
    ctaContainer: {
      display: 'flex',
      gap: isMobile ? '12px' : '20px',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      animation: 'fadeIn 1s ease-out 0.6s both',
      marginTop: '20px',
    },
    primaryButton: {
      padding: isMobile ? '14px 28px' : '20px 58px',
      fontSize: isMobile ? '16px' : '19px',
      width: isMobile ? '50%' : 'auto',
      fontWeight: '500',
      background: 'linear-gradient(135deg, #fca90e 0%, #e7d507 100%)',
      border: 'none',
      borderRadius: '36px',
      color: '#150c0c',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 20px 40px rgba(102, 126, 234, 0.2)',
      position: 'relative',
      overflow: 'hidden',
    },
    secondaryButton: {
      padding: isMobile ? '14px 8px' : '20px 48px',
      width: isMobile ? '50%' : 'auto',
      fontSize: isMobile ? '8px' : '16px',
      fontWeight: '400',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '36px',
      color: 'white',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    floatingElements: {
      position: 'absolute',
      width: '80%',
      height: '100%',
      top: 0,
      left: 0,
      pointerEvents: 'none',
    },
    /* floatingElement removed from here and moved to a standalone function */

    // Problem Section
    problemSection: {
      padding: '120px 20px',
      background: 'linear-gradient(180deg, #0a0a0a 0%, #111827 100%)',
      position: 'relative',
    },
    sectionTitle: {
      fontSize: 'clamp(36px, 4vw, 40px)',
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: '80px',
      background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    problemCards: {
      display: 'grid',
      gridTemplateColumns: isMobile
        ? '1fr'
        : 'repeat(auto-fit, minmax(380px, 1fr))',
      gap: '34px',
      maxWidth: '1480px',
      margin: '0 auto',
      transform: `scale(${problemCardsScale})`,
      transition: 'transform 0.45s ease-out',
    },
    problemCard: {
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(10, 14, 24, 0.98) 100%)',
      backdropFilter: 'blur(22px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '32px',
      padding: isMobile ? '22px' : '34px',
      minHeight: isMobile ? 'auto' : '430px',
      transition: 'transform 0.85s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.45s ease, border-color 0.45s ease, background 0.45s ease',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.32)',
    },
    problemNumber: {
      fontSize: isMobile ? '72px' : '138px',
      fontWeight: '800',
      color: 'rgba(255, 255, 255, 0.08)',
      position: 'absolute',
      top: '-8px',
      right: '18px',
      letterSpacing: '-6px',
      lineHeight: 1,
    },
    problemTitle: {
      fontSize: isMobile ? '20px' : '30px',
      maxWidth: isMobile ? '100%' : '280px',
      fontWeight: '700',
      marginBottom: '14px',
      color: '#ffffff',
      marginTop: '26px',
      position: 'relative',
      zIndex: 2,
    },
    problemText: {
      maxWidth: isMobile ? '100%' : '320px',
      fontSize: isMobile ? '14px' : '16px',
      color: '#cbd5e1',
      lineHeight: 1.75,
      position: 'relative',
      zIndex: 2,
    },
    problemCardGlow: {
      position: 'absolute',
      inset: '-25% auto auto -20%',
      width: '220px',
      height: '220px',
      borderRadius: '50%',
      filter: 'blur(18px)',
      opacity: 0.75,
      pointerEvents: 'none',
    },
    problemCardTopRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
      position: 'relative',
      zIndex: 2,
    },
    problemChip: {
      padding: '10px 16px',
      borderRadius: '999px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      background: 'rgba(255, 255, 255, 0.04)',
      color: '#f8fafc',
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      backdropFilter: 'blur(14px)',
    },
    problemStat: {
      minWidth: '106px',
      padding: '12px 14px',
      borderRadius: '18px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(18px)',
      textAlign: 'left',
      animation: 'metricFloat 4.2s ease-in-out infinite',
      transformOrigin: 'center',
    },
    problemStatLabel: {
      display: 'block',
      fontSize: '11px',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '6px',
    },
    problemStatValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: '-0.03em',
    },
    problemVisual: {
      position: 'relative',
      zIndex: 2,
      marginTop: '34px',
      height: isMobile ? '100px' : '136px',
      borderRadius: '26px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      overflow: 'hidden',
      padding: '20px',
      display: 'flex',
      alignItems: 'flex-end',
      gap: '12px',
    },
    problemVisualOverlay: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.06) 100%)',
      pointerEvents: 'none',
      animation: 'sheenDrift 6.5s ease-in-out infinite',
    },
    problemVisualLine: {
      position: 'absolute',
      left: '-25%',
      top: '18%',
      width: '55%',
      height: '1px',
      background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 45%, rgba(255,255,255,0) 100%)',
      filter: 'blur(0.3px)',
      opacity: 0.8,
      animation: 'scanLine 4.6s linear infinite',
    },
    problemBarColumn: {
      flex: 1,
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      height: '100%',
    },
    problemBar: {
      width: '100%',
      maxWidth: '78px',
      borderRadius: '18px 18px 10px 10px',
      boxShadow: '0 14px 34px rgba(0, 0, 0, 0.22)',
      animation: 'barPulse 3.8s ease-in-out infinite',
      transformOrigin: 'bottom center',
    },
    problemBarCap: {
      position: 'absolute',
      top: '14px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '40px',
      height: '4px',
      borderRadius: '999px',
      background: 'rgba(255, 255, 255, 0.55)',
      filter: 'blur(0.2px)',
      opacity: 0.8,
    },
    problemFooterRow: {
      position: 'relative',
      zIndex: 2,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '14px',
      marginTop: '26px',
    },
    problemFooterLabel: {
      color: '#94a3b8',
      fontSize: '13px',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    },
    problemFooterValue: {
      color: '#f8fafc',
      fontSize: '15px',
      fontWeight: '600',
    },


    // Features Section
    featuresSection: {
      padding: '120px 20px',
      background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      opacity: featuresOpacity,
    },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '30px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    featureCard: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '40px 30px',
      textAlign: 'center',
      transition: 'all 0.3s ease',
    },
    featureIcon: {
      fontSize: '48px',
      marginBottom: '24px',
    },
    featureTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '12px',
      color: '#ffffff',
    },
    featureDesc: {
      fontSize: '14px',
      color: '#94a3b8',
      lineHeight: 1.6,
    },

    // Trust Section
    trustSection: {
      padding: '120px 20px',
      background: 'linear-gradient(180deg, #0f172a 0%, #0a0a0a 100%)',
    },
    trustGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '30px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    trustCard: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '40px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '20px',
    },
    trustIcon: {
      fontSize: '32px',
      flexShrink: 0,
    },

    // Footer
    footer: {
      padding: '60px 20px',
      background: '#0a0a0a',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    },
    footerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: isMobile ? 'center' : 'space-between',
      alignItems: 'center',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '20px' : '40px',
      textAlign: isMobile ? 'center' : 'left',
      flexWrap: 'wrap',
    },
    footerLinks: {
      display: 'flex',
      gap: '24px',
      flexWrap: 'wrap',
    },
    footerLink: {
      color: '#94a3b8',
      fontSize: isMobile ? '10px' : '14px',
      textDecoration: 'none',
      transition: 'color 0.3s ease',
    },
    copyright: {
      color: '#64748b',
      fontSize: '14px',
    },


  };

  const handlePrimaryClick = () => {
    navigate('/login');
  };

  const handleSecondaryClick = () => {
    navigate('/login?guest=true');
  };

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh',
      overflowX: 'hidden'
    }}>
      {/* Hero Section */}
      <section style={styles.hero}>
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={styles.heroVideo}
          onLoadedData={() => setVideoLoaded(true)}
        >
          <source src="/assets/hero-video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Overlay */}
        <div style={styles.heroOverlay} />

        {/* Floating Elements */}
        <div style={styles.floatingElements}>
          <div style={getFloatingElementStyle(20, 10, 200, 0)} />
          <div style={getFloatingElementStyle(70, 80, 150, 2)} />
          <div style={getFloatingElementStyle(30, 85, 100, 4)} />
          <div style={getFloatingElementStyle(80, 20, 180, 1)} />
        </div>

        {/* Logo */}
        <div style={styles.logo}>NutriFit</div>

        {/* Hero Content */}
        <div style={styles.heroContent}>
          <h1 style={styles.headline}>
            Understand what food does to you,<br />before it happens.
          </h1>

          <div style={styles.ctaContainer}>
            <button
              style={styles.primaryButton}
              onClick={handlePrimaryClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 25px 50px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(102, 126, 234, 0.4)';
              }}
            >
              Login
            </button>
            <button
              style={styles.secondaryButton}
              onClick={handleSecondaryClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Try it Out
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div style={{
          position: 'absolute',
          bottom: isMobile ? '150px' : '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#94a3b8',
          fontSize: isMobile ? '8px' : '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          animation: 'pulse 2s infinite',
          zindex: 10,
          opacity: scrollIndicatorOpacity,  // Added opacity
          transition: 'opacity 0.2s ease-out',  // Added smooth transition
          pointerEvents: scrollIndicatorOpacity < 0.1 ? 'none' : 'auto', 
        }}>
          <span>Scroll more</span>
          <div style={{
            width: isMobile ? '16px' : '24px',
            height: isMobile ? '24px' : '40px',
            border: '2px solid #94a3b8',
            borderRadius: '12px',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: '1px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: isMobile ? '4px' : '8px',
              height: isMobile ? '12px' : '20px',
              background: '#94a3b8',
              borderRadius: isMobile ? '1px' : '2px',
              animation: 'scrollDown 1s infinite',
            }} />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section ref={problemSectionRef} style={styles.problemSection}>
        <h2 style={styles.sectionTitle}>Why Most Nutrition Apps Fail</h2>
        <div style={styles.problemCards}>
          {problemCardsData.map((problem, index) => {
            const revealTransform = !problemCardsVisible[index]
              ? problem.align === 'left'
                ? 'translate3d(-140px, 0, 0) rotate(-7deg) scale(0.94)'
                : problem.align === 'right'
                  ? 'translate3d(140px, 0, 0) rotate(7deg) scale(0.94)'
                  : 'translate3d(0, 120px, 0) scale(0.9)'
              : 'translate3d(0, 0, 0) rotate(0deg) scale(1)';

            return (
            <div
              key={index}
              ref={(element) => {
                problemCardRefs.current[index] = element;
              }}
              style={{
                ...styles.problemCard,
                opacity: problemCardsVisible[index] ? 1 : 0,
                transform: revealTransform,
                transitionDelay: `${index * 120}ms`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translate3d(0, -14px, 0) scale(1.02)';
                e.currentTarget.style.background = 'linear-gradient(180deg, rgba(21, 31, 53, 0.98) 0%, rgba(11, 16, 28, 1) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.boxShadow = '0 32px 90px rgba(0, 0, 0, 0.42)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate3d(0, 0, 0) scale(1)';
                e.currentTarget.style.background = 'linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(10, 14, 24, 0.98) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.boxShadow = '0 24px 60px rgba(0, 0, 0, 0.32)';
              }}
            >
              <div
                style={{
                  ...styles.problemCardGlow,
                  background: problem.accent,
                  animation: `auroraDrift 7s ease-in-out ${index * 0.8}s infinite`,
                }}
              />
              <div style={styles.problemNumber}>{problem.number}</div>
              <div style={styles.problemCardTopRow}>
                
              </div>
              <h3 style={styles.problemTitle}>{problem.title}</h3>
              <p style={styles.problemText}>{problem.text}</p>
              <div style={styles.problemVisual}>
                <div style={styles.problemVisualOverlay} />
                <div style={{ ...styles.problemVisualLine, animationDelay: `${index * 0.9}s` }} />
                {problem.bars.map((barHeight, barIndex) => (
                  <div key={barIndex} style={styles.problemBarColumn}>
                    <div
                      style={{
                        ...styles.problemBar,
                        height: `${barHeight}%`,
                        background: problem.accent,
                        animationDelay: `${(index * 0.4) + (barIndex * 0.25)}s`,
                      }}
                    >
                      <div style={styles.problemBarCap} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.problemFooterRow}>
                <span style={styles.problemFooterLabel}>What users feel</span>
                <span style={styles.problemFooterValue}>
                  {index === 0 && 'More logging, less clarity'}
                  {index === 1 && 'No idea what comes next'}
                  {index === 2 && 'Stress instead of progress'}
                </span>
              </div>
            </div>
          )})}
        </div>
      </section>


      {/* Final CTA */}
      <section style={{
        padding: '120px 20px',
        background: 'linear-gradient(135deg, #fca90e 0%, #e7d507 70%)',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: isMobile ? '28px' : 'clamp(36px, 4vw, 60px)',
          padding: isMobile ? '0 16px' : '0',
          fontWeight: '800',
          marginBottom: '24px',
          color: '#ffffff',
        }}>
          Ready to experience food differently?
        </h2>
        <p style={{
          fontSize: isMobile ? '14px' : '20px',
          padding: isMobile ? '0 12px' : '0',
          color: 'rgba(255, 255, 255, 0.9)',
          maxWidth: '600px',
          margin: '0 auto 48px',
          lineHeight: 1.6,
        }}>
          Join thousands who've transformed their relationship with food.
        </p>
        <button
          style={{
            ...styles.primaryButton,
            background: '#ffffff',
            color: '#04050c',
            fontSize: '13px',
            padding: isMobile ? '16px 28px' : '24px 60px',
            width: isMobile ? '50%' : 'auto',
          }}
          onClick={handlePrimaryClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)';
          }}
        >
          Start Now
        </button>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              fontSize: '35px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #fca90e 0%, #e7d507 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginTop: '-20px'
            }}>
              NutriFit
            </div>

          </div>
          <div style={styles.footerLinks}>
            <a href="#" style={styles.footerLink}>Privacy</a>
            <a href="#" style={styles.footerLink}>About</a>
            <a href="#" style={styles.footerLink}>Contact</a>
            <a href="#" style={styles.footerLink}>Research</a>
          </div>

        </div>
      </footer>

      {/* Add CSS animations */}
      <style>{`
        @keyframes scrollDown {
          0% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(12px);
            opacity: 0;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

        @keyframes pulseRing {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.3;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
}

        @keyframes auroraDrift {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(22px, 18px, 0) scale(1.12);
          }
        }

        @keyframes sheenDrift {
          0%, 100% {
            transform: translateX(-6%) translateY(0);
            opacity: 0.55;
          }
          50% {
            transform: translateX(8%) translateY(-3%);
            opacity: 0.9;
          }
        }

        @keyframes scanLine {
          0% {
            transform: translateX(0);
            opacity: 0;
          }
          15% {
            opacity: 0.9;
          }
          100% {
            transform: translateX(240%);
            opacity: 0;
          }
        }

        @keyframes barPulse {
          0%, 100% {
            transform: scaleY(1);
            filter: saturate(1);
          }
          50% {
            transform: scaleY(1.08);
            filter: saturate(1.18);
          }
        }

        @keyframes metricFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
};

const getFloatingElementStyle = (top, left, size, delay) => ({
  position: 'absolute',
  top: `${top}%`,
  left: `${left}%`,
  width: `${size}px`,
  height: `${size}px`,
  background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(168, 85, 247, 0) 70%)',
  borderRadius: '50%',
  animation: `float 6s ease-in-out infinite`,
  animationDelay: `${delay}s`,
  filter: 'blur(20px)',
});

export default LandingPage;
