import { dateTimeToTimestamp } from '../utils/date'

export async function scheduleReminder(reminder) {
  // #ifdef APP-PLUS
  const delay = Math.max(0, Math.round((new Date(reminder.fireAt).getTime() - Date.now()) / 1000))
  if (delay > 0) {
    plus.push.createMessage('有一项任务需要处理', JSON.stringify({ type: 'taskmanage-reminder', id: reminder.id, taskId: reminder.taskId }), {
      title: 'TaskManage 提醒',
      delay,
      sound: 'system',
      cover: true
    })
    return { supported: true }
  }
  // #endif
  return { supported: false }
}

export async function cancelReminder(systemNotificationId) {
  // #ifdef APP-PLUS
  // The standard runtime does not expose a portable cancellation handle for every
  // push provider. Persisted alarms are still removed from the app store; production
  // builds should pair this adapter with the chosen native notification plugin.
  // #endif
  return { supported: Boolean(systemNotificationId) }
}

export const scheduleAlarm = scheduleReminder
export const cancelAlarm = cancelReminder

export function buildAlarmInput(date, time) {
  return { date, time, timestamp: dateTimeToTimestamp(date, time) }
}
