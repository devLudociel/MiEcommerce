import StripeProvider from '../checkout/StripeProvider';
import Checkout from './Checkout';

export default function CheckoutWithStripe() {
  return (
    <StripeProvider>
      <Checkout />
    </StripeProvider>
  );
}
