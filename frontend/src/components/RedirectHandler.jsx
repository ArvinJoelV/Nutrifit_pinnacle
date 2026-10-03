import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const RedirectHandler = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [profileComplete, setProfileComplete] = useState(false);

    useEffect(() => {
        let unsubscribeDoc = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            console.log('Auth state changed:', currentUser?.uid);
            if (currentUser) {
                setUser(currentUser);

                // Listen to user document for real-time profile_complete updates
                unsubscribeDoc = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
                    console.log('User doc snapshot:', doc.exists());
                    if (doc.exists() && doc.data().profile_complete) {
                        setProfileComplete(true);
                    } else {
                        setProfileComplete(false);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error('Error fetching user doc:', error);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary-light border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    const isGuest = typeof window !== 'undefined' && localStorage.getItem('guest_session');

    if (!user && !isGuest) {
        return <Navigate to="/login" replace />;
    }

    if (!user && isGuest) {
        return children;
    }

    if (!profileComplete && !window.location.pathname.startsWith('/onboarding')) {
        return <Navigate to="/onboarding/welcome" replace />;
    }

    if (profileComplete && window.location.pathname.startsWith('/onboarding')) {
        return <Navigate to="/home" replace />;
    }

    return children;
};

export default RedirectHandler;
