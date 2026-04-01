import { db, auth } from '../config/firebase';
import {
    collection,
    addDoc,
    query,
    getDocs,
    doc,
    getDoc,
    deleteDoc,
    updateDoc,
    orderBy,
    limit,
    setDoc
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
const formatUtcDate = (date) => date.toISOString().split('T')[0];
const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ensureUserDocumentExists = async () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("User not authenticated. Please log in again.");
    }

    await setDoc(doc(db, 'users', user.uid), {
        email: user.email || null,
        lastLogin: new Date().toISOString(),
    }, { merge: true });
};

const normalizeFirestoreError = (error) => {
    if (error?.code === 'permission-denied') {
        return new Error('Firestore denied the meal save. Check your Firestore rules for users/{uid}/mealLogs.');
    }
    return error;
};

/**
 * Save a new meal log to Firestore
 */
export const saveMealLog = async (mealData) => {
    try {
        const userId = getUserId();
        await ensureUserDocumentExists();
        const mealRef = collection(db, 'users', userId, 'mealLogs');

        const newLog = {
            ...mealData,
            userId,
            date: formatUtcDate(new Date()),
            localDate: formatLocalDate(new Date()),
            timestamp: new Date().toISOString(), // For sorting
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(mealRef, newLog);
        return { id: docRef.id, ...newLog };
    } catch (error) {
        console.error("Error adding meal log: ", error);
        throw normalizeFirestoreError(error);
    }
};

/**
 * Get daily stats (aggregated) for a specific date (default: today)
 */
export const getDailyStats = async (date = new Date()) => {
    try {
        const userId = getUserId();
        const localDate = formatLocalDate(date);
        const utcDate = formatUtcDate(date);

        const mealRef = collection(db, 'users', userId, 'mealLogs');
        const q = query(mealRef, orderBy("createdAt", "desc"), limit(25));

        const querySnapshot = await getDocs(q);
        const allMeals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const meals = allMeals.filter((meal) => meal.localDate === localDate || meal.date === localDate || meal.date === utcDate);

        // Aggregate Totals
        const totals = meals.reduce((acc, meal) => ({
            calories: acc.calories + (meal.totalCalories || 0),
            protein: acc.protein + (meal.macros?.protein || 0),
            carbs: acc.carbs + (meal.macros?.carbs || 0),
            fat: acc.fat + (meal.macros?.fat || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        return { totals, meals: allMeals };
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
        throw normalizeFirestoreError(error);
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
        throw normalizeFirestoreError(error);
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
        throw normalizeFirestoreError(error);
    }
};
