// Всё, что можно заказать, для обработчика заявок (public/api/order.php): работы в продаже и принты.
// По id из формы он берёт название, размер, цену и допустимые варианты, а не верит тому, что прислал браузер.
import {
  availablePrints,
  availableWorks,
  formatPrice,
  mediumSize,
  orderId,
  paperOf,
  printId,
  printOptions,
  printPrice,
  printTitle,
  workHref,
} from "../../lib/works";

export function GET() {
  const items = {
    ...Object.fromEntries(
      availableWorks().map((w) => [
        orderId(w),
        { title: w.title, meta: mediumSize(w), price: formatPrice(w.price_eur), href: workHref(w) },
      ]),
    ),
    ...Object.fromEntries(
      availablePrints().map((p) => {
        const options = printOptions(p);
        return [
          printId(p),
          {
            title: printTitle(p),
            meta: paperOf(p),
            price: printPrice(p),
            href: `/prints#${p.kind}`,
            ...(options && { optionName: options.name, options: options.list }),
          },
        ];
      }),
    ),
  };
  return new Response(JSON.stringify(items), { headers: { "Content-Type": "application/json" } });
}
