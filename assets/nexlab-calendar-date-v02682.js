/* Datas civis do NexLab: não interpretar YYYY-MM-DD como meia-noite UTC. */
const TIME_ZONE = 'America/Sao_Paulo';
const dayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});

function civilDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const instant = new Date(value + 'T12:00:00Z');
  return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === value ? value : '';
}

export function nexlabDateKey(value = new Date()) {
  const civil = civilDate(value);
  if (civil !== null) return civil;
  if (value == null || value === '') return '';
  const instant = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(instant.getTime())) return '';
  const parts = Object.fromEntries(dayFormatter.formatToParts(instant).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function nexlabAddCalendarDays(key, days) {
  if (!civilDate(key) || !Number.isInteger(days)) return '';
  const instant = new Date(key + 'T12:00:00Z');
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

export function formatNexlabDate(value, options = {}) {
  const civil = civilDate(value);
  if (civil === '' || value == null || value === '') return '';
  const instant = civil ? new Date(civil + 'T12:00:00Z') : value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(instant.getTime())) return '';
  return instant.toLocaleDateString('pt-BR', { ...options, timeZone: TIME_ZONE });
}
