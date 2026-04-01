import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Utensils, BarChart2, Activity, Settings, Soup, User } from 'lucide-react';

const BottomNav = () => {
    const navItems = [
        { name: 'Home', path: '/home', icon: Home },
        { name: 'Log', path: '/log', icon: Utensils },

        { name: 'Plan', path: '/meal-plan', icon: Soup },

        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
            <div className="flex justify-around items-center px-4 py-3">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
              flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300
              ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
            `}
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`
                  p-1.5 rounded-xl transition-all duration-300
                  ${isActive ? 'bg-white/10' : 'bg-transparent'}
                `}>
                                    <item.icon className={`w-5 h-5 ${isActive ? 'stroke-2' : 'stroke-[1.5]'}`} />
                                </div>
                                <span className="text-[10px] font-bold tracking-wide opacity-80">{item.name}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;
