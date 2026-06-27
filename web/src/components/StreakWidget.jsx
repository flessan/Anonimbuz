import React from 'react';

export default function StreakWidget({ streaks }) {
  if (!streaks) return null;
  const { current = 0, longest = 0 } = streaks;
  if (current === 0 && longest === 0) return null;

  const flameCount = Math.min(5, Math.floor(current / 3) + 1);
  const flames = '🔥'.repeat(flameCount);

  return (
    <div className="streak-row">
      {current > 0 && (
        <span className="streak-badge" title={`${current} hari berturut-turut memposting`}>
          {flames} {current} hari streak
        </span>
      )}
      {longest > 0 && (
        <span className="streak-badge-secondary" title="Streak terpanjang">
          🏆 Terpanjang: {longest}h
        </span>
      )}
    </div>
  );
}
