/** Rule 1: confirmed QA artifacts like "test 490" - kept visible, excluded from aggregates. */
export function isTestRecord(customerName: string): boolean {
  return /^\s*test\s+\d+\s*$/i.test(customerName);
}
