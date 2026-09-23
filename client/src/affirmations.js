export const affirmations = [
  'You can take this one small step at a time.',
  'Your feelings are information, not a verdict.',
  'Rest is part of moving forward.',
  'You deserve patience from yourself today.',
  'Small moments of care still count.',
  'You do not have to solve everything at once.',
  'It is okay to ask for support.',
]

export function dailyAffirmation() {
  const day = Math.floor(Date.now() / 86400000)
  return affirmations[day % affirmations.length]
}
