# Nexus Drop Customer Route QA Matrix

The final route review covered the following public customer destinations in the managed preview: Home (`/`), Shop (`/shop`), Jewelry (`/collections/jewelry`), Watches (`/collections/watches`), Eyewear (`/collections/eyewear`), Bags (`/collections/bags`), product detail (`/products/cuban-chain` and `/products/chrono-watch`), Cart (`/cart`), Checkout (`/checkout`), Account (`/account`), Contact / Inquiry (`/contact`), Order Confirmation (`/order-confirmation`), Delivery Policy (`/policies/delivery`), Returns and Refunds (`/policies/returns`), and Terms of Service (`/policies/terms`).

Desktop preview evidence covered the complete route set above in representative batches. Mobile preview evidence covered the responsive header, Home, Contact / Inquiry, Products collection filters, and the Checkout empty state. The application validation suite passed 11 Vitest files with 24 tests, and `pnpm check` passed with no TypeScript errors.

The checkout implementation intentionally exposes only COD, eSewa, and Global IME Bank Transfer. eSewa and Global IME use the cropped verified QR assets; Khalti and FonePay are not displayed because no verified receiver assets were available.

## Checkout payment-state note

The checkout code exposes the three final methods as mutually exclusive buttons: COD, eSewa, and Global IME Bank Transfer. The eSewa and bank instruction branches point to the cropped managed-storage assets, and digital selections reveal the receipt-upload control. The managed screenshot tool can render the empty checkout route but does not provide interaction controls for seeding a cart or selecting a method, so the final payment-state verification is supported by source inspection, the passing Vitest/TypeScript suite, and the responsive route captures rather than an interactive browser recording.

A development-only QA route (`/__qa/checkout?payment=esewa` and `/__qa/checkout?payment=bank`) seeds one catalog item and redirects to the normal checkout flow. Desktop and mobile captures showed the active eSewa state with its cropped QR and receipt upload control, and the active Global IME Bank Transfer state with its cropped bank QR and receipt upload control. The QA route is gated behind `import.meta.env.DEV` and does not alter production navigation.
