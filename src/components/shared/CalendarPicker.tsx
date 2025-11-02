"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CalendarPickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showClearButton?: boolean;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className = "",
  showClearButton = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatInputDate = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isToday = (day: number): boolean => {
    if (!value) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number): boolean => {
    if (!value) return false;
    return (
      day === value.getDate() &&
      currentMonth.getMonth() === value.getMonth() &&
      currentMonth.getFullYear() === value.getFullYear()
    );
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onChange(newDate);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = [];
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div ref={calendarRef} className={`relative ${className}`}>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 text-xs border border-gray-300 rounded-lg 
            bg-white text-gray-900 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            flex items-center justify-between gap-2
            hover:border-gray-400 transition-colors
            ${className}
          `}
        >
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className={value ? 'text-gray-900' : 'text-gray-500'}>
              {value ? formatDate(value) : placeholder}
            </span>
          </div>
          {showClearButton && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[280px]">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <h3 className="text-sm font-semibold text-gray-900">{monthName}</h3>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-xs font-medium text-gray-500 text-center py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }
                
                const isDayToday = isToday(day);
                const isDaySelected = isSelected(day);
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`
                      aspect-square flex items-center justify-center text-xs rounded-lg
                      transition-colors
                      ${
                        isDaySelected
                          ? 'bg-primary text-white font-semibold'
                          : isDayToday
                          ? 'bg-gray-100 text-gray-900 font-medium border border-gray-300'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                      hover:bg-primary/10
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange(new Date());
                  setIsOpen(false);
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Today
              </button>
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden input for form compatibility */}
      <input
        type="hidden"
        value={formatInputDate(value)}
        readOnly
      />
    </div>
  );
};

