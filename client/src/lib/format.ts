export function formatNpr(value: number) {
  return `Rs. ${Math.round(value).toLocaleString("en-US")}`;
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" });
}
