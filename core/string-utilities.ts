declare global {
  interface String {
    formatted(): string
  }
}

String.prototype.formatted = function (): string {
  return this.replace(/_/g, ' ').replace(
    /(^\w|\s\w)(\S*)/g,
    (_: string, m1: string, m2: string) => m1.toUpperCase() + m2.toLowerCase(),
  )
}

export const formatString = (input: string): string => input.formatted()

export {}
