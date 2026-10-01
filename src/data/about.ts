// Тексты «обо мне» на двух языках — общие для главной (home/About, home/Hero) и /contact (AboutStory).
// Приветствие без точек: где нужна точка, её ставит компонент.
import type { Lang } from "../i18n";

const texts = {
  en: {
    label: "About",
    college: "Moscow Academic Art College, 2021",
    hi: "Hi, I’m Viktor",
    callMe: "You can call me Vityungr",
    story: [
      "I was born in Russia and graduated from the Moscow Academic Art College in 2021. In 2022 I moved abroad, and since then I’ve lived in several countries, each with its own nature and culture.",
      "Most of my work is painted outdoors, in rain, heat and −18°C. Larger pieces I finish in the studio, in tempera, and each of them takes a month or more.",
      "Right now I’m based in Montenegro, where I paint, ship my work around the world and collaborate with galleries.",
    ],
    chapters: ["Moscow, 2021", "Outdoors", "Montenegro, now"],
    moscow: "Moscow",
    snowAlt: "Viktor painting at an easel in a snowy forest, wearing a red hood",
    snowCap: "Painting in the snow",
    windowAlt: "Viktor painting by an open window with mountains outside",
    windowCap: "Painting by the window",
    video: "Viktor painting outdoors in a mountain grove, Montenegro",
    reach: "How to reach me",
  },
  ru: {
    label: "Обо мне",
    college: "Московское академическое художественное училище, 2021",
    hi: "Привет, я Виктор",
    callMe: "Можно просто Vityungr",
    story: [
      "Я родился в России и в 2021 году окончил Московское академическое художественное училище. В 2022-м уехал за границу и с тех пор пожил в нескольких странах — у каждой своя природа и своя культура.",
      "Большую часть работ я пишу на пленэре — в дождь, в жару и при −18°C. Крупные вещи заканчиваю в мастерской темперой, и каждая занимает месяц или больше.",
      "Сейчас я живу в Черногории: пишу, отправляю работы по всему миру и сотрудничаю с галереями.",
    ],
    chapters: ["Москва, 2021", "На пленэре", "Черногория, сейчас"],
    moscow: "Москва",
    snowAlt: "Виктор пишет за мольбертом в заснеженном лесу, на нём красный капюшон",
    snowCap: "Этюд в снегу",
    windowAlt: "Виктор пишет у открытого окна, за окном горы",
    windowCap: "За работой у окна",
    video: "Виктор пишет этюд в горной роще, Черногория",
    reach: "Как со мной связаться",
  },
} satisfies Record<Lang, unknown>;

export const aboutText = (lang: Lang) => texts[lang];
