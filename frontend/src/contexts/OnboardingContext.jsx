import React, { createContext, useContext, useState, useEffect } from 'react';

const OnboardingContext = createContext();

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
};

export const OnboardingProvider = ({ children }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        activity_level: '',
        goal: '',
        diet_preference: '',
        sleep_hours: '',
        stress_level: 0,
        medical_condition: '',
        maintenance_calories: 0,
        target_calories: 0,
    });

    const updateFormData = (newData) => {
        setFormData((prev) => ({ ...prev, ...newData }));
    };

    return (
        <OnboardingContext.Provider value={{ formData, updateFormData }}>
            {children}
        </OnboardingContext.Provider>
    );
};
