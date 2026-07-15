/** @param {Record<string, unknown>} profile */
export function profileFormSnapshot(profile) {
  const persisted = { ...profile };
  for (const key of ['steam_api_key', 'netease_music_u', 'github_token', 'wegame_tgp_id', 'wegame_cookie', 'wakatime_api_key']) {
    delete persisted[key];
  }
  persisted.social_links = Array.isArray(persisted.social_links)
    ? persisted.social_links.map((link) => {
        const values = { ...link };
        delete values.id;
        return values;
      })
    : [];
  return JSON.stringify(persisted);
}
