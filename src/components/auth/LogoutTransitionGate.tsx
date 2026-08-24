import { useEffect, useState } from "react";
import { LogoutTransition } from "@/components/auth/LogoutTransition";

type LogoutPayload = {
  userName?: string;
  userAvatar?: string;
  userCargo?: string;
  reason?: "manual" | "timeout";
};

const EVENT_NAME = "logout-transition";

function readFlag(key: string) {
  return sessionStorage.getItem(key);
}

function readPayload(): LogoutPayload {
  const raw = readFlag("logoutTransitionPayload");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as LogoutPayload;
  } catch {
    return {};
  }
}

function readSnapshot() {
  const active = readFlag("logoutTransitionInProgress") === "true";
  const payload = readPayload();
  return { active, payload };
}

function clearTransitionStorage() {
  sessionStorage.removeItem("logoutTransitionInProgress");
  sessionStorage.removeItem("logoutTransitionPayload");
}

export function LogoutTransitionGate() {
  const [snapshot, setSnapshot] = useState(() => readSnapshot());

  useEffect(() => {
    const handler = () => {
      setSnapshot(readSnapshot());
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  // Safety timeout - if stuck for more than 10 seconds, force complete
  useEffect(() => {
    if (!snapshot.active) return;
    const timeout = window.setTimeout(() => {
      const stillActive = sessionStorage.getItem("logoutTransitionInProgress") === "true";
      if (stillActive) {
        clearTransitionStorage();
        window.dispatchEvent(new Event(EVENT_NAME));
        window.location.replace("/auth");
      }
    }, 10000);
    return () => window.clearTimeout(timeout);
  }, [snapshot.active]);

  if (!snapshot.active) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[20000]">
      <LogoutTransition
        userName={snapshot.payload.userName}
        userAvatar={snapshot.payload.userAvatar}
        userCargo={snapshot.payload.userCargo}
        reason={snapshot.payload.reason || "manual"}
        onComplete={() => {
          clearTransitionStorage();
          window.dispatchEvent(new Event(EVENT_NAME));
          window.location.replace("/auth");
        }}
      />
    </div>
  );
}
