"use client";

import { useState, useEffect, useRef, memo } from "react";

interface CountdownTimerProps {
  endDate: string;
  className?: string;
}

/**
 * Optimized countdown timer that uses a single interval
 * and memo to prevent unnecessary re-renders of parent components.
 * Only the timer text updates, not the parent.
 */
function CountdownTimerComponent({
  endDate,
  className = "",
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  } | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        ),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        expired: false,
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    intervalRef.current = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      // Stop the interval when expired
      if (newTimeLeft.expired && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [endDate]);

  if (!timeLeft) return null;

  if (timeLeft.expired) {
    return (
      <span className={`text-red-500 text-xs font-medium ${className}`}>
        انتهى العرض
      </span>
    );
  }

  // Format single digits with leading zero
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      <div className="flex items-center gap-0.5 bg-red-500 text-white px-1.5 py-0.5 rounded">
        <span className="font-mono font-bold">{pad(timeLeft.days)}</span>
        <span className="text-[10px] opacity-80">ي</span>
      </div>
      <span className="text-red-500 font-bold">:</span>
      <div className="flex items-center gap-0.5 bg-red-500 text-white px-1.5 py-0.5 rounded">
        <span className="font-mono font-bold">{pad(timeLeft.hours)}</span>
        <span className="text-[10px] opacity-80">س</span>
      </div>
      <span className="text-red-500 font-bold">:</span>
      <div className="flex items-center gap-0.5 bg-red-500 text-white px-1.5 py-0.5 rounded">
        <span className="font-mono font-bold">{pad(timeLeft.minutes)}</span>
        <span className="text-[10px] opacity-80">د</span>
      </div>
      <span className="text-red-500 font-bold">:</span>
      <div className="flex items-center gap-0.5 bg-red-500 text-white px-1.5 py-0.5 rounded">
        <span className="font-mono font-bold">{pad(timeLeft.seconds)}</span>
        <span className="text-[10px] opacity-80">ث</span>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent re-renders
// Only re-renders when endDate changes
export const CountdownTimer = memo(CountdownTimerComponent);
