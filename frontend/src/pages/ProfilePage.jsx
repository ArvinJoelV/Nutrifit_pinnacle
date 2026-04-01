import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Calendar, Droplets, HeartPulse, Loader2, Moon, Pill, Ruler, Save, Target, Utensils, Weight, Wine, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { calculateDiabetesNutritionPlan, getUserProfile, updateUserProfile } from '../services/userService';

const inputClass = 'bg-black/20 text-white font-bold text-lg w-full p-3 rounded-xl outline-none border border-white/10 focus:border-primary/50';
const selectClass = 'bg-black/20 text-white font-bold text-lg w-full p-3 rounded-xl outline-none border border-white/10 focus:border-primary/50';
const sectionClass = 'bg-white/5 border border-white/5 rounded-[2rem] p-6';

const EditableStat = ({ icon, label, value, name, unit, onChange, isEditing, type = 'number' }) => (
    <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-2xl text-white/60">
            {React.createElement(icon, { className: 'w-6 h-6' })}
        </div>
        <div className="flex-1">
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">{label}</div>
            {isEditing ? (
                <div className="flex items-center gap-2">
                    <input
                        type={type}
                        name={name}
                        value={value}
                        onChange={onChange}
                        className={inputClass}
                    />
                    {unit ? <span className="text-sm font-bold text-white/40">{unit}</span> : null}
                </div>
            ) : (
                <div className="font-bold text-xl">
                    {value || '--'} {unit ? <span className="text-sm text-white/40 font-medium">{unit}</span> : null}
                </div>
            )}
        </div>
    </div>
);

const ProfileField = ({ icon, label, value, isEditing, children }) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
            {React.createElement(icon, { className: 'w-4 h-4' })}
            <span>{label}</span>
        </label>
        {isEditing ? children : (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white font-medium">
                {value || '--'}
            </div>
        )}
    </div>
);

const TargetChip = ({ label, value, unit }) => (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-2">{label}</div>
        <div className="text-2xl font-black">
            {value}
            <span className="ml-2 text-sm text-white/40 font-medium">{unit}</span>
        </div>
    </div>
);

const ProfilePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState({
        firstName: '',
        weight: '',
        height: '',
        age: '',
        goal: 'maintain',
        activity_level: 'moderate',
        gender: 'male',
        diabetes_type: 'type2',
        hba1c: '',
        fasting_glucose: '',
        post_meal_glucose: '',
        hypoglycemia_history: 'no',
        medication_type: '',
        insulin_usage: 'no',
        diabetes_duration_years: '',
        diet_preference: '',
        food_allergies: '',
        meal_schedule: 'standard',
        alcohol_consumption: 'none',
        sleep_hours: '',
        stress_level: 5,
        medical_condition: '',
        target_calories: 0,
    });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await getUserProfile();
                if (data) setProfile((prev) => ({ ...prev, ...data }));
            } catch (e) {
                console.error('Failed to load profile', e);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const plan = calculateDiabetesNutritionPlan(profile, 0);
            const payload = {
                ...profile,
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
                updated_at: new Date().toISOString(),
            };

            await updateUserProfile(payload);
            setProfile((prev) => ({ ...prev, ...payload }));
            setIsEditing(false);
        } catch (e) {
            alert(`Failed to update profile: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const plan = calculateDiabetesNutritionPlan(profile, 0);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white/40">Loading Profile...</div>;
    }

    return (
        <div className="min-h-screen bg-[#060606] p-6 pb-24 md:pb-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate(-1)} className="p-3 bg-white/5 rounded-full hover:bg-white/10">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex gap-4">
                    {isEditing ? (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-3 bg-primary text-black rounded-full font-bold text-sm flex items-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-6 py-3 bg-white/10 text-white rounded-full font-bold text-sm hover:bg-white/20 transition-colors"
                        >
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center mb-10">
                <div className="w-32 h-32 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 border-4 border-[#060606] outline outline-2 outline-white/10 flex items-center justify-center text-4xl font-black mb-4 relative overflow-hidden group">
                    {profile.firstName?.[0]?.toUpperCase() || 'U'}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <Camera className="w-8 h-8 opacity-70" />
                    </div>
                </div>
                <h1 className="text-3xl font-black">{profile.firstName || 'User'}</h1>
                <div className="text-white/40 font-medium">Diabetes-focused nutrition profile</div>
            </div>

            <div className="space-y-6">
                <section className={sectionClass}>
                    <h2 className="text-lg font-bold mb-4">Core Metrics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <EditableStat icon={Ruler} label="Height" name="height" value={profile.height} unit="cm" isEditing={isEditing} onChange={handleChange} />
                        <EditableStat icon={Weight} label="Weight" name="weight" value={profile.weight} unit="kg" isEditing={isEditing} onChange={handleChange} />
                        <EditableStat icon={Calendar} label="Age" name="age" value={profile.age} unit="yrs" isEditing={isEditing} onChange={handleChange} />
                        <ProfileField icon={Target} label="Goal" value={profile.goal} isEditing={isEditing}>
                            <select name="goal" value={profile.goal} onChange={handleChange} className={selectClass}>
                                <option value="lose">Weight loss</option>
                                <option value="maintain">Maintenance</option>
                                <option value="gain">Weight gain</option>
                            </select>
                        </ProfileField>
                        <ProfileField icon={Target} label="Activity Level" value={profile.activity_level} isEditing={isEditing}>
                            <select name="activity_level" value={profile.activity_level} onChange={handleChange} className={selectClass}>
                                <option value="sedentary">Sedentary</option>
                                <option value="light">Light activity</option>
                                <option value="moderate">Moderate</option>
                                <option value="active">Active</option>
                                <option value="athlete">Very active</option>
                            </select>
                        </ProfileField>
                        <ProfileField icon={Target} label="Gender" value={profile.gender} isEditing={isEditing}>
                            <select name="gender" value={profile.gender} onChange={handleChange} className={selectClass}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </ProfileField>
                    </div>
                </section>

                <section className={sectionClass}>
                    <h2 className="text-lg font-bold mb-4">Diabetes Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ProfileField icon={Droplets} label="Diabetes Type" value={profile.diabetes_type} isEditing={isEditing}>
                            <select name="diabetes_type" value={profile.diabetes_type || 'type2'} onChange={handleChange} className={selectClass}>
                                <option value="type1">Type 1</option>
                                <option value="type2">Type 2</option>
                            </select>
                        </ProfileField>
                        <EditableStat icon={Droplets} label="HbA1c" name="hba1c" value={profile.hba1c} unit="%" isEditing={isEditing} onChange={handleChange} type="number" />
                        <EditableStat icon={Droplets} label="Fasting Glucose" name="fasting_glucose" value={profile.fasting_glucose} unit="mg/dL" isEditing={isEditing} onChange={handleChange} type="number" />
                        <EditableStat icon={Droplets} label="Post-Meal Glucose" name="post_meal_glucose" value={profile.post_meal_glucose} unit="mg/dL" isEditing={isEditing} onChange={handleChange} type="number" />
                        <ProfileField icon={HeartPulse} label="Hypoglycemia History" value={profile.hypoglycemia_history} isEditing={isEditing}>
                            <select name="hypoglycemia_history" value={profile.hypoglycemia_history || 'no'} onChange={handleChange} className={selectClass}>
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>
                        </ProfileField>
                        <ProfileField icon={Pill} label="Insulin Usage" value={profile.insulin_usage} isEditing={isEditing}>
                            <select name="insulin_usage" value={profile.insulin_usage || 'no'} onChange={handleChange} className={selectClass}>
                                <option value="no">No insulin</option>
                                <option value="yes">Uses insulin</option>
                            </select>
                        </ProfileField>
                        <ProfileField icon={Pill} label="Medication Type" value={profile.medication_type} isEditing={isEditing}>
                            <input name="medication_type" value={profile.medication_type || ''} onChange={handleChange} className={inputClass} />
                        </ProfileField>
                        <EditableStat icon={Calendar} label="Diabetes Duration" name="diabetes_duration_years" value={profile.diabetes_duration_years} unit="yrs" isEditing={isEditing} onChange={handleChange} type="number" />
                    </div>
                </section>

                <section className={sectionClass}>
                    <h2 className="text-lg font-bold mb-4">Lifestyle & Food</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ProfileField icon={Utensils} label="Diet Preference" value={profile.diet_preference} isEditing={isEditing}>
                            <select name="diet_preference" value={profile.diet_preference || ''} onChange={handleChange} className={selectClass}>
                                <option value="">Select diet</option>
                                <option value="veg">Vegetarian</option>
                                <option value="non-veg">Non-Veg</option>
                                <option value="vegan">Vegan</option>
                                <option value="eggetarian">Eggetarian</option>
                            </select>
                        </ProfileField>
                        <ProfileField icon={Utensils} label="Meal Schedule" value={profile.meal_schedule} isEditing={isEditing}>
                            <select name="meal_schedule" value={profile.meal_schedule || 'standard'} onChange={handleChange} className={selectClass}>
                                <option value="standard">3 meals + snack</option>
                                <option value="early">Early eating window</option>
                                <option value="late">Late eating window</option>
                                <option value="shift">Shift schedule</option>
                            </select>
                        </ProfileField>
                        <ProfileField icon={Wine} label="Alcohol" value={profile.alcohol_consumption} isEditing={isEditing}>
                            <select name="alcohol_consumption" value={profile.alcohol_consumption || 'none'} onChange={handleChange} className={selectClass}>
                                <option value="none">None</option>
                                <option value="occasional">Occasional</option>
                                <option value="regular">Regular</option>
                            </select>
                        </ProfileField>
                        <EditableStat icon={Moon} label="Sleep" name="sleep_hours" value={profile.sleep_hours} unit="hrs" isEditing={isEditing} onChange={handleChange} type="number" />
                        <EditableStat icon={Zap} label="Stress" name="stress_level" value={profile.stress_level} unit="/10" isEditing={isEditing} onChange={handleChange} type="number" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 mt-4">
                        <ProfileField icon={Utensils} label="Food Allergies / Avoidances" value={profile.food_allergies} isEditing={isEditing}>
                            <textarea name="food_allergies" value={profile.food_allergies || ''} onChange={handleChange} className={`${inputClass} min-h-24 resize-none`} />
                        </ProfileField>
                        <ProfileField icon={HeartPulse} label="Medical Notes" value={profile.medical_condition} isEditing={isEditing}>
                            <textarea name="medical_condition" value={profile.medical_condition || ''} onChange={handleChange} className={`${inputClass} min-h-24 resize-none`} />
                        </ProfileField>
                    </div>
                </section>

                <section className="bg-linear-to-br from-white/5 to-white/0 border border-white/5 rounded-[2rem] p-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
                        <div className="text-sm font-bold text-white/40 uppercase tracking-widest">Calculated Diabetes Targets</div>
                        <Link
                            to="/meal-plan"
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-primary-light"
                        >
                            View meal allocation
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <TargetChip label="Calories" value={plan.target_calories} unit="kcal" />
                        <TargetChip label="Carbs" value={plan.carbs_g} unit="g" />
                        <TargetChip label="Protein" value={plan.protein_g} unit="g" />
                        <TargetChip label="Fat" value={plan.fat_g} unit="g" />
                        <TargetChip label="Fiber" value={plan.fiber_g} unit="g" />
                        <TargetChip label="Sodium" value={plan.sodium_limit_mg} unit="mg" />
                        <TargetChip label="Sat Fat" value={plan.sat_fat_limit_g} unit="g" />
                        <TargetChip label="Added Sugar" value={plan.added_sugar_limit_g} unit="g" />
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ProfilePage;
