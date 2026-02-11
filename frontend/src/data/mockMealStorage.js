export const saveMealLog = (mealData) => {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => {
            const logs = JSON.parse(localStorage.getItem('meal_logs') || '[]');
            const newLog = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                ...mealData
            };
            logs.unshift(newLog);
            localStorage.setItem('meal_logs', JSON.stringify(logs));
            resolve(newLog);
        }, 800);
    });
};

// ... existing code ...
export const getMealLog = (id) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const logs = JSON.parse(localStorage.getItem('meal_logs') || '[]');
            const log = logs.find(l => l.id === id);
            if (log) resolve(log);
            else reject(new Error("Meal not found"));
        }, 500);
    });
};

export const deleteMealLog = (id) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const logs = JSON.parse(localStorage.getItem('meal_logs') || '[]');
            const filteredLogs = logs.filter(l => l.id !== id);
            localStorage.setItem('meal_logs', JSON.stringify(filteredLogs));
            resolve(true);
        }, 500);
    });
};

export const updateMealLog = (id, updatedData) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const logs = JSON.parse(localStorage.getItem('meal_logs') || '[]');
            const index = logs.findIndex(l => l.id === id);
            if (index !== -1) {
                logs[index] = { ...logs[index], ...updatedData };
                localStorage.setItem('meal_logs', JSON.stringify(logs));
                resolve(logs[index]);
            } else {
                resolve(null);
            }
        }, 500);
    });
};

