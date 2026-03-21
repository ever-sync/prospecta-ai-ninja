import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {
    console.info("envPRO PWA pronto para uso offline.");
  },
  onRegisterError(error) {
    console.error("Falha ao registrar o service worker do envPRO:", error);
  },
});
