import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoverStates, setHoverStates] = useState({
    google: false,
    guest: false,
    submit: false,
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Check if it's a guest login from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('guest') === 'true') {
      handleGuestLogin();
    }
  }, [location]);

  // Animation styles
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #111827 100%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    },
    backgroundAnimation: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
      pointerEvents: 'none',
    },
    floatingOrb: (top, left, size, color, delay) => ({
      position: 'absolute',
      top: `${top}%`,
      left: `${left}%`,
      width: `${size}px`,
      height: `${size}px`,
      background: `radial-gradient(circle, ${color} 0%, ${color}00 70%)`,
      borderRadius: '50%',
      animation: `float 8s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      filter: 'blur(40px)',
      opacity: 0.4,
    }),
    card: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '32px',
      padding: '60px',
      width: '100%',
      maxWidth: '500px',
      position: 'relative',
      zIndex: 2,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      transition: 'transform 0.4s ease, box-shadow 0.4s ease',
    },
    cardInner: {
      animation: 'fadeInUp 0.8s ease-out',
    },
    logoContainer: {
      textAlign: 'center',
      marginBottom: '40px',
    },
    logoIcon: {
      fontSize: '64px',
      marginBottom: '20px',
      animation: 'pulse 3s ease-in-out infinite',
    },
    logoText: {
      fontSize: '40px',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #38bdf8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '-1px',
      marginBottom: '8px',
    },
    tagline: {
      fontSize: '16px',
      color: 'rgba(255, 255, 255, 0.6)',
      fontWeight: '400',
      letterSpacing: '0.5px',
    },
    formTitle: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#ffffff',
      textAlign: 'center',
      marginBottom: '40px',
      position: 'relative',
    },
    formTitleLine: {
      width: '60px',
      height: '3px',
      background: 'linear-gradient(90deg, #667eea, #764ba2)',
      margin: '16px auto',
      borderRadius: '2px',
    },
    errorMessage: {
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#fca5a5',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      marginBottom: '24px',
      textAlign: 'center',
      animation: 'shake 0.5s ease',
    },
    buttonGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      marginBottom: '40px',
    },
    googleButton: {
      padding: '18px',
      fontSize: '16px',
      fontWeight: '600',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '36px',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      position: 'relative',
      overflow: 'hidden',
    },
    guestButton: {
      padding: '18px',
      fontSize: '16px',
      fontWeight: '600',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '36px',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    },
    submitButton: {
      padding: '20px',
      fontSize: '16px',
      fontWeight: '600',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      borderRadius: '36px',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      width: '100%',
      marginTop: '8px',
      position: 'relative',
      overflow: 'hidden',
    },
    buttonHoverEffect: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '0',
      height: '0',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.1)',
      transition: 'width 0.6s, height 0.6s',
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '32px',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    },
    dividerText: {
      padding: '0 16px',
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '14px',
      fontWeight: '500',
    },
    formGroup: {
      marginBottom: '24px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: '8px',
      letterSpacing: '0.5px',
    },
    input: {
      width: '100%',
      padding: '18px 20px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '18px',
      fontSize: '16px',
      color: '#ffffff',
      transition: 'all 0.3s ease',
    },
    inputFocus: {
      background: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(102, 126, 234, 0.5)',
      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
      outline: 'none',
    },
    toggleContainer: {
      textAlign: 'center',
      marginTop: '32px',
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '15px',
    },
    toggleLink: {
      color: '#a78bfa',
      fontWeight: '600',
      cursor: 'pointer',
      marginLeft: '8px',
      transition: 'all 0.3s ease',
      position: 'relative',
      padding: '4px 0',
    },
    toggleLinkUnderline: {
      position: 'absolute',
      bottom: '0',
      left: '0',
      width: '0',
      height: '2px',
      background: 'linear-gradient(90deg, #667eea, #764ba2)',
      transition: 'width 0.3s ease',
    },
    footerText: {
      marginTop: '32px',
      textAlign: 'center',
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.4)',
      lineHeight: '1.6',
    },
    loadingSpinner: {
      width: '20px',
      height: '20px',
      border: '3px solid rgba(255, 255, 255, 0.3)',
      borderTopColor: '#ffffff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName,
        email: user.email,
        createdAt: new Date().toISOString(),
        avatar: user.photoURL,
      }, { merge: true });
      
      navigate('/onboarding/start');
    } catch (error) {
      setError(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          lastLogin: new Date().toISOString(),
        }, { merge: true });
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        await setDoc(doc(db, 'users', user.uid), {
          name: '',
          email: user.email,
          createdAt: new Date().toISOString(),
        });
      }
      
      navigate('/onboarding/start');
    } catch (error) {
      setError(error.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    // Create a guest session with limited access
    const guestUserId = `guest_${Date.now()}`;
    localStorage.setItem('guest_session', guestUserId);
    navigate('/onboarding/start?guest=true');
  };

  const handleMouseEnter = (button) => {
    setHoverStates(prev => ({ ...prev, [button]: true }));
  };

  const handleMouseLeave = (button) => {
    setHoverStates(prev => ({ ...prev, [button]: false }));
  };

  const handleInputFocus = (e) => {
    e.target.style = { ...styles.input, ...styles.inputFocus };
  };

  const handleInputBlur = (e) => {
    e.target.style = styles.input;
  };

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.backgroundAnimation}>
        <div style={styles.floatingOrb(20, 10, 300, '#667eea', 0)} />
        <div style={styles.floatingOrb(70, 85, 250, '#764ba2', 2)} />
        <div style={styles.floatingOrb(30, 90, 200, '#a78bfa', 4)} />
        <div style={styles.floatingOrb(80, 15, 280, '#38bdf8', 1)} />
      </div>

      <div 
        style={styles.card}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = '0 35px 60px -15px rgba(0, 0, 0, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
        }}
      >
        <div style={styles.cardInner}>
          {/* Logo */}
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>🌱</div>
            <div style={styles.logoText}>NutriFit</div>
            <div style={styles.tagline}>
              Predictive Nutrition Intelligence
            </div>
          </div>

          {/* Form Title */}
          <h2 style={styles.formTitle}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
            <div style={styles.formTitleLine} />
          </h2>

          {/* Error Message */}
          {error && <div style={styles.errorMessage}>{error}</div>}

          {/* Social Auth Buttons */}
          <div style={styles.buttonGroup}>
            <button
              style={{
                ...styles.googleButton,
                transform: hoverStates.google ? 'translateY(-2px)' : 'translateY(0)',
                background: hoverStates.google 
                  ? 'rgba(255, 255, 255, 0.12)' 
                  : 'rgba(255, 255, 255, 0.08)',
                borderColor: hoverStates.google 
                  ? 'rgba(255, 255, 255, 0.25)' 
                  : 'rgba(255, 255, 255, 0.15)',
              }}
              onClick={handleGoogleSignIn}
              disabled={loading}
              onMouseEnter={() => handleMouseEnter('google')}
              onMouseLeave={() => handleMouseLeave('google')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              style={{
                ...styles.guestButton,
                transform: hoverStates.guest ? 'translateY(-2px)' : 'translateY(0)',
                background: hoverStates.guest 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : 'rgba(255, 255, 255, 0.05)',
                borderColor: hoverStates.guest 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : 'rgba(255, 255, 255, 0.1)',
              }}
              onClick={handleGuestLogin}
              disabled={loading}
              onMouseEnter={() => handleMouseEnter('guest')}
              onMouseLeave={() => handleMouseLeave('guest')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              Try as Guest
            </button>
          </div>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>Or continue with email</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="you@example.com"
                style={styles.input}
                required
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="••••••••"
                style={styles.input}
                required
                disabled={loading}
                minLength="6"
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                transform: hoverStates.submit ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
                boxShadow: hoverStates.submit 
                  ? '0 20px 40px rgba(102, 126, 234, 0.4)' 
                  : '0 10px 30px rgba(102, 126, 234, 0.3)',
              }}
              disabled={loading}
              onMouseEnter={() => handleMouseEnter('submit')}
              onMouseLeave={() => handleMouseLeave('submit')}
            >
              {loading ? (
                <div style={styles.loadingSpinner} />
              ) : (
                <>
                  {isLogin ? 'Sign In to Account' : 'Create Account'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login/Signup */}
          <div style={styles.toggleContainer}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <span 
              style={styles.toggleLink}
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              onMouseEnter={(e) => {
                e.currentTarget.querySelector('div').style.width = '100%';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.querySelector('div').style.width = '0';
              }}
            >
              {isLogin ? ' Create one' : ' Sign in'}
              <div style={styles.toggleLinkUnderline} />
            </span>
          </div>

          {/* Footer Text */}
          <div style={styles.footerText}>
            <p>
              By continuing, you agree to our Terms of Service and Privacy Policy.<br />
              Your data is protected with enterprise-grade security.
            </p>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(-20px) translateX(10px);
          }
          66% {
            transform: translateY(10px) translateX(-10px);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-5px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(5px);
          }
        }
        
        /* Input focus animation */
        input:focus {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(102, 126, 234, 0.5) !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
          outline: none;
        }
        
        /* Disabled state styling */
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }
        
        /* Button ripple effect */
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;