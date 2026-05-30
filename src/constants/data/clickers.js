export const CLICKER_IDS = {
  LIME: "lime",
  APPLE: "apple",
  BLUEBERRY: "blueberry",
  CHARRIES: "charries",
};

export const CLICKER_ORDER = [
  CLICKER_IDS.LIME,
  CLICKER_IDS.APPLE,
  CLICKER_IDS.BLUEBERRY,
  CLICKER_IDS.CHARRIES,
];

const githubRaw = "https://raw.githubusercontent.com/uh-oh-man/timeline-of-wtf/main";

const makeUpgrade = ({
  id,
  name,
  cost,
  description,
  effects = [],
  maxLevel = null,
  costGrowth = 1.15,
  featureFlags = {},
}) => ({
  id,
  name,
  cost,
  description,
  effects,
  maxLevel,
  costGrowth,
  featureFlags,
});

export const EVENT_FRUIT_ASSETS = {
  lemon: `${githubRaw}/lemon.webp`,
  orange: `${githubRaw}/orange.png`,
  eggplant: `${githubRaw}/Eggplant.png`,
};

export const CLICKERS = [
  {
    id: CLICKER_IDS.LIME,
    name: "Lime Clicker",
    shortName: "Lime",
    currency: "limes",
    singularCurrency: "lime",
    image: `${githubRaw}/lime.png`,
    unlock: { sourceId: null },
    baseClickValue: 1,
    accent: "#a3e635",
    glow: "rgba(163, 230, 53, 0.25)",
    featureFlags: { events: true, ascension: true, multiplayer: true },
    upgrades: [
      makeUpgrade({ id: "betterSqueeze", name: "Better Squeeze", cost: 25, description: "+1 lime per click per level", effects: [{ kind: "clickFlat", value: 1 }] }),
      makeUpgrade({ id: "tinyLimeIntern", name: "Tiny Lime Intern", cost: 50, description: "+0.2 limes/sec per level", effects: [{ kind: "passiveFlat", value: 0.2 }] }),
      makeUpgrade({ id: "limePress", name: "Lime Press", cost: 250, description: "+1.5 limes/sec per level", effects: [{ kind: "passiveFlat", value: 1.5 }] }),
      makeUpgrade({ id: "citrusMotivationalSeminar", name: "Citrus Motivational Seminar", cost: 500, description: "Auto production +10% per level", effects: [{ kind: "passiveMultiplierAdd", value: 0.1 }] }),
      makeUpgrade({ id: "forbiddenZest", name: "Forbidden Zest", cost: 1500, description: "Global production x1.1 per level", effects: [{ kind: "globalMultiplier", value: 1.1 }] }),
      makeUpgrade({ id: "zestGrinder", name: "Zest Grinder", cost: 2500, description: "+5 limes per click per level", effects: [{ kind: "clickFlat", value: 5 }] }),
      makeUpgrade({ id: "citrusUnion", name: "Citrus Union", cost: 7500, description: "Auto production +25% per level", effects: [{ kind: "passiveMultiplierAdd", value: 0.25 }] }),
      makeUpgrade({ id: "limeAssemblyLine", name: "Lime Assembly Line", cost: 15000, description: "+15 limes/sec per level", effects: [{ kind: "passiveFlat", value: 15 }] }),
      makeUpgrade({ id: "sourStockMarket", name: "Sour Stock Market", cost: 50000, description: "Global production x1.2 per level", effects: [{ kind: "globalMultiplier", value: 1.2 }] }),
      makeUpgrade({ id: "fruitTaxLoophole", name: "Fruit Tax Loophole", cost: 75000, description: "Reduces lemon stealing by 5% per level, max 5", maxLevel: 5, effects: [{ kind: "lemonStealReduction", value: 0.05 }] }),
      makeUpgrade({ id: "quantumCitrusTapper", name: "Quantum Citrus Tapper", cost: 100000, description: "Click power x1.25 per level", effects: [{ kind: "clickMultiplier", value: 1.25 }] }),
      makeUpgrade({ id: "orangeNegotiator", name: "Orange Negotiator", cost: 125000, description: "Orange boost +5% and +5 seconds per level", effects: [{ kind: "orangeBoost", value: 0.05, durationBonusMs: 5000 }] }),
      makeUpgrade({ id: "peelDimension", name: "Peel Dimension", cost: 250000, description: "+150 limes/sec per level", effects: [{ kind: "passiveFlat", value: 150 }] }),
      makeUpgrade({ id: "recursiveLimePrinter", name: "Recursive Lime Printer", cost: 1000000, description: "Global production x1.35 per level", effects: [{ kind: "globalMultiplier", value: 1.35 }] }),
      makeUpgrade({ id: "orangeButler", name: "Orange Butler", cost: 2500000, description: "50% chance to auto-click Orange events with mouse animation", maxLevel: 1, effects: [{ kind: "orangeButler", chance: 0.5 }] }),
      makeUpgrade({ id: "limeCallCenter", name: "Lime Call Center", cost: 5000000, description: "+2,500 limes/sec per level", effects: [{ kind: "passiveFlat", value: 2500 }] }),
      makeUpgrade({ id: "lemonExileProtocol", name: "Lemon Exile Protocol", cost: 10000000000, description: "Disables lemons, enables eggplants", maxLevel: 1, effects: [{ kind: "lemonExile" }] }),
      makeUpgrade({ id: "citrusFactoryDistrict", name: "Citrus Factory District", cost: 25000000, description: "+15,000 limes/sec per level", effects: [{ kind: "passiveFlat", value: 15000 }] }),
      makeUpgrade({ id: "limeBasedEconomy", name: "Lime-Based Economy", cost: 100000000, description: "Global production x1.5 per level", effects: [{ kind: "globalMultiplier", value: 1.5 }] }),
      makeUpgrade({ id: "unlockApple", name: "Apple", cost: 100000000, description: "Unlocks Apple Clicker", maxLevel: 1, effects: [{ kind: "unlockClicker", targetId: CLICKER_IDS.APPLE }] }),
      makeUpgrade({ id: "orbPoweredJuicer", name: "Orb-Powered Juicer", cost: 250000000, description: "Click power x2 per level", effects: [{ kind: "clickMultiplier", value: 2 }] }),
      makeUpgrade({ id: "blackMarketZest", name: "Black Market Zest", cost: 1000000000, description: "Global production x2 per level", effects: [{ kind: "globalMultiplier", value: 2 }] }),
      makeUpgrade({ id: "citrusSingularity", name: "Citrus Singularity", cost: 10000000000, description: "Global production x5 per level, max 5", maxLevel: 5, effects: [{ kind: "globalMultiplier", value: 5 }] }),
      makeUpgrade({ id: "limeInflationMachine", name: "Lime Inflation Machine", cost: 50000000000, description: "Auto production +100% per level", effects: [{ kind: "passiveMultiplierAdd", value: 1 }] }),
    ],
  },
  {
    id: CLICKER_IDS.APPLE,
    name: "Apple Clicker",
    shortName: "Apple",
    currency: "apples",
    singularCurrency: "apple",
    image: `${githubRaw}/Apple.png`,
    rareVisualVariants: [
      { id: "minecraftApple", name: "Minecraft Apple", image: `${githubRaw}/Minecraft-Apple.webp`, chance: 0.01 },
    ],
    unlock: { sourceId: CLICKER_IDS.LIME, upgradeId: "unlockApple" },
    baseClickValue: 1,
    accent: "#ef4444",
    glow: "rgba(239, 68, 68, 0.22)",
    featureFlags: { events: true, ascension: true, multiplayer: true },
    upgrades: [
      makeUpgrade({ id: "betterBite", name: "Better Bite", cost: 25, description: "+1 apple per click per level", effects: [{ kind: "clickFlat", value: 1 }] }),
      makeUpgrade({ id: "tinyOrchardGoblin", name: "Tiny Orchard Goblin", cost: 75, description: "+0.1 apples/sec per level", effects: [{ kind: "passiveFlat", value: 0.1 }] }),
      makeUpgrade({ id: "applePress", name: "Apple Press", cost: 350, description: "+1 apples/sec per level", effects: [{ kind: "passiveFlat", value: 1 }] }),
      makeUpgrade({ id: "orchardExpansion", name: "Orchard Expansion", cost: 2500, description: "+25 apples/sec per level", effects: [{ kind: "passiveFlat", value: 25 }] }),
      makeUpgrade({ id: "gravityConsultant", name: "Gravity Consultant", cost: 10000, description: "Click power x1.25 per level", effects: [{ kind: "clickMultiplier", value: 1.25 }] }),
      makeUpgrade({ id: "newtonsLawsuit", name: "Newton's Lawsuit", cost: 50000, description: "Global production x1.5 per level", effects: [{ kind: "globalMultiplier", value: 1.5 }] }),
      makeUpgrade({ id: "forbiddenPieRecipe", name: "Forbidden Pie Recipe", cost: 250000, description: "Global production x2 per level", effects: [{ kind: "globalMultiplier", value: 2 }] }),
      makeUpgrade({ id: "appleSingularity", name: "Apple Singularity", cost: 5000000, description: "Big late-game multiplier", effects: [{ kind: "globalMultiplier", value: 3 }] }),
      makeUpgrade({ id: "orangeButler", name: "Orange Butler", cost: 2500000, description: "50% chance to auto-click Orange events", maxLevel: 1, effects: [{ kind: "orangeButler", chance: 0.5 }] }),
      makeUpgrade({ id: "lemonExileProtocol", name: "Lemon Exile Protocol", cost: 10000000000, description: "Disables lemons, enables eggplants", maxLevel: 1, effects: [{ kind: "lemonExile" }] }),
      makeUpgrade({ id: "unlockBlueberry", name: "Blueberry", cost: 100000000, description: "Unlocks Blueberry Clicker", maxLevel: 1, effects: [{ kind: "unlockClicker", targetId: CLICKER_IDS.BLUEBERRY }] }),
    ],
  },
  {
    id: CLICKER_IDS.BLUEBERRY,
    name: "Blueberry Clicker",
    shortName: "Blueberry",
    currency: "blueberries",
    singularCurrency: "blueberry",
    image: `${githubRaw}/Blueberry.webp`,
    unlock: { sourceId: CLICKER_IDS.APPLE, upgradeId: "unlockBlueberry" },
    baseClickValue: 1,
    accent: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.22)",
    featureFlags: { events: true, ascension: true, multiplayer: true },
    upgrades: [
      makeUpgrade({ id: "betterSquish", name: "Better Squish", cost: 25, description: "+1 blueberry per click per level", effects: [{ kind: "clickFlat", value: 1 }] }),
      makeUpgrade({ id: "tinyBerryPicker", name: "Tiny Berry Picker", cost: 75, description: "+0.15 blueberries/sec per level", effects: [{ kind: "passiveFlat", value: 0.15 }] }),
      makeUpgrade({ id: "basketLogistics", name: "Basket Logistics", cost: 500, description: "+2 blueberries/sec per level", effects: [{ kind: "passiveFlat", value: 2 }] }),
      makeUpgrade({ id: "smoothiePipeline", name: "Smoothie Pipeline", cost: 5000, description: "+20 blueberries/sec per level", effects: [{ kind: "passiveFlat", value: 20 }] }),
      makeUpgrade({ id: "antioxidantHypeMachine", name: "Antioxidant Hype Machine", cost: 25000, description: "Global production x1.15 per level", effects: [{ kind: "globalMultiplier", value: 1.15 }] }),
      makeUpgrade({ id: "berryFarmExpansion", name: "Berry Farm Expansion", cost: 100000, description: "+250 blueberries/sec per level", effects: [{ kind: "passiveFlat", value: 250 }] }),
      makeUpgrade({ id: "blueStainInsurance", name: "Blue Stain Insurance", cost: 250000, description: "Click power x1.3 per level", effects: [{ kind: "clickMultiplier", value: 1.3 }] }),
      makeUpgrade({ id: "forbiddenMuffinLab", name: "Forbidden Muffin Lab", cost: 1000000, description: "Global production x2 per level", effects: [{ kind: "globalMultiplier", value: 2 }] }),
      makeUpgrade({ id: "berrySingularity", name: "Berry Singularity", cost: 25000000, description: "Big late-game multiplier", effects: [{ kind: "globalMultiplier", value: 3.5 }] }),
      makeUpgrade({ id: "orangeButler", name: "Orange Butler", cost: 2500000, description: "50% chance to auto-click Orange events", maxLevel: 1, effects: [{ kind: "orangeButler", chance: 0.5 }] }),
      makeUpgrade({ id: "lemonExileProtocol", name: "Lemon Exile Protocol", cost: 10000000000, description: "Disables lemons, enables eggplants", maxLevel: 1, effects: [{ kind: "lemonExile" }] }),
      makeUpgrade({ id: "unlockCharries", name: "Charries", cost: 100000000, description: "Unlocks Charries Clicker", maxLevel: 1, effects: [{ kind: "unlockClicker", targetId: CLICKER_IDS.CHARRIES }] }),
    ],
  },
  {
    id: CLICKER_IDS.CHARRIES,
    name: "Charries Clicker",
    shortName: "Charries",
    currency: "charries",
    singularCurrency: "charrie",
    image: `${githubRaw}/charries.png`,
    unlock: { sourceId: CLICKER_IDS.BLUEBERRY, upgradeId: "unlockCharries" },
    baseClickValue: 1,
    accent: "#fb7185",
    glow: "rgba(251, 113, 133, 0.24)",
    featureFlags: { events: true, ascension: true, multiplayer: true },
    upgrades: [
      makeUpgrade({ id: "betterPitSpit", name: "Better Pit Spit", cost: 25, description: "+1 charrie per click per level", effects: [{ kind: "clickFlat", value: 1 }] }),
      makeUpgrade({ id: "tinyOrchardGremlin", name: "Tiny Orchard Gremlin", cost: 100, description: "+0.2 charries/sec per level", effects: [{ kind: "passiveFlat", value: 0.2 }] }),
      makeUpgrade({ id: "cherryPickerUnion", name: "Cherry Picker Union", cost: 750, description: "+3 charries/sec per level", effects: [{ kind: "passiveFlat", value: 3 }] }),
      makeUpgrade({ id: "jamPipeline", name: "Jam Pipeline", cost: 7500, description: "+35 charries/sec per level", effects: [{ kind: "passiveFlat", value: 35 }] }),
      makeUpgrade({ id: "redStainInsurance", name: "Red Stain Insurance", cost: 50000, description: "Click power x1.25 per level", effects: [{ kind: "clickMultiplier", value: 1.25 }] }),
      makeUpgrade({ id: "pieFactory", name: "Pie Factory", cost: 250000, description: "+500 charries/sec per level", effects: [{ kind: "passiveFlat", value: 500 }] }),
      makeUpgrade({ id: "suspiciousSmoothieDeal", name: "Suspicious Smoothie Deal", cost: 1000000, description: "Global production x1.5 per level", effects: [{ kind: "globalMultiplier", value: 1.5 }] }),
      makeUpgrade({ id: "charrieSingularity", name: "Charrie Singularity", cost: 50000000, description: "Big late-game multiplier", effects: [{ kind: "globalMultiplier", value: 4 }] }),
      makeUpgrade({ id: "orangeButler", name: "Orange Butler", cost: 2500000, description: "50% chance to auto-click Orange events", maxLevel: 1, effects: [{ kind: "orangeButler", chance: 0.5 }] }),
      makeUpgrade({ id: "lemonExileProtocol", name: "Lemon Exile Protocol", cost: 10000000000, description: "Disables lemons, enables eggplants", maxLevel: 1, effects: [{ kind: "lemonExile" }] }),
    ],
  },
];

export const CLICKER_BY_ID = Object.fromEntries(CLICKERS.map((clicker) => [clicker.id, clicker]));

const CLICKER_DESCRIPTIONS = {
  [CLICKER_IDS.LIME]: "The starter citrus channel. Click limes, buy increasingly questionable lime infrastructure, and use it to unlock Apple.",
  [CLICKER_IDS.APPLE]: "A crisp orchard channel with rare Minecraft Apple visuals. Apples unlock after the lime economy gets wildly out of hand.",
  [CLICKER_IDS.BLUEBERRY]: "A compact berry production channel. Blueberries unlock from Apple and lean into passive pipelines and multipliers.",
  [CLICKER_IDS.CHARRIES]: "The red end of the fruit chain. Charries are intentionally named Charries, and they bring jam pipelines and singularities.",
};

export const COOKIE_CLICKER = {
  id: "cookie-clicker",
  name: "Cookie Clicker",
  shortName: "Cookie",
  type: "iframe",
  image: "/cookie-clicker/img/perfectCookie.png",
  externalUrl: "/cookie-clicker/",
  unlock: "Embedded website",
  unlockLabel: "Embedded website",
  statusText: "Open to start live stats",
  description: "A local embedded copy of Cookie Clicker running inside this site. It is treated as its own separate thing for now.",
  color: "#d6a75c",
  accent: "#d6a75c",
  glow: "rgba(214, 167, 92, 0.24)",
  upgrades: [],
};

export const CLICKER_MENU = [
  ...CLICKERS.map((clicker) => ({
    ...clicker,
    type: "native",
    color: clicker.accent,
    baseCps: 0,
    unlockLabel: clicker.unlock?.sourceId
      ? `Unlocks from ${CLICKER_BY_ID[clicker.unlock.sourceId]?.shortName ?? "previous fruit"}`
      : "Starter clicker",
    description: CLICKER_DESCRIPTIONS[clicker.id],
  })),
  COOKIE_CLICKER,
];

export const CLICKER_MENU_BY_ID = Object.fromEntries(CLICKER_MENU.map((clicker) => [clicker.id, clicker]));
