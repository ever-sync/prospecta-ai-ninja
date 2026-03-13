

## Problem

The `SendPresentationDialog` component sends WhatsApp links without the `55` (Brazil) country code prefix. The phone number `1233075678` should be `551233075678`.

This was already fixed in `Campaigns.tsx` but not in the individual send dialog.

## Fix

**File: `src/components/SendPresentationDialog.tsx`** (lines 27-35)

Update the `sendWhatsApp` function to add the `55` prefix if not already present:

```typescript
const sendWhatsApp = () => {
  const phone = businessPhone?.replace(/\D/g, '') || '';
  const fullPhone = phone && (phone.startsWith('55') ? phone : `55${phone}`);
  const message = encodeURIComponent(
    `Olá! Preparamos uma análise completa do site da ${businessName}. Confira: ${publicUrl}`
  );
  const url = fullPhone
    ? `https://wa.me/${fullPhone}?text=${message}`
    : `https://wa.me/?text=${message}`;
  window.open(url, '_blank');
};
```

Single line change — adds the same country code logic already used in `Campaigns.tsx`.

