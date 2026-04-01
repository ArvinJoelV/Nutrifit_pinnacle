import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { auth, db } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { calculateDiabetesNutritionPlan } from '../../services/userService';

const ProcessingPage = () => {
    const navigate = useNavigate();
    const { formData, updateFormData } = useOnboarding();
    const [status, setStatus] = useState('Analyzing data...');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const processData = async () => {
            const plan = calculateDiabetesNutritionPlan(formData, 0);

            // Update context state
            updateFormData({
                maintenance_calories: plan.baseline_tdee,
                target_calories: plan.target_calories
            });

            // Simulation steps for UX
            const steps = [
                { msg: 'Normalizing bio-metrics...', delay: 1000, prog: 30 },
                { msg: 'Calculating metabolic rate...', delay: 2000, prog: 60 },
                { msg: 'Optimizing target goals...', delay: 3000, prog: 90 },
                { msg: 'Syncing health profile...', delay: 4000, prog: 100 }
            ];

            for (const step of steps) {
                await new Promise(r => setTimeout(r, step.delay / 2));
                setStatus(step.msg);
                setProgress(step.prog);
            }

            // 4. Save to Firestore
            const user = auth.currentUser;
            if (user) {
                await setDoc(doc(db, 'users', user.uid), {
                    ...formData,
                    maintenance_calories: plan.baseline_tdee,
                    target_calories: plan.target_calories,
                    dynamic_tdee: plan.dynamic_tdee,
                    carb_ratio: plan.carb_ratio,
                    carb_target_g: plan.carbs_g,
                    protein_target_g: plan.protein_g,
                    fat_target_g: plan.fat_g,
                    fiber_target_g: plan.fiber_g,
                    sodium_limit_mg: plan.sodium_limit_mg,
                    sat_fat_limit_g: plan.sat_fat_limit_g,
                    added_sugar_limit_g: plan.added_sugar_limit_g,
                    meal_distribution: plan.meal_distribution,
                    profile_complete: true,
                    updated_at: new Date().toISOString()
                }, { merge: true });
            }

            setTimeout(() => navigate('/home'), 1000);
        };

        processData();
    }, [navigate]);

    return (
        <OnboardingLayout progress={progress} title="Processing" subtitle="Generating your personalized nutrition model.">
            <div className="flex flex-col items-center justify-center gap-12 py-20">
                <div className="relative w-48 h-48">
                    {/* Animated Spinner Rings */}
                    <div className="absolute inset-0 border-4 border-dashed border-primary-light/30 rounded-full animate-spin" />
                    <div className="absolute inset-4 border-2 border-dashed border-secondary-light/30 rounded-full animate-spin [animation-direction:reverse] [animation-duration:5s]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-black text-white">{progress}%</span>
                    </div>
                </div>

                <div className="text-center space-y-4">
                    <h3 key={status} className="text-2xl font-bold tracking-tight text-white/80">
                        {status}
                    </h3>
                    <p className="text-white/30 text-sm font-medium uppercase tracking-[0.2em]">Please stay on this page</p>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default ProcessingPage;
