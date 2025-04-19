// kindly borrowed from https://stackoverflow.com/a/2450976 and modified to fit my needs <3

export default function getMultipleRandom<T>(arr: T[], num: number): T[] {
  if (num > arr.length) {
    throw new Error("Requested number of elements exceeds array length.");
  }

  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(0, num);
}
