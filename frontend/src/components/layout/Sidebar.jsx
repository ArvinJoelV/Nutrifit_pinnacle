import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Utensils, BarChart2, Activity, TrendingUp, User, LogOut } from 'lucide-react';
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';

const Sidebar = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut(auth);
        localStorage.clear();
        navigate('/login');
    };

    const navItems = [
        { name: 'Home', path: '/home', icon: Home },
        { name: 'Log Food', path: '/log', icon: Utensils },
        { name: 'Insights', path: '/insights', icon: BarChart2 },
        { name: 'Eat → Effect', path: '/eat-effect', icon: Activity },
        { name: 'Progress', path: '/progress', icon: TrendingUp },
        { name: 'Profile', path: '/profile', icon: User },
    ];

    return (
        <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-black/20 backdrop-blur-xl border-r border-white/10 z-50">
            <div className="p-8">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-linear-to-br from-primary-light to-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-xl">🌱</span>
                    </div>
                    <span className="text-2xl font-black tracking-tighter bg-linear-to-r from-white to-white/60 bg-clip-text text-transparent">
                        NutriFit
                    </span>
                </div>

                <nav className="space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group
                ${isActive
                                    ? 'bg-primary/20 text-white shadow-lg shadow-primary/10'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'}
              `}
                        >
                            <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                            <span className="font-bold tracking-wide text-sm">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-8">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-4 py-3.5 w-full rounded-2xl text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-300 group"
                >
                    <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    <span className="font-bold tracking-wide text-sm">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
