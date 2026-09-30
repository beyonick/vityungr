// Список работ в продаже для обработчика заявок (public/api/order.php):
// по id из формы он берёт название, размер и цену, а не верит тому, что прислал браузер.
import { availableWorks, formatPrice, mediumSize, orderId, workHref } from "../../lib/works";

export function GET() {
  const works = Object.fromEntries(
    availableWorks().map((w) => [
      orderId(w),
      { title: w.title, meta: mediumSize(w), price: formatPrice(w.price_eur), href: workHref(w) },
    ]),
  );
  return new Response(JSON.stringify(works), { headers: { "Content-Type": "application/json" } });
}
