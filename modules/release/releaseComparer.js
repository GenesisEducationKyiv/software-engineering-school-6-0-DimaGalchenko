const getMissedReleases = (releases, lastSeenTag) => {
  if (!lastSeenTag) {
    return releases.length > 0 ? [releases[0]] : [];
  }

  const lastSeenIndex = releases.findIndex((r) => r.tagName === lastSeenTag);
  const newReleases =
    lastSeenIndex === -1 ? releases : releases.slice(0, lastSeenIndex);
  return newReleases.reverse();
};

module.exports = { getMissedReleases };
