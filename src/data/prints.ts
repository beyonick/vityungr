// Варианты принтов со старого сайта (vityungr.website/prints): размер у открытого тиража
// и набор кадров у анимационного Swallow Island. В каталоге их нет. Цены в евро.
export const openSizes = [
  { label: "9 × 12 in (229 × 305 mm)", labelRu: "9 × 12 дюймов (229 × 305 мм)", price: 30 },
  { label: "A3 (297 × 420 mm)", labelRu: "A3 (297 × 420 мм)", price: 40 },
];

export const animationFrames: Record<string, string[]> = {
  "Swallow Island": ["Wide landscape frames", "Close-up frames (crab scenes)"],
};

export const animationFramesRu: Record<string, string[]> = {
  "Swallow Island": ["Широкие пейзажные кадры", "Крупные планы (сцены с крабами)"],
};
