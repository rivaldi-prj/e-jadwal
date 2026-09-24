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

  const currentDay = useMemo(() => {
    return INDONESIAN_DAYS[now.getDay()];
  }, [now]);

  const currentTotalMinutes = useMemo(() => {
    return now.getHours() * 60 + now.getMinutes();
  }, [now]);

  const formattedTime = useMemo(() => {
    return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [now]);

  const formattedDate = useMemo(() => {
    return now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [now]);

  // Find currently active slot based on current time
  const activeSlot = useMemo(() => {
    return TIME_SLOTS.find(slot => {
      const startMin = slot.startH * 60 + slot.startM;
      const endMin = slot.endH * 60 + slot.endM;
      return currentTotalMinutes >= startMin && currentTotalMinutes <= endMin;
    }) || null;
  }, [currentTotalMinutes]);

  // Calculate remaining seconds in current active slot
  const remainingSecondsInSlot = useMemo(() => {
    if (!activeSlot) return 0;
    const endMin = activeSlot.endH * 60 + activeSlot.endM;
    const currentSecondsIntoDay = (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
    const endSecondsIntoDay = endMin * 60;
    return Math.max(0, endSecondsIntoDay - currentSecondsIntoDay);
  }, [activeSlot, now]);

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
