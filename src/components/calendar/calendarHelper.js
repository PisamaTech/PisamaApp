import dayjs from "dayjs";

export const isSameSlot = (
  date1,
  date2,
  resource1,
  resource2,
  unit = "minute"
) => {
  return dayjs(date1).isSame(dayjs(date2), unit) && resource1 === resource2;
};

export const generateHourlyEvents = (reservationData) => {
  const { start, end, ...rest } = reservationData;
  const durationHours = dayjs(end).diff(dayjs(start), "hour");

  return Array.from({ length: durationHours }).map((_, i) => {
    const eventStart = dayjs(start).add(i, "hour");
    return {
      ...rest,
      start: eventStart.toDate(),
      end: eventStart.add(1, "hour").toDate(),
    };
  });
};
