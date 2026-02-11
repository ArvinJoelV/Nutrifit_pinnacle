import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, Image as ImageIcon } from 'lucide-react';

const PhotoUpload = ({ onImageSelect }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            onImageSelect(imageUrl);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md aspect-square bg-white/5 border-2 border-dashed border-white/20 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-primary/50 transition-all group relative overflow-hidden"
            >
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Camera className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Snap or Upload</h3>
                    <p className="text-white/40 text-center max-w-[200px]">
                        We'll analyze your meal instantly
                    </p>
                </div>

                {/* Animated Background */}
                <div className="absolute inset-0 bg-linear-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>

            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="mt-8 flex gap-4">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full font-bold hover:bg-white/20 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    <span>Upload File</span>
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full font-bold hover:bg-white/20 transition-colors">
                    <ImageIcon className="w-4 h-4" />
                    <span>Gallery</span>
                </button>
            </div>
        </div>
    );
};

export default PhotoUpload;
