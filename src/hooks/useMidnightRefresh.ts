import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getBrazilNorthDate } from "@/lib/timezone";

/**
 * Hook that detects when midnight occurs in Pará timezone (UTC-3)
 * and invalidates specified query keys to refresh the data.
 */
export const useMidnightRefresh = (queryKeys: string[][]) => {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDateRef = useRef<string>("");
  const [dateKey, setDateKey] = useState(0);

  // Stabilise the keys reference to avoid re-running effects on every render
  const stableKeys = useMemo(() => queryKeys, [JSON.stringify(queryKeys)]);

  const getCurrentDateString = useCallback((): string => {
    const now = getBrazilNorthDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const getMillisecondsUntilMidnight = useCallback((): number => {
    const n = getBrazilNorthDate();
    const hoursLeft = 23 - n.getHours();
    const minutesLeft = 59 - n.getMinutes();
    const secondsLeft = 59 - n.getSeconds();
    const msLeft = 1000 - n.getMilliseconds();
    return (hoursLeft * 3600 + minutesLeft * 60 + secondsLeft) * 1000 + msLeft;
  }, []);

  useEffect(() => {
    lastDateRef.current = getCurrentDateString();

    const invalidate = () => {
      stableKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      setDateKey((prev) => prev + 1);
    };

    const schedule = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const ms = getMillisecondsUntilMidnight();
      timeoutRef.current = setTimeout(() => {
        invalidate();
        lastDateRef.current = getCurrentDateString();
        schedule();
      }, ms + 1000);
    };

    schedule();

    // Check date on visibility change (handles sleep/wake)
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const cur = getCurrentDateString();
      if (lastDateRef.current && lastDateRef.current !== cur) {
        invalidate();
        lastDateRef.current = cur;
        schedule();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    // Periodic fallback every 60s (was 30s — less spam)
    intervalRef.current = setInterval(() => {
      const cur = getCurrentDateString();
      if (lastDateRef.current && lastDateRef.current !== cur) {
        invalidate();
        lastDateRef.current = cur;
        schedule();
      }
    }, 60000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [stableKeys, queryClient, getCurrentDateString, getMillisecondsUntilMidnight]);

  return dateKey;
};

/**
 * Hook specifically for DDS schedule that refreshes at midnight
 */
export const useDDSMidnightRefresh = () => {
  return useMidnightRefresh([
    ["dds-today"],
    ["dds-tomorrow"],
    ["dds-schedule"],
  ]);
};
