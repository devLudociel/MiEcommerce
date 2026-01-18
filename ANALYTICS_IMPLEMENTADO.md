# Analytics Implementation Guide

## Overview

Comprehensive analytics tracking system integrated with **Google Analytics 4 (GA4)** and **Facebook Pixel** for ecommerce conversion tracking, user behavior analysis, and ad campaign optimization.

## Features Implemented

### 1. Google Analytics 4 (GA4) Integration

**File**: `src/lib/analytics/ga4.ts` (250 lines)

**Standard Events**:
- ✅ `initGA4()` - Initialize GA4 tracking
- ✅ `trackPageView()` - Page navigation tracking
- ✅ `trackProductView()` - view_item event (product page views)
- ✅ `trackAddToCart()` - add_to_cart event
- ✅ `trackBeginCheckout()` - begin_checkout event
- ✅ `trackPurchase()` - **purchase event (critical for ecommerce)**
- ✅ `trackSearch()` - Search tracking
- ✅ `trackNewsletterSignup()` - Newsletter conversions
- ✅ `trackUserRegistration()` - User sign-ups

**Custom Events**:
- ✅ `trackDesignCreated()` - When user creates custom design
- ✅ `trackDesignShared()` - When user shares design
- ✅ `trackCustomEvent()` - Generic custom event tracker

### 2. Facebook Pixel Integration

**File**: `src/lib/analytics/facebookPixel.ts` (213 lines)

**Standard Events**:
- ✅ `initFacebookPixel()` - Initialize FB Pixel
- ✅ `trackFBPageView()` - Page view tracking
- ✅ `trackFBProductView()` - ViewContent event
- ✅ `trackFBAddToCart()` - AddToCart event
- ✅ `trackFBInitiateCheckout()` - InitiateCheckout event
- ✅ `trackFBPurchase()` - **Purchase event (critical for FB Ads)**
- ✅ `trackFBSearch()` - Search event
- ✅ `trackFBLead()` - Lead generation event

**Custom Events**:
- ✅ `trackFBCustomizeProduct()` - Product customization started
- ✅ `trackFBShareDesign()` - Design sharing
- ✅ `trackFBCustomEvent()` - Generic custom event

### 3. Unified Analytics API

**File**: `src/lib/analytics/index.ts` (150 lines)

**Benefits**:
- 🔄 **Single API** for both platforms
- 🎯 **Automatic dual tracking** - One function call tracks in both GA4 and FB Pixel
- 🧩 **Individual platform access** - Import `GA4` or `FB` for platform-specific tracking
- 📊 **Consistent data** - Same events in both platforms

**Example Usage**:
```typescript
import { trackPurchase } from '@/lib/analytics';

// Automatically tracks in both GA4 and FB Pixel
trackPurchase({
  id: 'ORDER-123',
  total: 49.99,
  subtotal: 44.99,
  shipping: 5.00,
  tax: 0,
  items: [
    {
      id: 'product-1',
      name: 'Custom Mug',
      price: 14.99,
      quantity: 3,
      category: 'Mugs',
    }
  ],
});
```

### 4. Analytics Component

**File**: `src/components/analytics/Analytics.tsx` (45 lines)

**Purpose**: Client-side initialization of analytics platforms

**Features**:
- ✅ Initializes GA4 and Facebook Pixel on page load
- ✅ Uses environment variables for tracking IDs
- ✅ Client-only rendering (`client:load` directive)
- ✅ Debug logging for verification

**Integrated in**: `BaseLayout.astro:106`

### 5. Environment Variables

**Updated File**: `.env.example`

**New Variables**:
```env
# Google Analytics 4 (GA4)
PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Facebook Pixel
PUBLIC_FACEBOOK_PIXEL_ID=1234567890123456
```

## Architecture

### Tracking Flow

```
User Action → Component
              ↓
         Unified API (index.ts)
              ↓
    ┌─────────┴──────────┐
    ↓                    ↓
  GA4.ts            facebookPixel.ts
    ↓                    ↓
Google Analytics    Facebook Pixel
```

### Enhanced Ecommerce Data

Both platforms receive **consistent ecommerce data**:

**Product Data**:
- `item_id` / `content_ids` - Product ID
- `item_name` / `content_name` - Product name
- `item_category` / `content_category` - Product category
- `price` / `value` - Price
- `quantity` / `num_items` - Quantity

**Purchase Data**:
- `transaction_id` - Order ID
- `value` - Total amount
- `currency` - EUR
- `shipping` - Shipping cost
- `tax` - Tax amount (optional)
- `items` - Array of purchased products

## Integration Guide

### Step 1: Get Tracking IDs

**Google Analytics 4**:
1. Go to https://analytics.google.com
2. Create a GA4 property
3. Copy your Measurement ID (format: `G-XXXXXXXXXX`)

**Facebook Pixel**:
1. Go to https://business.facebook.com/events_manager
2. Create a Pixel
3. Copy your Pixel ID (16-digit number)

### Step 2: Configure Environment Variables

Add to `.env` file:
```env
PUBLIC_GA4_MEASUREMENT_ID=G-YOUR-ACTUAL-ID
PUBLIC_FACEBOOK_PIXEL_ID=1234567890123456
```

### Step 3: Verify Initialization

Check browser console after page load:
```
[Analytics] Initialized { ga4: true, facebook: true }
[GA4] Initialized with ID: G-XXXXXXXXXX
[FB Pixel] Initialized with ID: 1234567890123456
```

### Step 4: Add Tracking to Components

**Product Page Example**:
```typescript
import { trackProductView } from '@/lib/analytics';
import { useEffect } from 'react';

export default function ProductPage({ product }) {
  useEffect(() => {
    trackProductView({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      brand: 'ImprimeArte',
    });
  }, [product]);

  return <div>{/* product UI */}</div>;
}
```

**Add to Cart Example**:
```typescript
import { trackAddToCart } from '@/lib/analytics';

function handleAddToCart() {
  trackAddToCart({
    id: product.id,
    name: product.name,
    price: product.price,
    quantity: 1,
    category: product.category,
  });

  // ... add to cart logic
}
```

**Purchase Example** (after successful checkout):
```typescript
import { trackPurchase } from '@/lib/analytics';

// In Stripe webhook handler or checkout success page
trackPurchase({
  id: order.id,
  total: order.total,
  subtotal: order.subtotal,
  shipping: order.shippingCost,
  tax: order.tax || 0,
  items: order.items,
});
```

**Custom Design Events**:
```typescript
import { trackCustomizeProduct, trackShareDesign } from '@/lib/analytics';

// When user starts customization
trackCustomizeProduct(product.name);

// When user shares design
trackShareDesign(product.name, 'link'); // or 'facebook', 'twitter', etc.
```

## Next Steps (Task 20)

### Components to Add Tracking To:

1. **Product Pages** (`src/pages/productos/[slug].astro`):
   - Track `view_item` when product page loads

2. **Product Grid** (`src/components/products/ProductGrid.tsx`):
   - Track `view_item_list` when category loads

3. **Add to Cart** (`src/components/customizer/DynamicCustomizer.tsx`):
   - Track `add_to_cart` when user adds to cart

4. **Checkout** (`src/components/pages/Checkout.tsx`):
   - Track `begin_checkout` when checkout starts
   - Track `add_shipping_info` when shipping filled
   - Track `add_payment_info` when payment method selected

5. **Order Confirmation** (`src/components/order/OrderConfirmation.tsx`):
   - Track `purchase` event with full order details

6. **Design Customizer** (`src/components/customizer/DynamicCustomizer.tsx`):
   - Track `CustomizeProduct` when customizer opens
   - Track `ShareDesign` when user shares design

7. **Search** (if search component exists):
   - Track `search` event with search term

8. **Newsletter** (`src/components/sections/NewsletterSignup.tsx`):
   - Track `sign_up` event with method: 'newsletter'

## Verification

### GA4 Debug Mode

1. Install [Google Analytics Debugger Chrome Extension](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
2. Open console and see GA4 events in real-time

### Facebook Pixel Helper

1. Install [Facebook Pixel Helper Chrome Extension](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
2. Click extension icon to see events being tracked

### Real-Time Reports

**GA4**:
- Analytics → Reports → Realtime
- See live events as they happen

**Facebook Events Manager**:
- Test Events → Your Pixel ID
- See live events being received

## Benefits

### For Marketing:
- 📊 **Complete conversion funnel** - Track from view to purchase
- 🎯 **Facebook Ads optimization** - Pixel data improves ad targeting
- 📈 **Google Ads integration** - GA4 integrates with Google Ads
- 🔄 **Retargeting audiences** - Build custom audiences based on behavior

### For Analytics:
- 📉 **Drop-off analysis** - Identify where users abandon
- 💰 **Revenue attribution** - Track which sources drive sales
- 🧪 **A/B testing** - Measure impact of design changes
- 📱 **Cross-device tracking** - Unified user journey

### For Business:
- 💵 **ROI measurement** - Calculate ad spend effectiveness
- 🎨 **Design effectiveness** - Track customization completion rates
- 📦 **Product performance** - Best sellers and conversion rates
- 🚀 **Growth metrics** - User acquisition and retention

## Files Created/Modified

### Created:
1. ✅ `src/lib/analytics/ga4.ts` - GA4 implementation
2. ✅ `src/lib/analytics/facebookPixel.ts` - FB Pixel implementation
3. ✅ `src/lib/analytics/index.ts` - Unified API
4. ✅ `src/components/analytics/Analytics.tsx` - Initialization component
5. ✅ `ANALYTICS_IMPLEMENTADO.md` - This documentation

### Modified:
1. ✅ `src/layouts/BaseLayout.astro` - Added Analytics component
2. ✅ `.env.example` - Added tracking ID variables

## TypeScript Support

All functions are **fully typed** with TypeScript interfaces:

```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}

interface Order {
  id: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax?: number;
  items: CartItem[];
}
```

## Privacy & Compliance

### GDPR Considerations:
- Analytics IDs stored in public environment variables
- No PII (Personally Identifiable Information) tracked without consent
- Consider adding cookie consent banner before initializing analytics
- Anonymize IP addresses in GA4 settings

### Data Retention:
- GA4: Configure retention period in Analytics settings
- Facebook: Configure in Events Manager

## Troubleshooting

### Events Not Appearing

**Check**:
1. Environment variables set correctly
2. Browser console for errors
3. Ad blockers disabled
4. Browser DevTools → Network → Filter "google-analytics" or "facebook"

### Console Logs

All tracking functions include debug logs:
```
[GA4] Product view: Custom Mug
[FB Pixel] Add to cart: Custom Mug
[Analytics] Initialized { ga4: true, facebook: false }
```

## Cost

**Google Analytics 4**: FREE
**Facebook Pixel**: FREE

Both are **completely free** analytics platforms with no usage limits for standard ecommerce tracking.

---

**Status**: ✅ Complete infrastructure ready
**Next**: Task 20 - Add tracking calls to components
**After**: Task 17 - Migrate components to React Query
