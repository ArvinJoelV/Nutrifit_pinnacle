import React from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Activity, AlertTriangle, Leaf, Moon, Pill, Syringe, Wine, Zap } from 'lucide-react';

const selectInputClass = 'w-full bg-white/5 border-2 border-white/5 rounded-3xl p-5 text-lg font-medium outline-none focus:border-white/20 transition-all focus:bg-white/10';
const textInputClass = 'w-full bg-white/5 border-2 border-white/5 rounded-3xl p-5 text-lg font-medium outline-none focus:border-white/20 transition-all focus:bg-white/10';

const Field = ({ label, children, icon }) => (
    <section className="space-y-4">
        <label className="text-xs font-bold text-white/30 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
            {icon}
            <span>{label}</span>
        </label>
        {children}
    </section>
);

const LifestylePage = () => {
    const navigate = useNavigate();
    const { formData, updateFormData } = useOnboarding();

    const diets = [
        { id: 'veg', label: 'Vegetarian' },
        { id: 'non-veg', label: 'Non-Veg' },
        { id: 'vegan', label: 'Vegan' },
        { id: 'eggetarian', label: 'Eggetarian' },
    ];

    return (
        <OnboardingLayout progress={80} title="Diabetes Profile" subtitle="Add the medical and lifestyle details used to shape your diabetes nutrition plan.">
            <div className="space-y-12">
                <Field label="Diabetes Details" icon={<Activity className="w-4 h-4" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                            value={formData.diabetes_type}
                            onChange={(e) => updateFormData({ diabetes_type: e.target.value })}
                            className={selectInputClass}
                        >
                            <option value="type1">Diabetes Type 1</option>
                            <option value="type2">Diabetes Type 2</option>
                        </select>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="HbA1c (%)"
                            value={formData.hba1c}
                            onChange={(e) => updateFormData({ hba1c: e.target.value })}
                            className={textInputClass}
                        />
                        <input
                            type="number"
                            placeholder="Fasting glucose (mg/dL)"
                            value={formData.fasting_glucose}
                            onChange={(e) => updateFormData({ fasting_glucose: e.target.value })}
                            className={textInputClass}
                        />
                        <input
                            type="number"
                            placeholder="Post-meal glucose (mg/dL)"
                            value={formData.post_meal_glucose}
                            onChange={(e) => updateFormData({ post_meal_glucose: e.target.value })}
                            className={textInputClass}
                        />
                        <select
                            value={formData.hypoglycemia_history}
                            onChange={(e) => updateFormData({ hypoglycemia_history: e.target.value })}
                            className={selectInputClass}
                        >
                            <option value="no">No hypoglycemia history</option>
                            <option value="yes">History of hypoglycemia</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Medication type"
                            value={formData.medication_type}
                            onChange={(e) => updateFormData({ medication_type: e.target.value })}
                            className={textInputClass}
                        />
                        <select
                            value={formData.insulin_usage}
                            onChange={(e) => updateFormData({ insulin_usage: e.target.value })}
                            className={selectInputClass}
                        >
                            <option value="no">No insulin</option>
                            <option value="yes">Uses insulin</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Duration of diabetes (years)"
                            value={formData.diabetes_duration_years}
                            onChange={(e) => updateFormData({ diabetes_duration_years: e.target.value })}
                            className={textInputClass}
                        />
                    </div>
                </Field>

                <Field label="Diet Preference" icon={<Leaf className="w-4 h-4" />}>
                    <div className="grid grid-cols-2 gap-4">
                        {diets.map((diet) => (
                            <button
                                key={diet.id}
                                onClick={() => updateFormData({ diet_preference: diet.id })}
                                className={`flex items-center justify-center gap-4 p-5 rounded-3xl border-2 transition-all ${formData.diet_preference === diet.id
                                    ? 'bg-accent-light/10 border-accent-light text-white shadow-lg shadow-accent-light/10'
                                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                                    }`}
                            >
                                <span className="font-bold">{diet.label}</span>
                            </button>
                        ))}
                    </div>
                </Field>

                <Field label="Food Allergies / Avoidances" icon={<AlertTriangle className="w-4 h-4" />}>
                    <textarea
                        placeholder="List allergies, trigger foods, or foods you avoid"
                        value={formData.food_allergies}
                        onChange={(e) => updateFormData({ food_allergies: e.target.value })}
                        className="w-full bg-white/5 border-2 border-white/5 rounded-3xl p-6 text-lg font-medium outline-none focus:border-white/20 h-28 resize-none transition-all focus:bg-white/10"
                    />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Field label="Meal Schedule" icon={<Pill className="w-4 h-4" />}>
                        <select
                            value={formData.meal_schedule}
                            onChange={(e) => updateFormData({ meal_schedule: e.target.value })}
                            className={selectInputClass}
                        >
                            <option value="standard">3 meals + snack</option>
                            <option value="early">Early eating window</option>
                            <option value="late">Late eating window</option>
                            <option value="shift">Shift-based schedule</option>
                        </select>
                    </Field>

                    <Field label="Alcohol Consumption" icon={<Wine className="w-4 h-4" />}>
                        <select
                            value={formData.alcohol_consumption}
                            onChange={(e) => updateFormData({ alcohol_consumption: e.target.value })}
                            className={selectInputClass}
                        >
                            <option value="none">None</option>
                            <option value="occasional">Occasional</option>
                            <option value="regular">Regular</option>
                        </select>
                    </Field>
                </div>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Field label="Sleep Duration" icon={<Moon className="w-4 h-4" />}>
                        <input
                            type="range"
                            min="4"
                            max="12"
                            step="0.5"
                            value={formData.sleep_hours || 7}
                            onChange={(e) => updateFormData({ sleep_hours: e.target.value })}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <div className="flex justify-between text-lg font-bold">
                            <span>{formData.sleep_hours || 7}h</span>
                            <span className="text-white/40 italic">Ideal 8h</span>
                        </div>
                    </Field>

                    <Field label="Stress Level" icon={<Zap className="w-4 h-4" />}>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={formData.stress_level || 5}
                            onChange={(e) => updateFormData({ stress_level: e.target.value })}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <div className="flex justify-between text-lg font-bold uppercase tracking-tight">
                            <span>{formData.stress_level <= 3 ? 'Low' : formData.stress_level <= 7 ? 'Moderate' : 'High'}</span>
                            <span className="text-white/40 italic">{formData.stress_level}/10</span>
                        </div>
                    </Field>
                </section>

                <Field label="Medical Notes" icon={<Syringe className="w-4 h-4" />}>
                    <textarea
                        placeholder="Optional notes such as hypertension, lipid issues, or clinician advice"
                        value={formData.medical_condition}
                        onChange={(e) => updateFormData({ medical_condition: e.target.value })}
                        className="w-full bg-white/5 border-2 border-white/5 rounded-3xl p-6 text-lg font-medium outline-none focus:border-white/20 h-28 resize-none transition-all focus:bg-white/10"
                    />
                </Field>

                <div className="flex justify-between items-center pt-8">
                    <button
                        onClick={() => navigate('/onboarding/goal')}
                        className="text-white/40 hover:text-white font-bold transition-colors px-6"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => navigate('/onboarding/processing')}
                        className="px-12 py-5 bg-white text-black rounded-full font-bold text-lg hover:shadow-2xl transition-all"
                    >
                        Finalize
                    </button>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default LifestylePage;
