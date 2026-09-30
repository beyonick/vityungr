// Серии работ. Тексты — черновики от лица Вити, собраны по его подписям в Instagram.
// Годы и места стоит сверить с Витей.

export type Series = {
  slug: string; // совпадает с папкой в src/assets/works/originals/<slug>
  title: string;
  places: string;
  years: string;
  cover: string; // папка работы-обложки внутри серии
  intro: string;
};

export const series: Series[] = [
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

// Истории с пленэра — почти дословно из подписей к постам
export const fieldNotes = [
  {
    work: "originals/montenegro/snowy-landscape-with-a-river",
    title: "Snowy Landscape with a River",
    place: "Montenegro",
    text: "Painted this study at −18°C in the mountains.",
  },
  {
    work: "originals/montenegro/winter-in-the-mountains",
    title: "Winter in the Mountains",
    place: "Montenegro",
    text: "The people from the nearest house offered me coffee while digging their car out of the snow. They insisted I must visit Dubrovnik.",
  },
  {
    work: "originals/montenegro/northern-montenegro",
    title: "Northern Montenegro",
    place: "Montenegro",
    text: "Several cows attacked me while I was painting this.",
  },
  {
    work: "originals/montenegro/pec",
    title: "Peć",
    place: "Montenegro",
    text: "My friend who lives here says the entire village is his family. Except for two beekeepers.",
  },
];
