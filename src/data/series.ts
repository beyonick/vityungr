// Серии работ. Тексты — черновики от лица Вити, собраны по его подписям в Instagram.
// Годы и места стоит сверить с Витей.

export type Series = {
  slug: string; // совпадает с папкой в src/assets/works/originals/<slug>
  title: string;
  places: string;
  years: string; // может быть пустым
  cover: string; // папка работы-обложки внутри серии
  intro: string;
};

export const series: Series[] = [
  // Не место, а свежие работы: на старом сайте они были только в «Available works». На главную не идёт.
  {
    slug: "new",
    title: "New works",
    places: "Fresh from the easel",
    years: "",
    cover: "fields",
    intro: "The most recent paintings, before they settle into a series of their own.",
  },
  {
    slug: "montenegro",
    title: "Montenegro",
    places: "Budva, Durmitor, Žabljak, Peć",
    years: "2025–26",
    cover: "budva-old-town-2",
    intro:
      "Where I live now. The old town of Budva, the Durmitor mountains, Black Lake and Šiško Lake, and a village in Peć where, according to my friend, everyone is his family. Except for two beekeepers.",
  },
  {
    slug: "serbia",
    title: "Serbia",
    places: "Belgrade, Zemun, Prijepolje",
    years: "2024",
    cover: "view-from-the-gardos-tower",
    intro:
      "A winter in Belgrade: the fortress gates, the Sava river, the first snow on the roofs of Zemun, the view from the Gardoš Tower. And one rainy day in Prijepolje.",
  },
  {
    slug: "turkey",
    title: "Türkiye",
    places: "Istanbul, Antalya",
    years: "2022–23",
    cover: "kuzgunguk-istanbul",
    intro:
      "Months of walking the side streets along the Bosphorus — Arnavutköy, Ortaköy, Kuzguncuk, Bebek — painting wooden houses, steep lanes and the Galata Tower.",
  },
  {
    slug: "bosnia",
    title: "Bosnia and Herzegovina",
    places: "Mostar, Trebinje",
    years: "2025",
    cover: "mostar",
    intro: "Short trips across the border: the old bridge in Mostar, the streets of Trebinje, skiers on a snowy slope.",
  },
  {
    slug: "tempera",
    title: "Tempera",
    places: "Studio works",
    years: "2025",
    cover: "ivy",
    intro:
      "Slow pieces in tempera on canvas, each takes a month or more. This is how I see everything since leaving home: airy, almost bubbly, as if you could blow on it and it would scatter.",
  },
  {
    slug: "altay",
    title: "Altai",
    places: "Biya river, Aktash",
    years: "2022",
    cover: "the-biya-river",
    intro: "A trip to the Altai mountains: the Biya river, larches, and a study at Aktash, 3,038 metres above sea level.",
  },
  {
    slug: "dacha",
    title: "Country house",
    places: "Ruza, Moscow region",
    years: "2021–22",
    cover: "river-in-the-forest",
    intro: "Our country house near Ruza: ponds, birches, April mud and long evenings. A few of these were shown at exhibitions.",
  },
  {
    slug: "moscow",
    title: "Moscow",
    places: "Chertanovo, Kitay-gorod",
    years: "2021–22",
    cover: "march-chertanovo",
    intro: "The city where I studied: Chertanovo courtyards in early spring, and a few small pieces in tempera.",
  },
  {
    slug: "random",
    title: "Travels",
    places: "Tutaev, St Petersburg, the Volga",
    years: "2021–22",
    cover: "volga-river",
    intro: "Short trips before I left: Tutaev on the Volga, Saint Petersburg, and a couple of still lifes in between.",
  },
];

// Серии по-русски: название, места, вступление
export const seriesRu: Record<string, Pick<Series, "title" | "places" | "intro">> = {
  new: {
    title: "Новые работы",
    places: "Только что с мольберта",
    intro: "Самые свежие работы — пока они не стали частью какой-нибудь серии.",
  },
  montenegro: {
    title: "Черногория",
    places: "Будва, Дурмитор, Жабляк, Печ",
    intro:
      "Здесь я живу сейчас. Старый город Будвы, горы Дурмитора, Чёрное озеро и озеро Шишко и деревня в Пече, где, по словам моего друга, все — его родня. Кроме двух пчеловодов.",
  },
  serbia: {
    title: "Сербия",
    places: "Белград, Земун, Приеполье",
    intro:
      "Зима в Белграде: ворота крепости, Сава, первый снег на крышах Земуна, вид с башни Гардош. И один дождливый день в Приеполье.",
  },
  turkey: {
    title: "Турция",
    places: "Стамбул, Анталья",
    intro:
      "Месяцы прогулок по переулкам вдоль Босфора — Арнавуткёй, Ортакёй, Кузгунджук, Бебек: деревянные дома, крутые улочки и Галатская башня.",
  },
  bosnia: {
    title: "Босния и Герцеговина",
    places: "Мостар, Требине",
    intro: "Короткие поездки через границу: старый мост в Мостаре, улицы Требине, лыжники на снежном склоне.",
  },
  tempera: {
    title: "Темпера",
    places: "Работы в мастерской",
    intro:
      "Неторопливые работы темперой на холсте, каждая — месяц или больше. Так я вижу всё с тех пор, как уехал из дома: воздушным, почти пузырчатым, будто подуешь — и всё рассыплется.",
  },
  altay: {
    title: "Алтай",
    places: "Река Бия, Акташ",
    intro: "Поездка в горы Алтая: река Бия, лиственницы и этюд в Акташе, на высоте 3038 метров над уровнем моря.",
  },
  dacha: {
    title: "Дача",
    places: "Руза, Подмосковье",
    intro: "Наша дача под Рузой: пруды, берёзы, апрельская грязь и долгие вечера. Некоторые из этих работ были на выставках.",
  },
  moscow: {
    title: "Москва",
    places: "Чертаново, Китай-город",
    intro: "Город, где я учился: дворы Чертанова ранней весной и несколько небольших работ темперой.",
  },
  random: {
    title: "Поездки",
    places: "Тутаев, Санкт-Петербург, Волга",
    intro: "Короткие поездки до отъезда: Тутаев на Волге, Санкт-Петербург и пара натюрмортов между ними.",
  },
};

/** Название, места и вступление серии на языке страницы */
export function seriesText(s: Series, lang: "en" | "ru"): Pick<Series, "title" | "places" | "intro"> {
  return lang === "ru" && seriesRu[s.slug] ? seriesRu[s.slug] : s;
}

// Истории с пленэра — почти дословно из подписей к постам
export const fieldNotes = [
  {
    work: "originals/montenegro/snowy-landscape-with-a-river",
    title: "Snowy Landscape with a River",
    titleRu: "Снежный пейзаж с рекой",
    place: "Montenegro",
    placeRu: "Черногория",
    text: "Painted this study at −18°C in the mountains.",
    textRu: "Писал этот этюд в горах при −18°C.",
  },
  {
    work: "originals/montenegro/winter-in-the-mountains",
    title: "Winter in the Mountains",
    titleRu: "Зима в горах",
    place: "Montenegro",
    placeRu: "Черногория",
    text: "The people from the nearest house offered me coffee while digging their car out of the snow. They insisted I must visit Dubrovnik.",
    textRu:
      "Люди из ближайшего дома откапывали машину из снега и угостили меня кофе. И настояли, что мне обязательно нужно побывать в Дубровнике.",
  },
  {
    work: "originals/montenegro/northern-montenegro",
    title: "Northern Montenegro",
    titleRu: "Северная Черногория",
    place: "Montenegro",
    placeRu: "Черногория",
    text: "Several cows attacked me while I was painting this.",
    textRu: "Пока я это писал, на меня напали несколько коров.",
  },
  {
    work: "originals/montenegro/pec",
    title: "Peć",
    titleRu: "Печ",
    place: "Montenegro",
    placeRu: "Черногория",
    text: "My friend who lives here says the entire village is his family. Except for two beekeepers.",
    textRu: "Мой друг, который здесь живёт, говорит, что вся деревня — его родня. Кроме двух пчеловодов.",
  },
];

export function seriesBySlug(slug: string): Series {
  const s = series.find((x) => x.slug === slug);
  if (!s) throw new Error(`Series not found: ${slug}`);
  return s;
}
