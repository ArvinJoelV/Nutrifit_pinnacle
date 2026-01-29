import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const navigate = useNavigate();

  // Check authentication state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // User is signed in
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        });
        
        // Store login state in localStorage for persistence
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', currentUser.email || '');
      } else {
        // No user is signed in
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        
        // Check for guest session
        const guestSession = localStorage.getItem('guest_session');
        if (!guestSession) {
          navigate('/login');
        }
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await signOut(auth);
      
      // Clear all local storage
      localStorage.clear();
      
      // Optional: Clear session storage if used
      sessionStorage.clear();
      
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear local storage and redirect
      localStorage.clear();
      navigate('/login');
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleGuestContinue = () => {
    navigate('/onboarding/start?guest=true');
  };

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
    avatarContainer: {
      width: '120px',
      height: '120px',
      margin: '0 auto 30px',
      position: 'relative',
    },
    avatarCircle: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '48px',
      color: '#ffffff',
      fontWeight: '600',
      boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      objectFit: 'cover',
    },
    welcomeText: {
      fontSize: '32px',
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: '16px',
      background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    userEmail: {
      fontSize: '16px',
      color: 'rgba(255, 255, 255, 0.6)',
      textAlign: 'center',
      marginBottom: '40px',
      fontWeight: '400',
      letterSpacing: '0.5px',
    },
    statusIndicator: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '40px',
      padding: '12px 24px',
      background: 'rgba(16, 185, 129, 0.1)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '24px',
      maxWidth: '300px',
      margin: '0 auto',
    },
    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#10b981',
      animation: 'pulse 2s ease-in-out infinite',
    },
    statusText: {
      fontSize: '14px',
      color: '#10b981',
      fontWeight: '600',
    },
    actionButtons: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      marginTop: '40px',
    },
    logoutButton: {
      padding: '18px',
      fontSize: '16px',
      fontWeight: '600',
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '36px',
      color: '#fca5a5',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    },
    continueButton: {
      padding: '18px',
      fontSize: '16px',
      fontWeight: '600',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      borderRadius: '36px',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    },
    guestButton: {
      padding: '18px',
      fontSize: '16px',
      fontWeight: '600',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '36px',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(10, 10, 10, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '32px',
      zIndex: 3,
    },
    loadingSpinner: {
      width: '40px',
      height: '40px',
      border: '3px solid rgba(255, 255, 255, 0.3)',
      borderTopColor: '#667eea',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner} />
          </div>
        </div>
      </div>
    );
  }

  const isGuest = !user && localStorage.getItem('guest_session');

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
        {logoutLoading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner} />
          </div>
        )}
        
        <div style={styles.cardInner}>
          {/* User Avatar */}
          <div style={styles.avatarContainer}>
            <div style={styles.avatarCircle}>
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  style={styles.avatarImage}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = user.email?.charAt(0).toUpperCase() || 'U';
                  }}
                />
              ) : (
                user?.email?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
          </div>

          {/* Welcome Message */}
          <h1 style={styles.welcomeText}>
            {user ? `Welcome, ${user.displayName || 'User'}!` : 'Welcome, Guest!'}
          </h1>
          
          {user?.email && (
            <div style={styles.userEmail}>{user.email}</div>
          )}

          {/* Status Indicator */}
          

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            {isGuest ? (
              <button
                style={styles.guestButton}
                onClick={handleGuestContinue}
                disabled={logoutLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Continue as Guest
              </button>
            ) : (
              <button
                style={styles.continueButton}
                onClick={() => navigate('/onboarding/start')}
                disabled={logoutLoading}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Continue to Dashboard
              </button>
            )}

            <button
              style={styles.logoutButton}
              onClick={handleLogout}
              disabled={logoutLoading}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              {logoutLoading ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>

          {/* Info Message */}
          
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
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        /* Disabled button state */
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }
      `}</style>
    </div>
  );
};

export default HomePage;