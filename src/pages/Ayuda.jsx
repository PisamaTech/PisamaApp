import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircleQuestion,
  CalendarDays,
  BookX,
  FileText,
  UserCircle,
} from "lucide-react";

// --- Contenido de las Preguntas y Respuestas ---
// --- 1. Organiza tus preguntas y respuestas en un objeto de categorías ---
const faqCategories = {
  gestionReservas: {
    title: "Gestión de Reservas",
    icon: <CalendarDays className="h-6 w-6 text-primary" />,
    questions: [
      {
        id: "faq-reservas-1",
        question:
          "¿Cuál es la diferencia entre una reserva EVENTUAL y una FIJA?",
        // Este ya estaba bien, pero lo revisamos por consistencia
        answer: (
          <div>
            <p>
              Una <strong>Reserva Eventual</strong> es para un único día y hora.
              Es perfecta si necesitas un consultorio de forma puntual.
            </p>
            <p className="mt-3">
              Una <strong>Reserva Fija</strong> es una reserva recurrente que se
              crea automáticamente cada semana en el mismo día y horario por un
              período de 4 meses. Es ideal para asegurar tu horario a largo
              plazo con tus pacientes o clientes.
            </p>
          </div>
        ),
      },
      {
        id: "faq-reservas-2",
        question: "¿Puedo agendar más de una hora juntas?",
        answer: (
          <div>
            <p>
              Sí. Para agendar un bloque de varias horas consecutivas,
              simplemente haz clic en la hora de inicio deseada en el calendario
              y, sin soltar el clic, arrastra el cursor hacia abajo hasta cubrir
              todas las horas que necesites.
            </p>
            <p className="mt-4">
              Al soltar el clic, el diálogo de confirmación se abrirá con el
              rango de horas completo que seleccionaste. El sistema calculará
              automáticamente el costo total y los descuentos por volumen si
              aplican.
            </p>
          </div>
        ),
      },
      {
        id: "faq-reservas-3",
        question: "¿Puede agendar una hora a las 13:30, por ejemplo?",
        answer: (
          <div>
            <p>
              Actualmente, el sistema de reservas está configurado para agendar
              en bloques de <strong>horas completas</strong> (ej. 13:00, 14:00,
              15:00).
            </p>
            <p className="mt-4">
              No es posible iniciar una reserva en una fracción de hora como las
              13:30. Si necesitas un horario puntual y especial, por favor,
              contacta directamente con el administrador del espacio.
            </p>
          </div>
        ),
      },
      {
        id: "faq-reservas-4",
        question:
          "¿Tengo que hacer las reservas con anticipación o puedo agendar en el mismo día?",
        answer: (
          <div>
            <p>
              ¡Tienes total flexibilidad! Puedes agendar tus reservas con la
              anticipación que desees o incluso para el mismo día, siempre y
              cuando el horario esté disponible en el calendario.
            </p>
            <p className="mt-4">
              La plataforma te mostrará la disponibilidad en tiempo real. Si un
              horario aparece como libre, puedes reservarlo inmediatamente.
            </p>
          </div>
        ),
      },
      {
        id: "faq-reservas-5",
        question: "¿Cómo es el uso de la camilla dentro del espacio?",
        answer: (
          <div>
            <p>
              La camilla es un recurso compartido y su disponibilidad es
              limitada. Al momento de crear una reserva, encontrarás una opción
              para indicar si necesitarás utilizar la camilla.
            </p>
            <p className="mt-4">
              Si seleccionas "Sí", el sistema verificará que la camilla no esté
              en uso por otro profesional en el mismo edificio durante ese
              horario, aunque sea en un consultorio diferente. Si hay un
              conflicto de camilla, no podrás completar la reserva para ese
              horario y deberás elegir otro.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Actualmente, el uso de la camilla no tiene un costo adicional.
            </p>
          </div>
        ),
      },
      {
        id: "faq-reservas-6",
        question: "¿Cómo puedo renovar una reserva FIJA?",
        answer: (
          <div>
            <p>
              Cuando a tu reserva FIJA de 4 meses le queden 45 días o menos para
              expirar, aparecerá una notificación en tu{" "}
              <strong>Dashboard</strong>. También verás un botón "Renovar" en
              los detalles del evento en el <strong>Calendario</strong>. <br />
              <br />
              Con un solo clic y una confirmación, el sistema validará la
              disponibilidad y extenderá tu serie por 4 meses más, manteniendo
              tu horario asegurado.
            </p>
          </div>
        ),
      },
    ],
  },
  cancelaciones: {
    title: "Cancelaciones y Reagendamientos",
    icon: <BookX className="h-6 w-6 text-primary" />,
    questions: [
      {
        id: "faq-cancel-1",
        question: "¿Cómo funciona la política de cancelación?",
        answer: (
          <div>
            <p>
              Nuestra política busca ser justa para todos. Puedes cancelar
              cualquier reserva sin costo si lo haces con{" "}
              <strong>más de 24 horas de antelación</strong>.
            </p>
            <p className="mt-3">
              Si cancelas con <strong>24 horas o menos de antelación</strong>,
              la reserva se considera "Penalizada", lo que significa que deberás
              pagarla y se incluirá en tu facturación. Sin embargo, no pierdes
              la hora, ya que tienes la opción de reagendarla.
            </p>
          </div>
        ),
      },
      {
        id: "faq-cancel-2",
        question: "¿Cómo cancelo una reserva eventual?",
        answer: (
          <div>
            <p>Puedes cancelar una reserva eventual de dos formas:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>
                <strong>Desde el Calendario:</strong> Haz clic dos veces en la
                reserva que deseas cancelar. Se abrirá una ventana con los
                detalles. Si eres el titular de la reserva, verás un botón para
                cancelarla.
              </li>
              <li>
                <strong>Desde "Mis Reservas":</strong> Ve a la sección "Mis
                Reservas", busca la reserva en la lista y utiliza el menú de
                acciones (...) para seleccionar la opción de "Cancelar Esta
                Reserva".
              </li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Recuerda que se aplicará la política de cancelación de 24 horas.
            </p>
          </div>
        ),
      },
      {
        id: "faq-cancel-3",
        question:
          "¿Puedo cancelar una sola reserva dentro de una serie de reservas fijas?",
        answer: (
          <div>
            <p>
              ¡Sí! Entendemos que a veces necesitas cancelar una sola fecha sin
              perder toda tu serie. Para hacerlo, sigue estos pasos:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Ve al <strong>Calendario</strong> o a{" "}
                <strong>"Mis Reservas"</strong> y selecciona la fecha específica
                que deseas cancelar.
              </li>
              <li>
                En la ventana de detalles, elige la opción{" "}
                <strong>"Cancelar Esta Reserva"</strong>.
              </li>
            </ul>
            <p className="mt-4">
              Esto cancelará únicamente esa instancia, y el resto de tu serie
              fija permanecerá intacta. Esta cancelación individual también está
              sujeta a la política de 24 horas.
            </p>
          </div>
        ),
      },
      {
        id: "faq-cancel-4",
        question: "¿Cómo cancelo una serie de reservas fijas?",
        answer: (
          <div>
            <p>
              Cancelar una reserva fija implica cancelar{" "}
              <strong>toda la serie de reservas</strong> a partir de una fecha.
              Puedes hacerlo desde:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>
                <strong>El Calendario:</strong> Haz clic en cualquiera de las
                reservas de tu serie. En la ventana de detalles, verás un botón
                específico para "Cancelar Serie Completa".
              </li>
              <li>
                <strong>"Mis Reservas":</strong> En la lista, cada reserva de tu
                serie tendrá una opción en el menú de acciones para "Cancelar
                Serie Completa".
              </li>
            </ul>
            <p className="mt-3">Es importante que entiendas cómo funciona:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>
                <strong>
                  La cancelación se aplica desde la fecha que elijas:
                </strong>{" "}
                La serie se cancelará a partir de la instancia de reserva en la
                que hagas clic para iniciar la acción. Por ejemplo, si hoy es 1
                de julio pero seleccionas la reserva del 14 de julio para
                "Cancelar Serie Completa", solo se cancelarán las reservas del
                14 de julio en adelante. Las del 1 y 7 de julio permanecerán
                activas.
              </li>
              <li>
                <strong>
                  La primera reserva afectada está sujeta a la política de 24
                  horas:
                </strong>{" "}
                En el ejemplo anterior, la reserva del 14 de julio es la primera
                en ser cancelada. Si esta cancelación se realiza con menos de 24
                horas de antelación respecto a su fecha y hora, será penalizada.
                El resto de la serie se cancelará sin costo.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "faq-cancel-5",
        question: "¿Cómo reagendo una reserva penalizada?",
        answer: (
          <div>
            <p className="mb-4">
              Cuando cancelas una reserva con menos de 24 horas de antelación,
              esta se marca como <strong>"Penalizada"</strong>. Aunque esta hora
              se incluye en tu facturación, te damos la oportunidad de
              recuperarla reagendándola sin costo adicional. Aquí te explicamos
              cómo hacerlo:
            </p>

            <h4 className="font-semibold text-lg mb-2">
              Paso 1: Encuentra tu Reserva a Reagendar
            </h4>
            <p className="mb-4">
              Tienes dos lugares para encontrar tus reservas elegibles para
              reagendar:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>
                <strong>En tu Dashboard:</strong> Al iniciar sesión, verás una
                tarjeta llamada <strong>"Disponibles para Reagendar"</strong>.
                Allí aparecerá una lista de todas tus reservas penalizadas que
                aún están dentro del plazo para ser reagendadas.
              </li>
              <li>
                <strong>En "Mis Reservas":</strong> En esta sección, puedes
                buscar tus reservas. Las que se puedan reagendar tendrán el
                estado "Penalizada" y un botón de acción disponible.
              </li>
            </ul>
            <p>
              <strong>Recuerda:</strong> Tienes un plazo de{" "}
              <strong>6 días</strong> a partir de la fecha de la reserva
              original para completar el reagendamiento. ¡No dejes que se te
              pase la fecha!
            </p>

            <h4 className="font-semibold text-lg mt-6 mb-2">
              Paso 2: Activa el "Modo Reagendamiento"
            </h4>
            <p className="mb-4">
              Una vez que localices la reserva que quieres reagendar, haz clic
              en el botón <strong>"Reagendar"</strong>. Al hacerlo, sucederán
              dos cosas:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>
                Serás redirigido automáticamente a la vista del{" "}
                <strong>Calendario</strong>.
              </li>
              <li>
                Aparecerá un <strong>banner de notificación naranja</strong> en
                la parte superior de la pantalla. Este banner te confirma que
                has entrado en "Modo Reagendamiento" y te recuerda la fecha de
                la reserva original que estás por reemplazar.
              </li>
            </ul>
            <p>
              Mientras este banner esté visible, cualquier reserva que crees
              será considerada un reagendamiento.
            </p>

            <h4 className="font-semibold text-lg mt-6 mb-2">
              Paso 3: Selecciona tu Nuevo Horario
            </h4>
            <p className="mb-4">
              Ahora, simplemente usa el calendario como lo harías normalmente
              para encontrar un nuevo horario disponible que te convenga. Haz
              clic en el espacio libre que desees reservar.
            </p>

            <h4 className="font-semibold text-lg mt-6 mb-2">
              Paso 4: Confirma tu Reagendamiento
            </h4>
            <p className="mb-4">
              Se abrirá el diálogo de confirmación. Verás que el título y los
              mensajes indicarán que estás{" "}
              <strong>confirmando un reagendamiento</strong>.
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>
                Revisa los detalles de tu <strong>nuevo horario</strong>.
              </li>
              <li>
                Sigue los pasos de confirmación. No se te generará ningún cargo
                nuevo por esta reserva.
              </li>
            </ul>
            <p>
              Una vez confirmado, la nueva reserva se creará con estado "Activa"
              y la reserva penalizada original se marcará como "Reagendada" para
              que no puedas volver a usarla. ¡Y listo! Has recuperado tu hora.
            </p>

            <p className="mt-6 text-sm text-muted-foreground">
              <strong>¿Cambiaste de opinión?</strong> Si entras en "Modo
              Reagendamiento" por error o ya no quieres continuar, simplemente
              haz clic en el botón "Salir del modo" que aparece en el banner
              naranja.
            </p>
          </div>
        ),
      },
      {
        id: "faq-cancel-6",
        question:
          "¿Qué pasa si cancelo una reserva que ya era un reagendamiento?",
        answer: (
          <div>
            <p className="mb-4">
              Puedes cancelar una reserva que creaste como parte de un
              reagendamiento. La forma en que el sistema lo maneja depende de
              con cuánta antelación realices esta nueva cancelación:
            </p>

            <h4 className="font-semibold text-lg mb-2">
              Caso 1: Cancelas con MÁS de 24 horas de antelación
            </h4>
            <p className="mb-4">
              Entendemos que los planes pueden cambiar. Si cancelas tu nueva
              reserva reagendada con más de 24 horas de aviso, el sistema es
              flexible contigo:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>
                La reserva reagendada se marcará como{" "}
                <strong>"Cancelada"</strong> sin ningún costo.
              </li>
              <li>
                La reserva penalizada original se<strong> "reactivará"</strong>.
                Su estado volverá a ser "Penalizada" y podrás volver a intentar
                reagendarla.
              </li>
            </ul>
            <p>
              <strong>Importante:</strong> El plazo original de 6 días para
              reagendar sigue contando. Por ejemplo, si tu reserva original era
              para el día 10 y tenías hasta el día 16 para reagendar, esta
              oportunidad se mantendrá hasta el día 16, sin importar cuándo
              canceles la reserva reagendada.
            </p>

            <h4 className="font-semibold text-lg mt-6 mb-2">
              Caso 2: Cancelas con MENOS de 24 horas de antelación
            </h4>
            <p className="mb-4">
              Si cancelas la reserva reagendada con menos de 24 horas de aviso,
              la oportunidad de reagendamiento para esa hora original se
              considerará utilizada y ya no podrás volver a agendarla.
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>
                La reserva reagendada se marcará como{" "}
                <strong>"Cancelada"</strong>.
              </li>
              <li>
                La reserva penalizada original permanecerá en su estado final
                ("Reagendada") y ya no será elegible para futuras acciones.
              </li>
            </ul>
          </div>
        ),
      },
    ],
  },
  facturacion: {
    title: "Facturación y Pagos",
    icon: <FileText className="h-6 w-6 text-primary" />,
    questions: [
      {
        id: "faq-fact-1",
        question: "¿Cómo se calculan los descuentos en mi factura?",
        answer: (
          <div>
            <p>
              ¡Premiamos tu uso frecuente! Los descuentos se aplican
              automáticamente al precio por hora en tu factura, basados en la
              cantidad total de horas que uses{" "}
              <strong>por semana (de Lunes a Domingo)</strong>:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>
                <strong>4 a 7 horas/semana:</strong> Descuento de $20 por hora.
              </li>
              <li>
                <strong>8 a 11 horas/semana:</strong> Descuento de $40 por hora.
              </li>
              <li>
                <strong>12 o 15 horas/semana:</strong> Descuento de $60 por
                hora.
              </li>
              <li>
                <strong>16 o 19 horas/semana:</strong> Descuento de $80 por
                hora.
              </li>
            </ul>
            <p className="mt-3">
              Puedes ver un estimado de tu gasto y descuentos en tiempo real en
              la sección de <strong>Facturación</strong>.
            </p>
          </div>
        ),
      },
      {
        id: "faq-fact-2",
        question: "¿Cómo pago mis facturas?",
        answer: (
          <div>
            <p className="mb-4">
              El proceso de pago de tus facturas es sencillo. Actualmente, los
              pagos se realizan por transferencia bancaria y la confirmación en
              el sistema se hace de forma manual. Sigue estos pasos:
            </p>

            <h4 className="font-semibold text-lg mb-2">
              Paso 1: Realiza la Transferencia
            </h4>
            <p className="mb-4">
              Puedes abonar el monto total de tu factura a cualquiera de las
              siguientes cuentas. El titular para todas las cuentas es{" "}
              <strong>PABLO GASTÓN CAMPO</strong>.
            </p>

            {/* Usamos una estructura de Card o Divs para organizar bien los datos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border rounded-lg bg-gray-50">
                <h5 className="font-bold text-gray-800">BROU</h5>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>
                    <strong>Nº Cuenta (Nuevo):</strong> 001134168 - 00006
                  </li>
                  <li>
                    <strong>Nº Cuenta (Viejo):</strong> 600-4644377
                  </li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg bg-gray-50">
                <h5 className="font-bold text-gray-800">Mi Dinero</h5>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>
                    <strong>Nº Cuenta:</strong> 9323694
                  </li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg bg-gray-50">
                <h5 className="font-bold text-gray-800">Prex</h5>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>
                    <strong>Nº Cuenta:</strong> 1410588
                  </li>
                </ul>
              </div>
            </div>

            <h4 className="font-semibold text-lg mt-6 mb-2">
              Paso 2: Envía el Comprobante
            </h4>
            <p className="mb-4">
              Una vez realizada la transferencia, es{" "}
              <strong>imprescindible</strong> que nos envíes una captura de
              pantalla o el comprobante de pago a nuestro número de WhatsApp de
              administración.
            </p>

            <h4 className="font-semibold text-lg mt-6 mb-2">
              Paso 3: Verificación y Actualización
            </h4>
            <p>
              Cuando recibamos tu comprobante, verificaremos el pago. Una vez
              corroborado, marcaremos tu factura como <strong>"Pagada"</strong>{" "}
              en la plataforma.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              <strong>Importante:</strong> Ten en cuenta que este proceso no es
              automático y puede demorar unas horas en reflejarse en tu cuenta.
              Podrás ver el estado actualizado de tu factura en la sección{" "}
              <strong>"Facturación"</strong>.
            </p>
          </div>
        ),
      },
    ],
  },
  miCuenta: {
    title: "Mi Cuenta",
    icon: <UserCircle className="h-6 w-6 text-primary" />,
    questions: [
      // Aquí puedes añadir las preguntas sobre la cuenta que te sugerí antes
      {
        id: "faq-cuenta-1",
        question: "¿Cómo cambio mi contraseña?",
        answer: (
          <p>
            Puedes cambiar tu contraseña en cualquier momento desde la sección{" "}
            <strong>'Perfil'</strong>. Encontrarás un apartado específico para
            'Cambiar Contraseña'.
          </p>
        ),
      },
      {
        id: "faq-cuenta-2",
        question: "Olvidé mi contraseña, ¿qué hago?",
        answer: (
          <p>
            En la pantalla de inicio de sesión, haz clic en el enlace
            '¿Olvidaste tu contraseña?'. Te enviaremos un correo con
            instrucciones para restablecerla.
          </p>
        ),
      },
    ],
  },
};

const Ayuda = () => {
  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      <div className="text-center">
        <MessageCircleQuestion className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">Centro de Ayuda</h1>
        <p className="mt-2 text-muted-foreground">
          Encuentra respuestas a las preguntas más comunes, organizadas por
          categoría.
        </p>
      </div>

      <Separator />

      {/* --- 2. Mapea sobre el objeto de categorías para renderizar cada sección --- */}
      <div className="space-y-6">
        {Object.values(faqCategories).map((category, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {category.icon}
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {category.questions.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-base font-semibold">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-12">
        <CardHeader>
          <CardTitle>¿No encontraste tu respuesta?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Si tienes alguna otra duda o un problema técnico, no dudes en
            contactarnos directamente a través de nuestro WhatsApp.
          </p>
          <Button
            asChild
            className="mt-5 bg-[rgb(18,140,126)] hover:bg-[rgb(18,140,126)]/90"
          >
            <a
              href="https://wa.me/59895961360"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contactar por WhatsApp
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ayuda;
