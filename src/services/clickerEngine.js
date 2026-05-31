import { APP_ID, SAVE_VERSION } from "../constants/app.js";
import { CLICKER_BY_ID, CLICKER_IDS, CLICKER_ORDER } from "../constants/data/clickers.js";
import { createId, roundCurrency } from "../utils/format.js";

const DEFAULT_SETTINGS = {
  reducedMotion: false,
  compactNumbers: true,
};

export const EVENT_BALANCE = {
  lemonMinHighestEarned: 10_000,
  lemonBaseStealRate: 0.25,
  lemonStealIntervalMs: 2_000,
  lemonMaxStealTicksPerTick: 20,
  lemonDebtMinFloor: 100,
  lemonDebtHighestEarnedRatio: 0.1,
  lemonSpawnChance: 0.18,
  eventSpawnMinDelayMs: 45_000,
  eventSpawnRandomDelayMs: 75_000,
  eggplantBaseChance: 0.015,
  eggplantMaxChance: 0.12,
};

const getNextEventSpawnAt = (now = Date.now(), random = Math.random) =>
  now + EVENT_BALANCE.eventSpawnMinDelayMs + Math.floor(random() * EVENT_BALANCE.eventSpawnRandomDelayMs);

const createEmptyEvents = (now = Date.now()) => ({
  active: [],
  orangeBoosts: {},
  nextSpawnAt: getNextEventSpawnAt(now),
  eggplantIgnoredBonus: 0,
});

const numberOr = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const clone = (value) => structuredClone(value);

export const getClickerConfig = (clickerId) => CLICKER_BY_ID[clickerId] ?? CLICKER_BY_ID[CLICKER_IDS.LIME];

export const getUpgradeConfig = (clickerId, upgradeId) => {
  const config = getClickerConfig(clickerId);
  return config.upgrades.find((upgrade) => upgrade.id === upgradeId) ?? null;
};

export const createInitialClickerProgress = () => ({
  count: 0,
  highestEarned: 0,
  upgrades: {},
  ascensionLevel: 0,
  totalClicks: 0,
  lastClickAt: null,
});

export const createInitialState = (now = Date.now()) => ({
  appId: APP_ID,
  version: SAVE_VERSION,
  createdAt: new Date(now).toISOString(),
  lastUpdated: new Date(now).toISOString(),
  lastPassiveAt: now,
  revision: 0,
  selectedClickerId: CLICKER_IDS.LIME,
  unlockedClickers: { [CLICKER_IDS.LIME]: true },
  clickers: Object.fromEntries(CLICKER_ORDER.map((id) => [id, createInitialClickerProgress()])),
  events: createEmptyEvents(now),
  settings: DEFAULT_SETTINGS,
});

export const sanitizeState = (input, now = Date.now()) => {
  const base = createInitialState(now);
  if (!input || typeof input !== "object") return base;

  const state = {
    ...base,
    ...input,
    appId: APP_ID,
    version: SAVE_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...(input.settings ?? {}) },
    unlockedClickers: { [CLICKER_IDS.LIME]: true, ...(input.unlockedClickers ?? {}) },
    clickers: {},
    events: {
      ...createEmptyEvents(now),
      ...(input.events ?? {}),
      active: Array.isArray(input.events?.active) ? input.events.active : [],
      orangeBoosts: input.events?.orangeBoosts && typeof input.events.orangeBoosts === "object" ? input.events.orangeBoosts : {},
    },
  };

  CLICKER_ORDER.forEach((id) => {
    const saved = input.clickers?.[id] ?? {};
    const config = getClickerConfig(id);
    const progress = createInitialClickerProgress();
    progress.count = roundCurrency(numberOr(saved.count, 0));
    progress.highestEarned = roundCurrency(Math.max(0, numberOr(saved.highestEarned, progress.count)));
    progress.ascensionLevel = Math.max(0, Math.floor(numberOr(saved.ascensionLevel, 0)));
    progress.totalClicks = Math.max(0, Math.floor(numberOr(saved.totalClicks, 0)));
    progress.lastClickAt = saved.lastClickAt ?? null;
    progress.upgrades = {};

    config.upgrades.forEach((upgrade) => {
      const level = Math.max(0, Math.floor(numberOr(saved.upgrades?.[upgrade.id], 0)));
      if (level > 0) {
        progress.upgrades[upgrade.id] = upgrade.maxLevel ? Math.min(level, upgrade.maxLevel) : level;
      }
    });

    state.clickers[id] = progress;
  });

  state.events.active = state.events.active
    .filter((event) => event && typeof event === "object" && CLICKER_BY_ID[event.gameId])
    .map((event) => ({
      id: event.id || createId(event.type || "event"),
      type: ["lemon", "orange", "eggplant"].includes(event.type) ? event.type : "lemon",
      gameId: event.gameId,
      spawnedAt: numberOr(event.spawnedAt, now),
      expiresAt: numberOr(event.expiresAt, now + 30_000),
      nextStealAt: numberOr(event.nextStealAt, now + EVENT_BALANCE.lemonStealIntervalMs),
      autoClicked: Boolean(event.autoClicked),
    }));

  state.lastPassiveAt = numberOr(input.lastPassiveAt, now);
  state.revision = Math.max(0, Math.floor(numberOr(input.revision, 0)));
  if (!state.unlockedClickers[state.selectedClickerId]) state.selectedClickerId = CLICKER_IDS.LIME;
  return state;
};

export const isClickerUnlocked = (state, clickerId) => Boolean(state.unlockedClickers?.[clickerId]);

const updateHighestEarned = (progress) => {
  progress.highestEarned = roundCurrency(Math.max(numberOr(progress.highestEarned, 0), progress.count, 0));
};

const getLemonDebtFloor = (progress) =>
  -Math.max(EVENT_BALANCE.lemonDebtMinFloor, numberOr(progress.highestEarned, 0) * EVENT_BALANCE.lemonDebtHighestEarnedRatio);

export const getUpgradeLevel = (state, clickerId, upgradeId) => Math.max(0, state.clickers?.[clickerId]?.upgrades?.[upgradeId] ?? 0);

export const getAscensionMultiplier = (state, clickerId) => 2 ** Math.max(0, state.clickers?.[clickerId]?.ascensionLevel ?? 0);

export const getUpgradeCostPenalty = (state, clickerId) => 1.15 ** Math.max(0, state.clickers?.[clickerId]?.ascensionLevel ?? 0);

export const getUpgradeCost = (state, clickerId, upgradeId) => {
  const upgrade = getUpgradeConfig(clickerId, upgradeId);
  if (!upgrade) return Infinity;
  const level = getUpgradeLevel(state, clickerId, upgradeId);
  return Math.ceil(upgrade.cost * upgrade.costGrowth ** level * getUpgradeCostPenalty(state, clickerId));
};

export const isUpgradeMaxed = (state, clickerId, upgradeId) => {
  const upgrade = getUpgradeConfig(clickerId, upgradeId);
  if (!upgrade?.maxLevel) return false;
  return getUpgradeLevel(state, clickerId, upgradeId) >= upgrade.maxLevel;
};

export const collectEffects = (state, clickerId) => {
  const config = getClickerConfig(clickerId);
  const effects = [];
  config.upgrades.forEach((upgrade) => {
    const level = getUpgradeLevel(state, clickerId, upgrade.id);
    if (level <= 0) return;
    upgrade.effects.forEach((effect) => effects.push({ ...effect, level, upgradeId: upgrade.id }));
  });
  return effects;
};

export const hasLemonExile = (state, clickerId) => collectEffects(state, clickerId).some((effect) => effect.kind === "lemonExile");

export const hasActiveEggplant = (state, clickerId, now = Date.now()) =>
  state.events.active.some((event) => event.type === "eggplant" && event.gameId === clickerId && event.expiresAt > now);

export const getLemonStealRate = (state, clickerId) => {
  const reduction = collectEffects(state, clickerId)
    .filter((effect) => effect.kind === "lemonStealReduction")
    .reduce((sum, effect) => sum + effect.value * effect.level, 0);
  return Math.max(0, EVENT_BALANCE.lemonBaseStealRate - reduction);
};

export const getOrangeBoostStats = (state, clickerId) => {
  const bonuses = collectEffects(state, clickerId).filter((effect) => effect.kind === "orangeBoost");
  return bonuses.reduce(
    (stats, effect) => ({
      boost: stats.boost + effect.value * effect.level,
      durationMs: stats.durationMs + (effect.durationBonusMs ?? 0) * effect.level,
    }),
    { boost: 0.3, durationMs: 30_000 },
  );
};

export const getOrangeButlerChance = (state, clickerId) => {
  const butler = collectEffects(state, clickerId).find((effect) => effect.kind === "orangeButler");
  return butler ? butler.chance : 0;
};

const getGlobalMultiplier = (state, clickerId) =>
  collectEffects(state, clickerId)
    .filter((effect) => effect.kind === "globalMultiplier")
    .reduce((multiplier, effect) => multiplier * effect.value ** effect.level, 1);

const getClickMultiplier = (state, clickerId) =>
  collectEffects(state, clickerId)
    .filter((effect) => effect.kind === "clickMultiplier")
    .reduce((multiplier, effect) => multiplier * effect.value ** effect.level, 1);

const getPassiveMultiplier = (state, clickerId) => {
  const additive = collectEffects(state, clickerId)
    .filter((effect) => effect.kind === "passiveMultiplierAdd")
    .reduce((sum, effect) => sum + effect.value * effect.level, 0);
  return 1 + additive;
};

export const getActiveOrangeMultiplier = (state, clickerId, now = Date.now()) => {
  const active = state.events.orangeBoosts?.[clickerId];
  if (!active || active.expiresAt <= now) return 1;
  return 1 + numberOr(active.boost, 0.3);
};

export const getClickPower = (state, clickerId, now = Date.now()) => {
  const config = getClickerConfig(clickerId);
  const flat = collectEffects(state, clickerId)
    .filter((effect) => effect.kind === "clickFlat")
    .reduce((sum, effect) => sum + effect.value * effect.level, config.baseClickValue);

  return roundCurrency(
    flat *
      getClickMultiplier(state, clickerId) *
      getGlobalMultiplier(state, clickerId) *
      getAscensionMultiplier(state, clickerId) *
      getActiveOrangeMultiplier(state, clickerId, now),
  );
};

export const getPassiveProduction = (state, clickerId, now = Date.now()) => {
  if (hasActiveEggplant(state, clickerId, now)) return 0;
  const flat = collectEffects(state, clickerId)
    .filter((effect) => effect.kind === "passiveFlat")
    .reduce((sum, effect) => sum + effect.value * effect.level, 0);

  return roundCurrency(
    flat *
      getPassiveMultiplier(state, clickerId) *
      getGlobalMultiplier(state, clickerId) *
      getAscensionMultiplier(state, clickerId) *
      getActiveOrangeMultiplier(state, clickerId, now),
  );
};

export const getTotalPassiveProduction = (state, now = Date.now()) =>
  CLICKER_ORDER.filter((id) => isClickerUnlocked(state, id)).reduce((sum, id) => sum + getPassiveProduction(state, id, now), 0);

export const selectClicker = (state, clickerId) => {
  if (!isClickerUnlocked(state, clickerId)) return state;
  const next = clone(state);
  next.selectedClickerId = clickerId;
  next.revision += 1;
  return next;
};

export const clickFruit = (state, clickerId, amount = 1, now = Date.now()) => {
  if (!isClickerUnlocked(state, clickerId)) return { ok: false, state, message: "That fruit is locked." };
  const next = clone(state);
  const safeAmount = Math.max(1, Math.min(5000, Math.floor(numberOr(amount, 1))));
  const gain = getClickPower(next, clickerId, now) * safeAmount;
  next.clickers[clickerId].count = roundCurrency(next.clickers[clickerId].count + gain);
  updateHighestEarned(next.clickers[clickerId]);
  next.clickers[clickerId].totalClicks += safeAmount;
  next.clickers[clickerId].lastClickAt = new Date(now).toISOString();
  next.lastUpdated = new Date(now).toISOString();
  next.revision += 1;
  return { ok: true, state: next, gain };
};

export const buyUpgrade = (state, clickerId, upgradeId, now = Date.now()) => {
  if (!isClickerUnlocked(state, clickerId)) return { ok: false, state, message: "That fruit is locked." };
  const upgrade = getUpgradeConfig(clickerId, upgradeId);
  if (!upgrade) return { ok: false, state, message: "Unknown upgrade." };
  if (isUpgradeMaxed(state, clickerId, upgradeId)) return { ok: false, state, message: "Upgrade is already maxed." };

  const cost = getUpgradeCost(state, clickerId, upgradeId);
  const currentCount = state.clickers[clickerId].count;
  if (currentCount < cost) return { ok: false, state, message: `Need ${cost.toLocaleString()} ${getClickerConfig(clickerId).currency}.` };

  const next = clone(state);
  next.clickers[clickerId].count = roundCurrency(currentCount - cost);
  next.clickers[clickerId].upgrades[upgradeId] = getUpgradeLevel(next, clickerId, upgradeId) + 1;

  upgrade.effects.forEach((effect) => {
    if (effect.kind === "unlockClicker") {
      next.unlockedClickers[effect.targetId] = true;
      next.selectedClickerId = effect.targetId;
    }
  });

  next.lastUpdated = new Date(now).toISOString();
  next.revision += 1;
  return { ok: true, state: next, cost, upgrade };
};

export const activateFruitEvent = (state, eventId, now = Date.now()) => {
  const event = state.events.active.find((activeEvent) => activeEvent.id === eventId);
  if (!event) return { ok: false, state, message: "Event is no longer active." };

  const next = clone(state);
  next.events.active = next.events.active.filter((activeEvent) => activeEvent.id !== eventId);

  if (event.type === "orange") {
    const stats = getOrangeBoostStats(next, event.gameId);
    next.events.orangeBoosts[event.gameId] = {
      boost: stats.boost,
      expiresAt: now + stats.durationMs,
      activatedAt: now,
    };
  }

  next.lastUpdated = new Date(now).toISOString();
  next.revision += 1;
  return { ok: true, state: next, event };
};

export const canAscend = (state) => Boolean(state.unlockedClickers[CLICKER_IDS.APPLE]);

export const ascendFruit = (state, clickerId, now = Date.now()) => {
  if (!canAscend(state)) return { ok: false, state, message: "Ascension unlocks after Apple is unlocked." };
  if (!isClickerUnlocked(state, clickerId)) return { ok: false, state, message: "Only unlocked fruits can ascend." };

  const unlockedClickers = { ...state.unlockedClickers };
  const ascensionLevels = Object.fromEntries(
    CLICKER_ORDER.map((id) => [id, Math.max(0, state.clickers[id]?.ascensionLevel ?? 0) + (id === clickerId ? 1 : 0)]),
  );

  const next = createInitialState(now);
  next.unlockedClickers = unlockedClickers;
  next.selectedClickerId = clickerId;
  CLICKER_ORDER.forEach((id) => {
    next.clickers[id].ascensionLevel = ascensionLevels[id];
  });
  next.createdAt = state.createdAt;
  next.revision = state.revision + 1;
  return { ok: true, state: next };
};

const cleanupExpiredEvents = (state, now) => {
  const keptEvents = [];
  state.events.active.forEach((event) => {
    if (event.expiresAt > now) {
      keptEvents.push(event);
      return;
    }
    if (event.type === "eggplant") {
      state.events.eggplantIgnoredBonus = roundCurrency((state.events.eggplantIgnoredBonus ?? 0) + 0.01);
    }
  });
  state.events.active = keptEvents;

  Object.entries(state.events.orangeBoosts ?? {}).forEach(([clickerId, boost]) => {
    if (!boost || boost.expiresAt <= now) delete state.events.orangeBoosts[clickerId];
  });
};

const processLemonSteals = (state, now) => {
  state.events.active = state.events.active.map((event) => {
    if (event.type !== "lemon" || event.expiresAt <= now) return event;
    const rate = getLemonStealRate(state, event.gameId);
    let nextStealAt = event.nextStealAt;
    let ticks = 0;
    while (nextStealAt <= now && ticks < EVENT_BALANCE.lemonMaxStealTicksPerTick) {
      ticks += 1;
      nextStealAt += EVENT_BALANCE.lemonStealIntervalMs;
    }
    if (ticks > 0 && rate > 0) {
      const progress = state.clickers[event.gameId];
      const debtFloor = getLemonDebtFloor(progress);

      for (let i = 0; i < ticks; i += 1) {
        if (progress.count <= debtFloor) break;
        const steal = progress.count > 0 ? Math.max(progress.count * rate, 1) : Math.max(Math.abs(progress.count) * rate, 1);
        progress.count = roundCurrency(Math.max(debtFloor, progress.count - steal));
      }
    }
    return { ...event, nextStealAt };
  });
};

const scheduleNextSpawn = (state, now) => {
  state.events.nextSpawnAt = getNextEventSpawnAt(now);
};

const spawnEvent = (state, clickerId, now, random = Math.random) => {
  if (!isClickerUnlocked(state, clickerId)) return;
  const activeForClicker = state.events.active.filter((event) => event.gameId === clickerId);
  if (activeForClicker.length >= 2) return;

  const exile = hasLemonExile(state, clickerId);
  const roll = random();
  let type;

  if (exile) {
    const eggplantChance = Math.min(EVENT_BALANCE.eggplantMaxChance, EVENT_BALANCE.eggplantBaseChance + (state.events.eggplantIgnoredBonus ?? 0));
    type = roll < eggplantChance ? "eggplant" : "orange";
  } else {
    const progress = state.clickers[clickerId];
    const canSpawnLemon = numberOr(progress.highestEarned, 0) >= EVENT_BALANCE.lemonMinHighestEarned;
    type = canSpawnLemon && roll < EVENT_BALANCE.lemonSpawnChance ? "lemon" : "orange";
  }

  const event = {
    id: createId(type),
    type,
    gameId: clickerId,
    spawnedAt: now,
    expiresAt: now + (type === "eggplant" ? 60_000 : 30_000),
    nextStealAt: now + EVENT_BALANCE.lemonStealIntervalMs,
    autoClicked: false,
  };

  if (type === "orange") {
    const chance = getOrangeButlerChance(state, clickerId);
    if (chance > 0 && random() < chance) {
      const stats = getOrangeBoostStats(state, clickerId);
      state.events.orangeBoosts[clickerId] = {
        boost: stats.boost,
        expiresAt: now + stats.durationMs,
        activatedAt: now,
        autoClicked: true,
      };
      return;
    }
  }

  state.events.active.push(event);
};

export const applyGameTick = (state, options = {}) => {
  const now = options.now ?? Date.now();
  const allowSpawns = options.allowSpawns ?? true;
  const random = options.random ?? Math.random;
  const selectedClickerId = options.selectedClickerId ?? state.selectedClickerId;
  const next = clone(state);
  const elapsedSeconds = Math.max(0, Math.min(10, (now - numberOr(next.lastPassiveAt, now)) / 1000));

  if (elapsedSeconds > 0) {
    CLICKER_ORDER.forEach((id) => {
      if (!isClickerUnlocked(next, id)) return;
      const passive = getPassiveProduction(next, id, now);
      if (passive > 0) {
        next.clickers[id].count = roundCurrency(next.clickers[id].count + passive * elapsedSeconds);
        updateHighestEarned(next.clickers[id]);
      }
    });
  }

  processLemonSteals(next, now);
  cleanupExpiredEvents(next, now);

  if (allowSpawns && now >= numberOr(next.events.nextSpawnAt, now + EVENT_BALANCE.eventSpawnMinDelayMs)) {
    spawnEvent(next, selectedClickerId, now, random);
    scheduleNextSpawn(next, now);
  }

  next.lastPassiveAt = now;
  next.lastUpdated = new Date(now).toISOString();
  if (elapsedSeconds > 0) next.revision += 1;
  return next;
};

export const resetEvents = (state, now = Date.now()) => {
  const next = clone(state);
  next.events = createEmptyEvents(now);
  next.lastUpdated = new Date(now).toISOString();
  next.revision += 1;
  return next;
};

export const getSerializableState = (state) => sanitizeState(state, Date.now());
