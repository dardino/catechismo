export function getAnnoScolasticoCorrente(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-12
  // dal 1 settembre al 31 agosto
  const start = m >= 9 ? y : y - 1;
  return `${start}-${start + 1}`;
}
