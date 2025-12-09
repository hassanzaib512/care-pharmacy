const asyncHandler = require('express-async-handler');
const Config = require('../models/Config');

// Helper to fetch season from config; fallback to random default list
const getSeason = asyncHandler(async (req, res) => {
  const defaultSeason = 'winter';
  const conf = await Config.findOne({ key: 'season' });

  let seasonVal = defaultSeason;
  if (conf?.payload) {
    if (typeof conf.payload === 'string') {
      seasonVal = conf.payload.trim().toLowerCase() || defaultSeason;
    } else if (typeof conf.payload === 'object') {
      const candidate =
        conf.payload.season ||
        conf.payload.value ||
        conf.payload.current;
      if (typeof candidate === 'string' && candidate.trim()) {
        seasonVal = candidate.trim().toLowerCase();
      }
    }
  }

  res.json({ season: seasonVal });
});

// Admin update seasons config
const updateSeasons = asyncHandler(async (req, res) => {
  const { seasons = [], current } = req.body;
  if (!Array.isArray(seasons) || !seasons.length) {
    res.status(400);
    throw new Error('seasons array is required');
  }
  const normalized = seasons
    .map((s) => (typeof s === 'string' ? s.trim().toLowerCase() : ''))
    .filter((s) => s);

  const currentSeason =
    typeof current === 'string' && normalized.includes(current.trim().toLowerCase())
      ? current.trim().toLowerCase()
      : normalized[0];

  const updated = await Config.findOneAndUpdate(
    { key: 'seasons_config' },
    {
      key: 'seasons_config',
      payload: { seasons: normalized, current: currentSeason },
    },
    { upsert: true, new: true }
  );

  res.json({ data: updated });
});

module.exports = { getSeason, updateSeasons };
