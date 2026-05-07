const RARITY_OPTIONS = [
  { id: "heroic", label: "Heroic", image: "assets/rarities/heroic.png" },
  { id: "mythical", label: "Mythical", image: "assets/rarities/mythical.png" },
  { id: "legendary", label: "Legendary", image: "assets/rarities/legendary.png" },
  { id: "epic", label: "Epic", image: "assets/rarities/epic.png" },
  { id: "very-rare", label: "Very Rare", image: "assets/rarities/very-rare.png" },
  { id: "rare", label: "Rare", image: "assets/rarities/rare.png" },
  { id: "common", label: "Common", image: "assets/rarities/common.png" }
];

if (typeof window !== "undefined") {
  window.RARITY_OPTIONS = RARITY_OPTIONS;
}
