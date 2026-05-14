import { render } from '@react-email/render';
import { AbandonedCartNotificationEmail } from './src/emails/abandoned-cart-notification';

(async () => {
    const html = await render(AbandonedCartNotificationEmail({
        customerName: "Test User",
        items: [
            {
                productName: "Test Product",
                quantity: 2,
                unitPrice: 100,
                lineTotal: 200,
                imageUrl: "https://placehold.co/80"
            }
        ],
        totalAmount: 200,
        continueShoppingUrl: "https://ladamarketi.com"
    }));
    console.log(html);
})();
