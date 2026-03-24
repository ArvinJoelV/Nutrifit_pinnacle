import { db, auth } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Fetch full user profile from Firestore
 */
export const getUserProfile = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { uid: user.uid, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (data) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const docRef = doc(db, 'users', user.uid);
        await updateDoc(docRef, data);
        return true;
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
};

/**
 * Calculate macro targets based on daily calories
 * Uses a balanced 30% Protein / 40% Carbs / 30% Fat split by default
 */
export const calculateMacroTargets = (calories) => {
    if (!calories) return { protein: 150, carbs: 250, fat: 70 }; // Defaults

    return {
        protein: Math.round((calories * 0.30) / 4),
        carbs: Math.round((calories * 0.40) / 4),
        fat: Math.round((calories * 0.30) / 9)
    };
};
