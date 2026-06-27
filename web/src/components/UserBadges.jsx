import React from 'react';

// Badge definitions - awarded automatically based on user stats
// Each badge has: id, label, icon, className, condition(user, stats)
const BADGE_DEFS = [
  {
    id: 'newcomer',
    label: 'Pendatang Baru',
    icon: '🌱',
    className: 'badge-newcomer',
    condition: (stats) => stats.postsCount >= 1,
  },
  {
    id: 'contributor',
    label: 'Kontributor',
    icon: '✍️',
    className: 'badge-contributor',
    condition: (stats) => stats.postsCount >= 10,
  },
  {
    id: 'storyteller',
    label: 'Pencerita',
    icon: '📖',
    className: 'badge-storyteller',
    condition: (stats) => stats.postsCount >= 50,
  },
  {
    id: 'veteran',
    label: 'Veteran',
    icon: '🏆',
    className: 'badge-veteran',
    condition: (stats) => stats.postsCount >= 200,
  },
  {
    id: 'legend',
    label: 'Legenda',
    icon: '⭐',
    className: 'badge-legend',
    condition: (stats) => stats.postsCount >= 500,
  },
  {
    id: 'popular',
    label: 'Populer',
    icon: '🔥',
    className: 'badge-popular',
    condition: (stats) => stats.followersCount >= 50,
  },
  {
    id: 'social',
    label: 'Sosialita',
    icon: '🌐',
    className: 'badge-social',
    condition: (stats) => stats.followersCount >= 200,
  },
  {
    id: 'streak',
    label: 'Konsisten',
    icon: '⚡',
    className: 'badge-streak',
    condition: (stats, streaks) => (streaks?.longest || 0) >= 7,
  },
];

export default function UserBadges({ profile }) {
  if (!profile) return null;

  const stats = {
    postsCount: profile.postsCount || profile.stats?.postsCount || 0,
    followersCount: profile.followersCount || profile.stats?.followersCount || 0,
  };
  const streaks = profile.streaks || {};

  const earnedBadges = BADGE_DEFS.filter(b => b.condition(stats, streaks));

  if (earnedBadges.length === 0) return null;

  return (
    <div className="user-badges-row" title="Lencana yang diperoleh berdasarkan pencapaian">
      {earnedBadges.map(badge => (
        <span
          key={badge.id}
          className={`user-badge ${badge.className}`}
          title={badge.label}
        >
          {badge.icon} {badge.label}
        </span>
      ))}
    </div>
  );
}
