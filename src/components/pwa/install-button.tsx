"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function subscribeDisplayMode(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Android/desktop Chrome fire `beforeinstallprompt`, which we turn into an
 * "Install app" button. iOS Safari has no such event, so we show the
 * Share → Add to Home Screen steps instead.
 */
export function InstallButton() {
  const installed = useSyncExternalStore(subscribeDisplayMode, isStandalone, () => true);
  const ios = useSyncExternalStore(subscribeDisplayMode, isIos, () => false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!deferred && !ios)) return null;

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setShowIosHelp((v) => !v);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={install}
        className="h-9 rounded-lg border border-line bg-card px-3 text-sm font-medium hover:bg-chip"
      >
        Install app
      </button>
      {showIosHelp && (
        <p
          role="status"
          className="absolute right-0 top-11 z-10 w-60 rounded-lg border border-line bg-card p-3 text-xs text-muted shadow-lg"
        >
          Tap the Share button in Safari, then choose <strong className="text-ink">Add to Home Screen</strong>.
        </p>
      )}
    </div>
  );
}
