"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ResponsiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function ResponsiveDrawer({ 
  isOpen, 
  onClose, 
  title, 
  children,
  maxWidth = "max-w-md"
}: ResponsiveDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // iPad and below
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Add blur class to body when modal is open
      document.body.classList.add('modal-open');
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      // Remove blur class when modal closes
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 md:z-50"
          />

          {/* Desktop Modal / Mobile Drawer */}
          <motion.div
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300
            }}
            className={`
              fixed z-50 bg-white shadow-xl
              ${isMobile 
                ? 'bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh]' 
                : `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg ${maxWidth} w-[90vw] max-h-[80vh]`
              }
              flex flex-col
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drawer Handle */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing" onTouchStart={onClose}>
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}