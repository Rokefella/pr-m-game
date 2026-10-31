export default function WorldPlayerLabel({ username, title }: { username?: string | null; title?: string | null }) {
  if (!username?.trim() && !title?.trim()) return null;
  return <div className="world-player-label font-mono">
    {title?.trim() && <span className="world-player-title">{title}</span>}
    {username?.trim() && <span className="world-player-name">{username}</span>}
  </div>;
}