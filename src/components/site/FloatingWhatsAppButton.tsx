import { BRAND } from "@/config/brand";

const WHATSAPP_MESSAGE =
  "Ol\u00e1, tudo bem? Vindo site e gostaria de saber mais sobre a envPRO";

const buildWhatsAppUrl = () => {
  const params = new URLSearchParams({
    text: WHATSAPP_MESSAGE,
  });

  return `https://wa.me/${BRAND.supportPhoneRaw}?${params.toString()}`;
};

export const FloatingWhatsAppButton = () => {
  return (
    <a
      href={buildWhatsAppUrl()}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp com a envPRO"
      className="fixed right-5 bottom-5 z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#ef3333] text-white shadow-[0_18px_38px_rgba(239,51,51,0.35)] transition-all hover:scale-[1.03] hover:bg-[#d42c2c] focus:outline-none focus:ring-4 focus:ring-[#ef3333]/20 md:right-6 md:bottom-6"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M19.11 17.39c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.31.2-.58.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.58-1.5-1.85-.16-.27-.02-.41.12-.55.12-.12.27-.31.41-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.61-1.47-.84-2.01-.22-.53-.44-.45-.61-.46h-.52c-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.26s.97 2.61 1.11 2.79c.14.18 1.91 2.91 4.62 4.08.65.28 1.16.45 1.55.57.65.21 1.24.18 1.71.11.52-.08 1.6-.65 1.82-1.28.22-.63.22-1.17.16-1.28-.07-.11-.25-.18-.52-.32Z" />
        <path d="M16.01 3.2c-7.07 0-12.8 5.72-12.8 12.78 0 2.24.59 4.43 1.7 6.37L3.1 28.8l6.62-1.73a12.83 12.83 0 0 0 6.29 1.61h.01c7.06 0 12.79-5.72 12.79-12.79 0-3.42-1.33-6.63-3.75-9.05a12.7 12.7 0 0 0-9.05-3.64Zm0 23.33h-.01a10.67 10.67 0 0 1-5.44-1.49l-.39-.23-3.93 1.03 1.05-3.83-.25-.4a10.59 10.59 0 0 1-1.63-5.65c0-5.9 4.8-10.69 10.71-10.69 2.86 0 5.55 1.11 7.57 3.12a10.63 10.63 0 0 1 3.13 7.56c0 5.91-4.81 10.7-10.71 10.7Z" />
      </svg>
    </a>
  );
};
