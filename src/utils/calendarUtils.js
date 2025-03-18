export const mapReservationToEvent = (reserva) => ({
  ...reserva,
  start: new Date(reserva.start_time),
  end: new Date(reserva.end_time),
  resourceId: reserva.consultorio_id,
  tipo: reserva.tipo_reserva,
  status: reserva.estado,
});
