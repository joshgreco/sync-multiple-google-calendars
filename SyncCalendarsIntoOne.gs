const SOURCE_CALENDAR = ""
const TARGET_CALENDAR = ""

const SYNC_DAYS_IN_PAST = 7
const SYNC_DAYS_IN_FUTURE = 30

const ENDPOINT_BASE = "https://www.googleapis.com/calendar/v3/calendars"

function SyncCalendarsIntoOne() {

  const startTime = new Date()
  startTime.setHours(0, 0, 0, 0)
  startTime.setDate(startTime.getDate() - SYNC_DAYS_IN_PAST)

  const endTime = new Date()
  endTime.setHours(0, 0, 0, 0)
  endTime.setDate(endTime.getDate() + SYNC_DAYS_IN_FUTURE + 1)

  const sourceEvents = getEvents(SOURCE_CALENDAR, startTime, endTime)
  const targetEvents = getEvents(TARGET_CALENDAR, startTime, endTime)

  const eventsToUpdate = []
  const eventsToCreate = []
  const eventsToDelete = []

  sourceEvents.items.forEach((sourceEvent) => {

    const targetEvent = targetEvents.items.find((targetEvent) => {
      if (targetEvent.extendedProperties) {
        return targetEvent.extendedProperties.shared.sourceId === sourceEvent.id
      } else {
        return false
      }
    })

    if (targetEvent) {

      targetEvents.items.splice(targetEvents.items.indexOf(targetEvent), 1)

      if (
        (targetEvent.start.dateTime !== sourceEvent.start.dateTime) ||
        (targetEvent.end.dateTime !== sourceEvent.end.dateTime) ||
        (targetEvent.summary !== sourceEvent.summary) ||
        (targetEvent.description !== sourceEvent.description)) {
        eventsToUpdate.push(updateEvent(targetEvent.id, sourceEvent))
      }
    } else {
      eventsToCreate.push(createEvent(sourceEvent))
    }

  })

  targetEvents.items.forEach((targetEvent) => {
    eventsToDelete.push(deleteEvent(targetEvent.id))
  })

  const requests = [...eventsToUpdate, ...eventsToCreate, ...eventsToDelete];

  if (requests.length) {
    const result = new BatchRequest({
      useFetchAll: true,
      batchPath: "batch/calendar/v3",
      requests: requests,
    })
    if (result.length !== requests.length) {
      console.log(result)
    }
    console.log(`${ eventsToUpdate.length } event(s) updated, ${ eventsToCreate.length } event(s) created, and ${ eventsToDelete.length } event(s) deleted between ${startTime} and ${endTime}.`)
  } else {
    console.log("No changes required.")
  }
}

function getEvents(calendarId, startTime, endTime) {
  return Calendar.Events.list(calendarId, {
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  })
}

function updateEvent(eventId, event) {
  return {
    method: "PUT",
    endpoint: `${ENDPOINT_BASE}/${TARGET_CALENDAR}/events/${eventId}`,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end
    }
  }
}

function createEvent(event) {
  return {
    method: "POST",
    endpoint: `${ENDPOINT_BASE}/${TARGET_CALENDAR}/events`,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      extendedProperties: {
        shared: {
          sourceId: event.id
        }
      }
    }
  }
}

function deleteEvent(eventId) {
  return {
    method: "DELETE",
    endpoint: `${ENDPOINT_BASE}/${TARGET_CALENDAR}/events/${eventId}`
  }
}