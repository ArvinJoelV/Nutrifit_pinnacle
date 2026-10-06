import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { HeartPulse, Home, Settings, Soup, User, Utensils } from 'lucide-react';

const BottomNav = () => {
    const location = useLocation();

    const navItems = [
        { name: 'Home', path: '/home', icon: Home },
        { name: 'Log', path: '/log/photo', icon: Utensils, matchPrefix: '/log' },
        { name: 'Plan', path: '/meal-plan', icon: Soup },
        { name: 'Health', path: '/health', icon: HeartPulse },
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
            <div className="flex justify-around items-center px-4 py-3">
                {navItems.map((item) => {
                    const isActive = item.matchPrefix
                        ? location.pathname.startsWith(item.matchPrefix)
                        : location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`
                  flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300
                  ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
                `}
                        >
                            <div className={`
                      p-1.5 rounded-xl transition-all duration-300
                      ${isActive ? 'bg-white/10' : 'bg-transparent'}
                    `}>
                                <item.icon className={`w-5 h-5 ${isActive ? 'stroke-2 text-primary' : 'stroke-[1.5]'}`} />
                            </div>
                            <span className="text-[10px] font-bold tracking-wide opacity-80">{item.name}</span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
