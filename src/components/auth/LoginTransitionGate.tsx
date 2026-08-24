import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { LoginTransition } from "@/components/auth/LoginTransition";

type TransitionStage = "pending" | "play";

type TransitionPayload = {
  userName?: string;
  userAvatar?: string;
  userCargo?: string;
  destination?: string;
};

const EVENT_NAME = "login-transition";

function readFlag(key: string) {
  return sessionStorage.getItem(key);
}

function readPayload(): TransitionPayload {
  const raw = readFlag("loginTransitionPayload");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as TransitionPayload;
  } catch {
    return {};
  }
}

function readSnapshot() {
  const active = readFlag("loginTransitionInProgress") === "true";
  const stage = (readFlag("loginTransitionStage") as TransitionStage | null) ?? "pending";
  const payload = readPayload();
  return { active, stage, payload };
}

function clearTransitionStorage() {
  sessionStorage.removeItem("loginTransitionInProgress");
  sessionStorage.removeItem("loginTransitionStage");
  sessionStorage.removeItem("loginTransitionPayload");
}

export function LoginTransitionGate() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(() => readSnapshot());

  useEffect(() => {
    const handler = () => setSnapshot(readSnapshot());
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  // Safety: if something goes wrong and we get stuck in pending for too long, unlock.
  useEffect(() => {
    if (!snapshot.active) return;
    const timeout = window.setTimeout(() => {
      const stillActive = sessionStorage.getItem("loginTransitionInProgress") === "true";
      const stage = sessionStorage.getItem("loginTransitionStage");
      if (stillActive && stage === "pending") {
        clearTransitionStorage();
        window.dispatchEvent(new Event(EVENT_NAME));
      }
    }, 10000);
    return () => window.clearTimeout(timeout);
  }, [snapshot.active]);

  const destination = useMemo(() => {
    return snapshot.payload.destination || "/";
  }, [snapshot.payload.destination]);

  if (!snapshot.active) return null;

  if (snapshot.stage !== "play") {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-background/95">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Entrando…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <LoginTransition
        userName={snapshot.payload.userName}
        userAvatar={snapshot.payload.userAvatar}
        userCargo={snapshot.payload.userCargo}
        onComplete={() => {
          clearTransitionStorage();
          navigate(destination, { replace: true });
          window.dispatchEvent(new Event(EVENT_NAME));
        }}
      />
    </div>
  );
}
