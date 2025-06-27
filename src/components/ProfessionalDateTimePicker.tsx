import React from "react";
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
  // Generate next 7 days including today
  const generateNext7Days = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(new Date(), i);
      return {
        date,
        day: format(date, "EEE"),         // Mon
        fullDate: format(date, "dd"),     // 24
        month: format(date, "MMM"),       // Jun
      };
    });
  };

  // Generate time slots: 8 AM – 9 PM
  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();

    for (let hour = 8; hour <= 21; hour++) {
      const timeString = `${hour.toString().padStart(2, "0")}:00`;
      const displayTime = format(new Date(`2000-01-01T${timeString}`), "h:mm a");

      const isDisabled = selectedDate && isToday(selectedDate) && hour <= currentHour;

      if (!isDisabled) {
        let period = "Morning";
        if (hour >= 12 && hour < 17) period = "Afternoon";
        if (hour >= 17) period = "Evening";

        slots.push({
          value: displayTime,
          label: `${displayTime} (${period})`,
        });
      }
    }

    return slots;
  };

  const next7Days = generateNext7Days();
  const timeSlots = generateTimeSlots();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Date Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Select Date
        </Label>

        {/* Horizontal scroll date buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {next7Days.map((dateItem) => (
            <Button
              key={dateItem.date.toISOString()}
              variant={
                selectedDate && isSameDay(selectedDate, dateItem.date)
                  ? "default"
                  : "outline"
              }
              onClick={() => onDateChange(dateItem.date)}
              className={cn(
                "flex-shrink-0 h-auto flex flex-col items-center justify-center p-3 min-w-[70px] hover:scale-105 transition-transform",
                selectedDate && isSameDay(selectedDate, dateItem.date)
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                  : "hover:border-green-300 hover:bg-green-50",
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
                  {slot.label}
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
