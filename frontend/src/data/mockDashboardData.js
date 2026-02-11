export const dashboardData = {
    user: {
        name: "Alex",
        greeting: "Good Morning",
        streak: 12,
    },
    macros: {
        calories: { current: 1450, target: 2200, unit: "kcal", color: "#6366f1" },
        protein: { current: 95, target: 160, unit: "g", color: "#10b981" },
        carbs: { current: 180, target: 250, unit: "g", color: "#f59e0b" },
        fat: { current: 45, target: 70, unit: "g", color: "#ef4444" },
    },
    recentMeals: [
        {
            id: 1,
            name: "Avocado Toast & Eggs",
            calories: 450,
            time: "8:30 AM",
            image: "https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&w=150&q=80",
        },
        {
            id: 2,
            name: "Grilled Chicken Salad",
            calories: 380,
            time: "1:15 PM",
            image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80",
        },
        {
            id: 3,
            name: "Greek Yogurt Parfait",
            calories: 220,
            time: "4:00 PM",
            image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=150&q=80",
        },
    ],
    eatEffect: {
        score: 92,
        insight: "High Protein = Better Focus",
        description: "Your focus scores are 24% higher on days you hit your protein goal by noon.",
        trend: "up",
    },
};
