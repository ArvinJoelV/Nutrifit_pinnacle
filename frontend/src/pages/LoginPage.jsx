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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('guest') === 'true') {
      handleGuestLogin();
    }
  }, [location]);

  const styles = {
    container: {
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflowX: 'hidden',
      overflowY: 'auto',
      background: 'radial-gradient(circle at top left, rgba(252, 169, 14, 0.12) 0%, rgba(252, 169, 14, 0) 32%), linear-gradient(135deg, #050505 0%, #101723 52%, #0a0a0a 100%)',
      padding: '32px',
      position: 'relative',
    },
    backgroundAnimation: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
    },
    shell: {
      width: '100%',
      maxWidth: '1180px',
      minHeight: 'min(720px, calc(100dvh - 64px))',
      position: 'relative',
      zIndex: 2,
      display: 'grid',
      gridTemplateColumns: 'minmax(280px, 1fr) minmax(420px, 560px)',
      background: 'rgba(255, 255, 255, 0.04)',
      backdropFilter: 'blur(22px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '34px',
      overflow: 'hidden',
      boxShadow: '0 30px 90px rgba(0, 0, 0, 0.42)',
    },
    leftColumn: {
      position: 'relative',
      padding: '48px 42px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    },
    leftGlow: {
      position: 'absolute',
      width: '380px',
      height: '380px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(252, 169, 14, 0.22) 0%, rgba(252, 169, 14, 0) 68%)',
      filter: 'blur(10px)',
      animation: 'float 10s ease-in-out infinite',
      pointerEvents: 'none',
    },
    brandWrap: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
    },
    logoText: {
      fontSize: 'clamp(54px, 7vw, 112px)',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #fca90e 0%, #e7d507 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '-0.06em',
      lineHeight: 0.95,
    },
    rightColumn: {
      padding: '42px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.86) 0%, rgba(7, 10, 16, 0.96) 100%)',
    },
    cardInner: {
      width: '100%',
      maxWidth: '420px',
      animation: 'fadeInUp 0.8s ease-out',
    },
    errorMessage: {
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#fca5a5',
      padding: '14px 16px',
      borderRadius: '16px',
      fontSize: '13px',
      marginBottom: '18px',
      animation: 'shake 0.5s ease',
    },
    buttonGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '22px',
    },
    googleButton: {
      padding: '16px 18px',
      fontSize: '15px',
      fontWeight: '600',
      background: 'rgba(255, 255, 255, 0.06)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '18px',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    },
    guestButton: {
      padding: '16px 18px',
      fontSize: '15px',
      fontWeight: '600',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '18px',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    },
    submitButton: {
      padding: '17px 18px',
      fontSize: '15px',
      fontWeight: '600',
      background: 'linear-gradient(135deg, #fca90e 0%, #e7d507 100%)',
      border: 'none',
      borderRadius: '18px',
      color: '#17110b',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      width: '100%',
      marginTop: '4px',
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '18px',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent)',
    },
    dividerText: {
      padding: '0 14px',
      color: 'rgba(255, 255, 255, 0.42)',
      fontSize: '12px',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
    formGroup: {
      marginBottom: '14px',
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.64)',
      marginBottom: '8px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    input: {
      width: '100%',
      padding: '15px 18px',
      background: 'rgba(255, 255, 255, 0.045)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      fontSize: '14px',
      color: '#ffffff',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
    },
    toggleContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      marginTop: '18px',
      color: 'rgba(255, 255, 255, 0.55)',
      fontSize: '14px',
      flexWrap: 'wrap',
    },
    toggleLink: {
      color: '#f8fafc',
      fontWeight: '600',
      cursor: 'pointer',
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
      background: 'linear-gradient(90deg, #fca90e, #e7d507)',
      transition: 'width 0.3s ease',
    },
    footerText: {
      marginTop: '18px',
      textAlign: 'left',
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.34)',
      lineHeight: '1.5',
    },
    loadingSpinner: {
      width: '20px',
      height: '20px',
      border: '3px solid rgba(23, 17, 11, 0.25)',
      borderTopColor: '#17110b',
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
    } catch (authError) {
      setError(authError.message || 'Failed to sign in with Google');
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
    } catch (authError) {
      setError(authError.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUserId = `guest_${Date.now()}`;
    localStorage.setItem('guest_session', guestUserId);
    navigate('/onboarding/start?guest=true');
  };

  const handleMouseEnter = (button) => {
    setHoverStates((prev) => ({ ...prev, [button]: true }));
  };

  const handleMouseLeave = (button) => {
    setHoverStates((prev) => ({ ...prev, [button]: false }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundAnimation}>
        <div style={getFloatingOrbStyle(18, 12, 320, '#fca90e', 0)} />
        <div style={getFloatingOrbStyle(72, 83, 260, '#e7d507', 2)} />
        <div style={getFloatingOrbStyle(28, 88, 220, '#ffffff', 4)} />
        <div style={getFloatingOrbStyle(82, 18, 300, '#f59e0b', 1)} />
      </div>

      <div style={styles.shell} className="login-shell">
        <div style={styles.leftColumn}>
          <div style={styles.leftGlow} />
          <div style={styles.brandWrap}>
            <div style={styles.logoText}>NutriFit</div>
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.cardInner}>
            {error && <div style={styles.errorMessage}>{error}</div>}

            <div style={styles.buttonGroup}>
              <button
                style={{
                  ...styles.googleButton,
                  transform: hoverStates.google ? 'translateY(-2px)' : 'translateY(0)',
                  background: hoverStates.google ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.06)',
                  borderColor: hoverStates.google ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
                }}
                onClick={handleGoogleSignIn}
                disabled={loading}
                onMouseEnter={() => handleMouseEnter('google')}
                onMouseLeave={() => handleMouseLeave('google')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <button
                style={{
                  ...styles.guestButton,
                  transform: hoverStates.guest ? 'translateY(-2px)' : 'translateY(0)',
                  background: hoverStates.guest ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: hoverStates.guest ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.1)',
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
                Try it out
              </button>
            </div>

            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <div style={styles.dividerText}>or</div>
              <div style={styles.dividerLine} />
            </div>

            <form onSubmit={handleEmailAuth}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  placeholder="........"
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
                  transform: hoverStates.submit ? 'translateY(-2px) scale(1.01)' : 'translateY(0) scale(1)',
                  boxShadow: hoverStates.submit ? '0 20px 40px rgba(252, 169, 14, 0.28)' : '0 12px 28px rgba(252, 169, 14, 0.2)',
                }}
                disabled={loading}
                onMouseEnter={() => handleMouseEnter('submit')}
                onMouseLeave={() => handleMouseLeave('submit')}
              >
                {loading ? (
                  <div style={styles.loadingSpinner} />
                ) : (
                  <>
                    {isLogin ? 'Sign in' : 'Create account'}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div style={styles.toggleContainer}>
              <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
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
                {isLogin ? 'Create one' : 'Sign in instead'}
                <div style={styles.toggleLinkUnderline} />
              </span>
            </div>

            <div style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </div>
          </div>
        </div>
      </div>

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

        input:focus {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(252, 169, 14, 0.45) !important;
          box-shadow: 0 0 0 3px rgba(252, 169, 14, 0.08) !important;
          outline: none;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        @media (max-width: 900px) {
          .login-shell {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
        }

        @media (max-width: 900px) {
          .login-shell > :first-child {
            min-height: 180px;
            border-right: none !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
        }
      `}</style>
    </div>
  );
};

const getFloatingOrbStyle = (top, left, size, color, delay) => ({
  position: 'absolute',
  top: `${top}%`,
  left: `${left}%`,
  width: `${size}px`,
  height: `${size}px`,
  background: `radial-gradient(circle, ${color} 0%, ${color}00 70%)`,
  borderRadius: '50%',
  animation: 'float 8s ease-in-out infinite',
  animationDelay: `${delay}s`,
  filter: 'blur(40px)',
  opacity: 0.35,
});

export default LoginPage;
