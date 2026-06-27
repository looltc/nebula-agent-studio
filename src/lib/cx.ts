/**
 * Tiny className joiner — filters falsy values and joins with a space.
 * Use for composing CSS Module classes conditionally.
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
