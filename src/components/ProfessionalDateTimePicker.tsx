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
import { CalendarIcon, Clock } from "lucide-react";
import {
  format,
  addDays,
  isSameDay,
  isToday,
  isTomorrow,
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

  const generateNext7Days = () => {
    const today = new Date();
    const dates = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      dates.push({
        date,
        day: format(date, "EEE"), // Mon
        fullDate: format(date, "dd"), // 23
        month: format(date, "MMM"), // Jun
      });
    }

    return dates;
  };

  const generateExtendedDates = () => {
    const dates = [];
    for (let i = 0; i < 30; i++) {
      const date = addDays(new Date(), i);
      dates.push({
        date,
        label: isToday(date)
          ? "Today"
          : isTomorrow(date)
          ? "Tomorrow"
          : format(date, "EEE, MMM dd"),
        value: date.toISOString(),
      });
    }
    return dates;
  };

  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();

    for (let hour = 8; hour <= 21; hour++) {
      const timeString = `${hour.toString().padStart(2, "0")}:00`;
      const displayTime = format(new Date(`2000-01-01T${timeString}`), "h:mm a");

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

  const weekDates = generateNext7Days();
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
              onClick={() => onDateChange(new Date())}
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

        {showDropdown && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Choose from next 30 days:
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

        {/* Horizontal, evenly spaced 7-day row */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((dateItem) => (
            <Button
              key={dateItem.date.toISOString()}
              variant={
                selectedDate && isSameDay(selectedDate, dateItem.date)
                  ? "default"
                  : "outline"
              }
              onClick={() => onDateChange(dateItem.date)}
              className={cn(
                "flex flex-col items-center justify-center p-3 h-auto",
                selectedDate && isSameDay(selectedDate, dateItem.date)
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                  : "hover:border-green-300 hover:bg-green-50"
              )}
            >
              <span className="text-xs font-medium">{dateItem.day}</span>
              <span className="text-lg font-bold">{dateItem.fullDate}</span>
              <span className="text-xs">{dateItem.month}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Time Selection */}
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
