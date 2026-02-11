import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { motion } from 'framer-motion';
import { User, Ruler, Weight, Calendar } from 'lucide-react';

const InputField = ({ icon: Icon, label, name, type, placeholder, unit, value, onChange, error }) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-white/40 ml-4 mb-2 block uppercase tracking-widest">{label}</label>
        <div className={`relative group transition-all duration-300 ${error ? 'animate-shake' : ''}`}>
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-light transition-colors">
                <Icon className="w-5 h-5" />
            </div>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full bg-white/5 border-2 ${error ? 'border-red-500/50' : 'border-white/5 group-focus-within:border-primary-light/50'} rounded-3xl py-5 pl-16 pr-20 text-xl font-bold transition-all outline-none focus:bg-white/10`}
            />
            {unit && (
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-white/20 font-bold uppercase tracking-widest text-xs italic">
                    {unit}
                </span>
            )}
        </div>
        {error && <p className="text-red-400 text-xs ml-4 mt-2 font-medium">{error}</p>}
    </div>
);

const BasicInfoPage = () => {
    const navigate = useNavigate();
    const { formData, updateFormData } = useOnboarding();
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        updateFormData({ [name]: value });
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.age || formData.age < 13 || formData.age > 120) newErrors.age = "Please enter a valid age (13-120)";
        if (!formData.height || formData.height < 100 || formData.height > 250) newErrors.height = "Height must be between 100-250cm";
        if (!formData.weight || formData.weight < 30 || formData.weight > 300) newErrors.weight = "Weight must be between 30-300kg";
        if (!formData.gender) newErrors.gender = "Please select your gender";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            navigate('/onboarding/activity');
        }
    };

    return (
        <OnboardingLayout progress={20} title="The Essentials" subtitle="Tell us a bit about your physical profile.">
            <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField
                        icon={Calendar}
                        label="Age"
                        name="age"
                        type="number"
                        placeholder="25"
                        unit="Years"
                        value={formData.age}
                        onChange={handleChange}
                        error={errors.age}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/40 ml-4 mb-2 block uppercase tracking-widest">Gender</label>
                        <div className="grid grid-cols-2 gap-4">
                            {['male', 'female'].map((g) => (
                                <button
                                    key={g}
                                    onClick={() => updateFormData({ gender: g })}
                                    className={`py-5 rounded-3xl border-2 font-bold capitalize transition-all ${formData.gender === g
                                        ? 'bg-primary-light/20 border-primary-light text-white shadow-lg shadow-primary-light/20'
                                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                                        }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                        {errors.gender && <p className="text-red-400 text-xs ml-4 mt-1 font-medium">{errors.gender}</p>}
                    </div>

                    <InputField
                        icon={Ruler}
                        label="Height"
                        name="height"
                        type="number"
                        placeholder="175"
                        unit="cm"
                        value={formData.height}
                        onChange={handleChange}
                        error={errors.height}
                    />
                    <InputField
                        icon={Weight}
                        label="Weight"
                        name="weight"
                        type="number"
                        placeholder="70"
                        unit="kg"
                        value={formData.weight}
                        onChange={handleChange}
                        error={errors.weight}
                    />
                </div>

                <div className="flex justify-between items-center pt-8">
                    <button
                        onClick={() => navigate('/onboarding/welcome')}
                        className="text-white/40 hover:text-white font-bold transition-colors px-6"
                    >
                        Back
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNext}
                        className="px-12 py-5 bg-white text-black rounded-full font-bold text-lg hover:shadow-2xl transition-all"
                    >
                        Continue
                    </motion.button>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default BasicInfoPage;
