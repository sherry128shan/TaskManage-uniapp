function pad(value) {
  return String(value).padStart(2, '0')
}

export function todayISO(value = new Date()) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

export function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? new Date(value) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value, options = {}) {
  if (!value) return options.empty || '未设置日期'
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : toDate(value)
  if (!date) return String(value)
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', ...options }).format(date)
}

export function formatDateTime(value, options = {}) {
  const date = toDate(value)
  if (!date) return options.empty || '未设置时间'
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', ...options }).format(date)
}

export function formatTime(value) {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function isoDateAtTime(date, time = '00:00') {
  if (!date) return null
  const value = new Date(`${date}T${time || '00:00'}:00`)
  return Number.isNaN(value.getTime()) ? null : value.toISOString()
}

export function endOfDayISO(date) {
  return isoDateAtTime(date, '23:59')
}

export function datePart(value) {
  const date = toDate(value)
  return date ? todayISO(date) : ''
}

export function timePart(value) {
  const date = toDate(value)
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : ''
}

export function addDaysISO(value, amount) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : toDate(value)
  if (!date) return ''
  date.setDate(date.getDate() + amount)
  return todayISO(date)
}

export function startOfWeekISO(value = new Date()) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : new Date(value)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return todayISO(date)
}

export function dateTimeToTimestamp(date, time) {
  const value = new Date(`${date}T${time}:00`)
  return Number.isNaN(value.getTime()) ? 0 : value.getTime()
}

export function isSameDay(value, date = todayISO()) {
  return datePart(value) === date
}
