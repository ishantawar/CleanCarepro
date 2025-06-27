import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addDays,
  isSameDay,
  isToday,
  isTomorrow,
  startOfWeek,
  addWeeks,
  subWeeks,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { cn } from "@/lib/utils";

interface ProfessionalDateTimePickerProps {
  selectedDate?: Date;
  selectedTime?: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  className?: string;
}

const ProfessionalDateTimePicker: React.FC<ProfessionalDateTimePickerProps> = ({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  className,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  // Generate dates for next 7 days starting from today (no past dates)
  const generateAvailableDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      dates.push({
        date,
        label: isToday(date)
          ? "Today"
          : isTomorrow(date)
            ? "Tomorrow"
            : format(date, "EEE"),
        shortDate: format(date, "dd MMM"),
        fullDate: format(date, "dd"),
        month: format(date, "MMM"),
        day: format(date, "EEE"),
        isPast: false, // No past dates in this list
      });
    }
    return dates;
  };

  // Generate extended date options for dropdown (same as available dates)
  const generateExtendedDates = () => {
    return generateAvailableDates().map((dateItem) => ({
      ...dateItem,
      label: isToday(dateItem.date)
        ? "Today"
        : isTomorrow(dateItem.date)
          ? "Tomorrow"
          : format(dateItem.date, "EEE, MMM dd"),
      value: dateItem.date.toISOString(),
    }));
  };

  // No week navigation needed - we always show next 7 days from today

  // Generate the dates and other variables
  const availableDates = generateAvailableDates();
  const extendedDates = generateExtendedDates();

  // Generate time slots with 1-hour intervals
  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();

    // Generate slots from 8 AM to 9 PM (1-hour intervals)
    for (let hour = 8; hour <= 21; hour++) {
      const timeString = `${hour.toString().padStart(2, "0")}:00`;
      const displayTime = format(
        new Date(`2000-01-01T${timeString}`),
        "h:mm a",
      );

      // Skip past times for today
      const isDisabled =
        selectedDate && isToday(selectedDate) && hour <= currentHour;

      if (!isDisabled) {
        let period = "Morning";
        if (hour >= 12 && hour < 17) period = "Afternoon";
        if (hour >= 17) period = "Evening";

        slots.push({
          value: displayTime,
          label: displayTime,
          period,
          groupLabel: `${displayTime} (${period})`,
        });
      }
    }

    return slots;
  };

  const availableDates = generateAvailableDates();
  const extendedDates = generateExtendedDates();
  const timeSlots = generateTimeSlots();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Date Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Select Date
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToCurrentWeek}
              className="text-xs px-2 py-1 h-auto"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-xs px-2 py-1 h-auto"
            >
              All Dates
            </Button>
          </div>
        </div>

        {/* Dropdown for extended date selection */}
        {showDropdown && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Choose from next 7 days:
            </Label>
            <Select
              value={selectedDate?.toISOString() || ""}
              onValueChange={(value) => {
                if (value) {
                  onDateChange(new Date(value));
                  setShowDropdown(false);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose any date" />
              </SelectTrigger>
              <SelectContent>
                {extendedDates.map((dateItem) => (
                  <SelectItem key={dateItem.value} value={dateItem.value}>
                    {dateItem.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Available dates (next 7 days) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Available Dates:</Label>
          <div className="grid grid-cols-2 gap-2">
            {availableDates.map((dateItem) => {
              const isSelected =
                selectedDate && isSameDay(dateItem.date, selectedDate);

              return (
                <button
                  key={dateItem.date.toISOString()}
                  type="button"
                  onClick={() => onDateChange(dateItem.date)}
                  className={cn(
                    "p-3 text-center rounded-lg transition-colors text-sm border",
                    isSelected
                      ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                      : "hover:bg-gray-100 border-gray-200 bg-white",
                  )}
                >
                  <div className="font-medium">{dateItem.label}</div>
                  <div className="text-xs mt-1 opacity-75">
                    {dateItem.shortDate}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Time Selection Dropdown */}
      {selectedDate && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Select Time
          </Label>
          <Select value={selectedTime} onValueChange={onTimeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose pickup time" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((slot) => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.groupLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default ProfessionalDateTimePicker;
