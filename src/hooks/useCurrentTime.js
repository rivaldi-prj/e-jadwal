import { useState, useEffect, useMemo } from 'react';
import { TIME_SLOTS, DAYS_OF_WEEK } from '../constants/scheduleConfig';

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute time components strictly in Asia/Jakarta (WIB)
  const { currentDay, currentTotalMinutes, currentSeconds, formattedTime, formattedDate } = useMemo(() => {
    try {
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Jakarta',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const [h, m, s] = timeStr.split(':').map(Number);
      const totalMin = h * 60 + m;

      const day = now.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
      });

      const dateStr = now.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return {
        currentDay: day,
        currentTotalMinutes: totalMin,
        currentSeconds: s,
        formattedTime: `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')} WIB`,
        formattedDate: dateStr,
      };
    } catch {
      // Fallback
      const h = now.getHours();
      const m = now.getMinutes();
      return {
        currentDay: INDONESIAN_DAYS[now.getDay()],
        currentTotalMinutes: h * 60 + m,
        currentSeconds: now.getSeconds(),
        formattedTime: `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')} WIB`,
        formattedDate: now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      };
    }
  }, [now]);

  // Find currently active slot: inclusive start, exclusive end
  const activeSlot = useMemo(() => {
    return TIME_SLOTS.find(slot => {
      const startMin = slot.startH * 60 + slot.startM;
      const endMin = slot.endH * 60 + slot.endM;
      return currentTotalMinutes >= startMin && currentTotalMinutes < endMin;
    }) || null;
  }, [currentTotalMinutes]);

  // Calculate remaining seconds in current active slot
  const remainingSecondsInSlot = useMemo(() => {
    if (!activeSlot) return 0;
    const endMin = activeSlot.endH * 60 + activeSlot.endM;
    const currentSecondsIntoDay = currentTotalMinutes * 60 + currentSeconds;
    const endSecondsIntoDay = endMin * 60;
    return Math.max(0, endSecondsIntoDay - currentSecondsIntoDay);
  }, [activeSlot, currentTotalMinutes, currentSeconds]);

  // Find the next slot today
  const nextSlot = useMemo(() => {
    return TIME_SLOTS.find(slot => {
      const startMin = slot.startH * 60 + slot.startM;
      return startMin > currentTotalMinutes;
    }) || null;
  }, [currentTotalMinutes]);

  const minutesUntilNextSlot = useMemo(() => {
    if (!nextSlot) return null;
    const startMin = nextSlot.startH * 60 + nextSlot.startM;
    return Math.max(0, startMin - currentTotalMinutes);
  }, [nextSlot, currentTotalMinutes]);

  return {
    now,
    currentDay,
    formattedTime,
    formattedDate,
    currentTotalMinutes,
    activeSlot,
    remainingSecondsInSlot,
    nextSlot,
    minutesUntilNextSlot,
  };
}
