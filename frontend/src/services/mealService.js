import { db, auth } from '../config/firebase';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    deleteDoc,
    updateDoc,
    orderBy,
    limit
} from 'firebase/firestore';

// Helper to get current user ID
const getUserId = () => {
    const user = auth.currentUser;
    if (!user) {
        console.error("Auth Error: No user logged in.");
        throw new Error("User not authenticated. Please log in again.");
    }
    return user.uid;
};

// Formatting helpers
const formatDate = (date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

/**
 * Save a new meal log to Firestore
 */
export const saveMealLog = async (mealData) => {
    try {
        const userId = getUserId();
        const mealRef = collection(db, 'users', userId, 'mealLogs');

        const newLog = {
            ...mealData,
            userId,
            date: formatDate(new Date()), // For easy daily querying
            timestamp: new Date().toISOString(), // For sorting
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(mealRef, newLog);
        return { id: docRef.id, ...newLog };
    } catch (error) {
        console.error("Error adding meal log: ", error);
        throw error;
    }
};

/**
 * Get daily stats (aggregated) for a specific date (default: today)
 */
export const getDailyStats = async (date = new Date()) => {
    try {
        const userId = getUserId();
        const dateStr = formatDate(date);

        const mealRef = collection(db, 'users', userId, 'mealLogs');
        const q = query(mealRef, where("date", "==", dateStr), orderBy("timestamp", "desc"));

        const querySnapshot = await getDocs(q);
        const meals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Aggregate Totals
        const totals = meals.reduce((acc, meal) => ({
            calories: acc.calories + (meal.totalCalories || 0),
            protein: acc.protein + (meal.macros?.protein || 0),
            carbs: acc.carbs + (meal.macros?.carbs || 0),
            fat: acc.fat + (meal.macros?.fat || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        return { totals, meals };
    } catch (error) {
        console.error("Error getting daily stats: ", error);
        // Return empty structure on error/no auth to prevent crash
        return { totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, meals: [] };
    }
};

/**
 * Get a single meal log by ID
 */
export const getMealLog = async (id) => {
    try {
        const userId = getUserId();
        const docRef = doc(db, 'users', userId, 'mealLogs', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            throw new Error("Meal not found");
        }
    } catch (error) {
        console.error("Error getting meal log: ", error);
        throw error;
    }
};

/**
 * Delete a meal log
 */
export const deleteMealLog = async (id) => {
    try {
        const userId = getUserId();
        const docRef = doc(db, 'users', userId, 'mealLogs', id);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error("Error deleting meal log: ", error);
        throw error;
    }
};

/**
 * Update a meal log (e.g. edit portions)
 */
export const updateMealLog = async (id, updatedData) => {
    try {
        const userId = getUserId();
        const docRef = doc(db, 'users', userId, 'mealLogs', id);
        await updateDoc(docRef, updatedData);
        return { id, ...updatedData };
    } catch (error) {
        console.error("Error updating meal log: ", error);
        throw error;
    }
};
