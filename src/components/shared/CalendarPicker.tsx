"use client";

import React, { useState } from 'react';
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
  const [yearInput, setYearInput] = useState(
    value ? value.getFullYear().toString() : new Date().getFullYear().toString()
  );

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
    setCurrentMonth(newDate);
  };

  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
    setYearInput(newMonth.getFullYear().toString());
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
    setYearInput(newMonth.getFullYear().toString());
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1);
    setCurrentMonth(newMonth);
  };

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    if (/^\d{0,4}$/.test(input)) {
      setYearInput(input);
      if (input.length === 4) {
        const year = parseInt(input);
        if (year >= 1900 && year <= 2100) {
          const newMonth = new Date(year, currentMonth.getMonth(), 1);
          setCurrentMonth(newMonth);
        }
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleConfirm = () => {
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (value) {
      setCurrentMonth(new Date(value));
      setYearInput(value.getFullYear().toString());
    } else {
      const now = new Date();
      setCurrentMonth(now);
      setYearInput(now.getFullYear().toString());
    }
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = [];
  
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between gap-2 hover:border-gray-400 transition-colors"
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

      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${isOpen ? 'block' : 'hidden'}`}
        onClick={handleClose}
      >
        <div 
          className="bg-white rounded-lg w-full max-w-[320px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Select Date</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={currentMonth.getMonth()}
                  onChange={handleMonthChange}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {months.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                
                <input
                  type="text"
                  value={yearInput}
                  onChange={handleYearInputChange}
                  placeholder="Year"
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary text-center"
                />
              </div>
              
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-[10px] font-medium text-gray-500 text-center py-1"
                >
                  {day}
                </div>
              ))}
            </div>

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
                    className={`aspect-square flex items-center justify-center text-[11px] rounded-full transition-colors ${
                      isDaySelected
                        ? 'bg-primary text-secondary font-semibold'
                        : isDayToday
                        ? 'bg-gray-100 text-gray-900 font-medium border border-gray-300'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  onChange(today);
                  setCurrentMonth(today);
                  setYearInput(today.getFullYear().toString());
                }}
                className="flex-1 px-3 py-1.5 text-[11px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium"
              >
                Today
              </button>
              {value && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  className="flex-1 px-3 py-1.5 text-[11px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-[11px] font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 px-3 py-1.5 bg-primary text-secondary rounded hover:bg-primary/90 transition-colors text-[11px] font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>

      <input
        type="hidden"
        value={formatInputDate(value)}
        readOnly
      />
    </div>
  );
};