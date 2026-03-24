export const mockFoodDatabase = [
    // Breakfast
    { id: 1, name: "Oatmeal", brand: "Quaker", calories: 150, protein: 5, carbs: 27, fat: 3, serving: "1 cup cooked", category: "Breakfast" },
    { id: 5, name: "Scrambled Eggs", brand: null, calories: 140, protein: 12, carbs: 1, fat: 10, serving: "2 large eggs", category: "Breakfast" },
    { id: 13, name: "Pancakes", brand: "Homemade", calories: 350, protein: 8, carbs: 60, fat: 10, serving: "2 medium", category: "Breakfast" },
    { id: 14, name: "Avocado Toast", brand: null, calories: 290, protein: 9, carbs: 35, fat: 14, serving: "1 slice", category: "Breakfast" },
    { id: 15, name: "Bacon", brand: "Oscar Mayer", calories: 86, protein: 6, carbs: 0.2, fat: 6, serving: "2 slices", category: "Breakfast" },

    // High Protein / Meats
    { id: 2, name: "Grilled Chicken Breast", brand: null, calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: "100g", category: "High Protein" },
    { id: 4, name: "Greek Yogurt", brand: "Chobani", calories: 120, protein: 12, carbs: 9, fat: 0, serving: "1 container (5.3oz)", category: "High Protein" },
    { id: 9, name: "Salmon Fillet", brand: null, calories: 350, protein: 37, carbs: 0, fat: 22, serving: "6 oz", category: "High Protein" },
    { id: 11, name: "Protein Shake", brand: "Whey Gold", calories: 120, protein: 24, carbs: 3, fat: 1, serving: "1 scoop", category: "High Protein" },
    { id: 16, name: "Tuna Salad", brand: null, calories: 190, protein: 16, carbs: 8, fat: 12, serving: "1/2 cup", category: "High Protein" },
    { id: 17, name: "Steak (Sirloin)", brand: null, calories: 400, protein: 45, carbs: 0, fat: 22, serving: "8 oz", category: "High Protein" },

    // Fruits & Veggies
    { id: 3, name: "Banana", brand: null, calories: 105, protein: 1.3, carbs: 27, fat: 0.3, serving: "1 medium", category: "Fruits" },
    { id: 7, name: "Avocado", brand: null, calories: 240, protein: 3, carbs: 12, fat: 22, serving: "1 medium", category: "Veggie" },
    { id: 10, name: "Broccoli", brand: null, calories: 55, protein: 3.7, carbs: 11, fat: 0.6, serving: "1 cup chopped", category: "Veggie" },
    { id: 12, name: "Apple", brand: null, calories: 95, protein: 0.5, carbs: 25, fat: 0.3, serving: "1 medium", category: "Fruits" },
    { id: 18, name: "Spinach", brand: null, calories: 7, protein: 0.9, carbs: 1, fat: 0.1, serving: "1 cup raw", category: "Veggie" },
    { id: 19, name: "Sweet Potato", brand: null, calories: 112, protein: 2, carbs: 26, fat: 0, serving: "1 medium", category: "Veggie" },

    // Mexican
    { id: 20, name: "Chicken Taco", brand: null, calories: 200, protein: 12, carbs: 20, fat: 8, serving: "1 taco", category: "Mexican" },
    { id: 21, name: "Bean Burrito", brand: "Taco Bell", calories: 350, protein: 13, carbs: 55, fat: 9, serving: "1 item", category: "Mexican" },
    { id: 22, name: "Guacamole", brand: null, calories: 150, protein: 2, carbs: 8, fat: 13, serving: "1/4 cup", category: "Mexican" },
    { id: 23, name: "Nachos", brand: null, calories: 500, protein: 10, carbs: 60, fat: 25, serving: "1 plate", category: "Mexican" },

    // Italian
    { id: 24, name: "Spaghetti Bolognese", brand: null, calories: 450, protein: 20, carbs: 60, fat: 15, serving: "1.5 cup", category: "Italian" },
    { id: 25, name: "Pizza Slice (Cheese)", brand: "Domino's", calories: 280, protein: 12, carbs: 35, fat: 10, serving: "1 large slice", category: "Italian" },
    { id: 26, name: "Lasagna", brand: null, calories: 600, protein: 30, carbs: 50, fat: 35, serving: "1 piece", category: "Italian" },
    { id: 27, name: "Caesar Salad", brand: null, calories: 300, protein: 8, carbs: 10, fat: 25, serving: "1 bowl", category: "Italian" },

    // Asian
    { id: 28, name: "Sushi Roll (California)", brand: null, calories: 255, protein: 9, carbs: 38, fat: 7, serving: "6 pieces", category: "Asian" },
    { id: 29, name: "Chicken Stir Fry", brand: null, calories: 350, protein: 25, carbs: 30, fat: 15, serving: "1.5 cup", category: "Asian" },
    { id: 30, name: "Ramen", brand: null, calories: 450, protein: 15, carbs: 70, fat: 12, serving: "1 bowl", category: "Asian" },
    { id: 31, name: "Pad Thai", brand: null, calories: 550, protein: 20, carbs: 85, fat: 20, serving: "1 container", category: "Asian" },

    // Fast Food / Burgers
    { id: 32, name: "Cheeseburger", brand: "McDonald's", calories: 300, protein: 15, carbs: 33, fat: 12, serving: "1 burger", category: "Fast Food" },
    { id: 33, name: "French Fries (Medium)", brand: "McDonald's", calories: 320, protein: 4, carbs: 43, fat: 15, serving: "1 carton", category: "Fast Food" },
    { id: 34, name: "Chicken Nuggets", brand: null, calories: 270, protein: 15, carbs: 16, fat: 18, serving: "6 pieces", category: "Fast Food" },

    // Snacks
    { id: 8, name: "Almonds", brand: null, calories: 164, protein: 6, carbs: 6, fat: 14, serving: "1 oz (23 nuts)", category: "Snack" },
    { id: 35, name: "Potato Chips", brand: "Lays", calories: 160, protein: 2, carbs: 15, fat: 10, serving: "1 oz", category: "Snack" },
    { id: 36, name: "Chocolate Bar", brand: "Snickers", calories: 250, protein: 4, carbs: 33, fat: 12, serving: "1 bar", category: "Snack" },
    { id: 37, name: "Granola Bar", brand: "Nature Valley", calories: 190, protein: 3, carbs: 29, fat: 7, serving: "2 bars", category: "Snack" },

    // Beverages
    { id: 38, name: "Orange Juice", brand: "Tropicana", calories: 110, protein: 2, carbs: 26, fat: 0, serving: "8 oz", category: "Beverages" },
    { id: 39, name: "Coca Cola", brand: null, calories: 140, protein: 0, carbs: 39, fat: 0, serving: "1 can", category: "Beverages" },
    { id: 40, name: "Iced Coffee (Sweet)", brand: "Starbucks", calories: 180, protein: 3, carbs: 30, fat: 4, serving: "16 oz", category: "Beverages" },
];

export const searchCategories = [
    "All", "Breakfast", "Lunch", "Dinner",
    "High Protein", "Veggie", "Fruits",
    "Mexican", "Italian", "Asian", "Fast Food",
    "Snack", "Beverages"
];
