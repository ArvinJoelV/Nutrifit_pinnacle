import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Camera, Ruler, Weight, Calendar, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, updateUserProfile, calculateMacroTargets } from '../services/userService';

const EditableStat = ({ icon: Icon, label, value, name, unit, onChange, isEditing }) => (
    <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-2xl text-white/60">
            <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">{label}</div>
            {isEditing ? (
                <div className="flex items-center gap-2">
                    <input
                        type={name === 'goal' ? 'text' : 'number'}
                        name={name}
                        value={value}
                        onChange={onChange}
                        className="bg-black/20 text-white font-bold text-xl w-full p-2 rounded-lg outline-none border border-white/10 focus:border-primary/50"
                    />
                    {unit && <span className="text-sm font-bold text-white/40">{unit}</span>}
                </div>
            ) : (
                <div className="font-bold text-xl">
                    {value} <span className="text-sm text-white/40 font-medium">{unit}</span>
                </div>
            )}
        </div>
    </div>
);

const ProfilePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [profile, setProfile] = useState({
        firstName: '',
        weight: '',
        height: '',
        age: '',
        goal: 'maintain',
        activity_level: 'moderate',
        gender: 'male' // needed for BMR calc
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await getUserProfile();
            if (data) setProfile(prev => ({ ...prev, ...data }));
        } catch (e) {
            console.error("Failed to load profile", e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Recalculate BMR & Targets based on new stats
            // NOTE: Duplicating BMR logic from ProcessingPage briefly for now,
            // ideally this moves to a shared helper in `userService.js`.
            const w = parseFloat(profile.weight);
            const h = parseFloat(profile.height);
            const a = parseInt(profile.age);
            const isMale = profile.gender === 'male';

            let bmr = (10 * w) + (6.25 * h) - (5 * a);
            bmr = isMale ? bmr + 5 : bmr - 161;

            const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };
            const mult = multipliers[profile.activity_level] || 1.2;
            const maintenance = Math.round(bmr * mult);

            const adjustments = { lose: -400, maintain: 0, gain: 300 };
            const adj = adjustments[profile.goal] || 0;
            const target = maintenance + adj;

            // 2. Update Firestore
            await updateUserProfile({
                ...profile,
                maintenance_calories: maintenance,
                target_calories: target,
                updated_at: new Date().toISOString()
            });

            setIsEditing(false);
        } catch (e) {
            alert("Failed to update profile: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white/40">Loading Profile...</div>;

    return (
        <div className="min-h-screen bg-[#060606] p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
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
                <div className="text-white/40 font-medium">Member since 2024</div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <EditableStat icon={Ruler} label="Height" name="height" value={profile.height} unit="cm" isEditing={isEditing} onChange={handleChange} />
                    <EditableStat icon={Weight} label="Weight" name="weight" value={profile.weight} unit="kg" isEditing={isEditing} onChange={handleChange} />
                    <EditableStat icon={Calendar} label="Age" name="age" value={profile.age} unit="yrs" isEditing={isEditing} onChange={handleChange} />
                    <EditableStat icon={Target} label="Goal" name="goal" value={profile.goal} isEditing={isEditing} onChange={handleChange} />
                </div>

                {/* Calories Card (Read Only / Calculated) */}
                <div className="bg-linear-to-br from-white/5 to-white/0 border border-white/5 rounded-[2rem] p-8 text-center mt-8">
                    <div className="text-sm font-bold text-white/40 uppercase tracking-widest mb-2">Daily Target</div>
                    <div className="text-5xl font-black text-white mb-2">{profile.target_calories || 0} <span className="text-lg text-white/40">kcal</span></div>
                    <div className="text-xs text-white/30 max-w-xs mx-auto">
                        Based on your activity level and goal, this is your optimal daily intake.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
