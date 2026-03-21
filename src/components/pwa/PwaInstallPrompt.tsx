import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Download, Share2, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "envpro.pwa.install.dismissed-at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 3;

const readDismissal = () => {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;

  const timestamp = Number(raw);
  return Number.isFinite(timestamp) && Date.now() - timestamp < DISMISS_TTL_MS;
};

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

const shouldHideForPath = (pathname: string) =>
  pathname.startsWith("/presentation/") || pathname.startsWith("/form/");

export const PwaInstallPrompt = () => {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => readDismissal());
  const [installed, setInstalled] = useState(() => isStandalone());
  const [isIosFallback, setIsIosFallback] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const safari = /safari/.test(userAgent) && !/crios|fxios|chrome|android/.test(userAgent);
    const mobileViewport = window.matchMedia("(max-width: 1024px)").matches;
    const mobileOs = /iphone|ipad|ipod|android/.test(userAgent);

    setIsMobile(mobileViewport || mobileOs);
    setIsIosFallback(ios && safari && !isStandalone());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (choice.outcome === "accepted") {
      setInstalled(true);
      return;
    }

    dismiss();
  };

  if (installed || dismissed || !isMobile || shouldHideForPath(location.pathname)) {
    return null;
  }

  if (!deferredPrompt && !isIosFallback) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[120] px-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
    >
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-[28px] border border-[#e9e9ee] bg-white/96 p-4 shadow-[0_20px_50px_rgba(16,18,24,0.16)] backdrop-blur">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff1f1] text-[#ef3333]">
          {deferredPrompt ? <Download className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#16161a]">Instale o envPRO no celular</p>
          {deferredPrompt ? (
            <p className="mt-1 text-xs leading-5 text-[#6f6f78]">
              Abra o envPRO como app, com acesso mais rápido pela tela inicial e experiência mais estável no mobile.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-[#6f6f78]">
              No Safari, toque em <Share2 className="mx-1 inline h-3.5 w-3.5 align-[-2px]" /> Compartilhar e depois em
              {" "}Adicionar à Tela de Início.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {deferredPrompt ? (
              <Button size="sm" className="rounded-full" onClick={handleInstall}>
                <Download className="h-3.5 w-3.5" />
                Instalar app
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="rounded-full" onClick={dismiss}>
              Agora não
            </Button>
          </div>
        </div>

        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8a8a94] transition hover:bg-[#f4f4f6] hover:text-[#16161a]"
          onClick={dismiss}
          aria-label="Fechar sugestão de instalação"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
