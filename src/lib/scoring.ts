/**
 * Mirror of the server-side scoring function (003_scoring_and_leaderboard.sql).
 * Used for client-side display only — points_awarded is always computed
 * server-side and stored in the database, so this cannot affect game state.
 */
export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number | null,
  actualAway: number | null
): number | null {
  if (actualHome === null || actualAway === null) return null;

  if (predictedHome === actualHome && predictedAway === actualAway) return 5;

  let pts = 0;

  const winnerCorrect =
    (predictedHome > predictedAway && actualHome > actualAway) ||
    (predictedHome < predictedAway && actualHome < actualAway) ||
    (predictedHome === predictedAway && actualHome === actualAway);
  if (winnerCorrect) pts += 2;

  if (predictedHome === actualHome || predictedAway === actualAway) pts += 1;

  return pts;
}
