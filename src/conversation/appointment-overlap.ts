export function appointmentsOverlap(
  firstStartsAt: string,
  firstDurationMinutes: number,
  secondStartsAt: string,
  secondDurationMinutes: number,
) {
  const firstStart = Date.parse(firstStartsAt)
  const secondStart = Date.parse(secondStartsAt)
  const firstEndsAt = firstStart + firstDurationMinutes * 60_000
  const secondEndsAt = secondStart + secondDurationMinutes * 60_000

  return firstStart < secondEndsAt && secondStart < firstEndsAt
}
