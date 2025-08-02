import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/";
import { Separator } from "@/components/ui/separator";
import { LifeBuoy, MessageCircleQuestion } from "lucide-react";

// --- Contenido de las Preguntas y Respuestas ---
// Puedes modificar o añadir más preguntas aquí fácilmente.
const faqData = [
  {
    id: "faq-1",
    question: "¿Cuál es la diferencia entre una Reserva Eventual y una Fija?",
    // Este ya estaba bien, pero lo revisamos por consistencia
    answer: (
      <div>
        <p>
          Una <strong>Reserva Eventual</strong> es para un único día y hora. Es
          perfecta si necesitas un consultorio de forma esporádica.
        </p>
        <p className="mt-4">
          Una <strong>Reserva Fija</strong> es una reserva recurrente que se
          crea automáticamente cada semana en el mismo día y horario por un
          período de 6 meses. Es ideal para asegurar tu horario a largo plazo
          con tus pacientes o clientes.
        </p>
      </div>
    ),
  },
  {
    id: "faq-2",
    question: "¿Cómo funciona la política de cancelación?",
    answer: (
      <div>
        <p>
          Nuestra política busca ser justa para todos. Puedes cancelar cualquier
          reserva sin costo si lo haces con{" "}
          <strong>más de 24 horas de antelación</strong>.
        </p>
        <p className="mt-4">
          Si cancelas con <strong>24 horas o menos de antelación</strong>, la
          reserva se considera "Penalizada", lo que significa que se incluirá en
          tu facturación. Sin embargo, no pierdes la hora, ya que tienes la
          opción de reagendarla.
        </p>
      </div>
    ),
  },
  {
    id: "faq-3",
    question: "¿Qué es una reserva 'Penalizada' y cómo la reagendo?",
    answer: (
      <div>
        <p>
          Una reserva "Penalizada" ocurre cuando cancelas con menos de 24 horas
          de aviso. Aunque se factura, te damos un "crédito" para usar esa hora
          en otro momento.
        </p>
        <p className="mt-4">
          Tienes{" "}
          <strong>6 días a partir de la fecha de la reserva original</strong>{" "}
          para reagendarla sin costo adicional. Para hacerlo, ve a tu{" "}
          <strong>Dashboard</strong> o a la sección{" "}
          <strong>"Mis Reservas"</strong>. Allí verás un botón "Reagendar" junto
          a las reservas elegibles.
        </p>
      </div>
    ),
  },
  {
    id: "faq-4",
    question: "¿Cómo se calculan los descuentos en mi factura?",
    // --- CORRECCIÓN AQUÍ ---
    // Reemplazamos el <p> envolvente por un <div> (o un fragmento <>)
    answer: (
      <div>
        <p>
          ¡Premiamos tu uso frecuente! Los descuentos se aplican automáticamente
          al precio por hora en tu factura, basados en la cantidad total de
          horas que uses <strong>por semana (de Lunes a Domingo)</strong>:
        </p>
        <ul className="list-disc pl-5 mt-4 space-y-1">
          <li>
            <strong>4 a 7 horas/semana:</strong> Descuento de $20 por hora.
          </li>
          <li>
            <strong>8 a 11 horas/semana:</strong> Descuento de $40 por hora.
          </li>
          <li>
            <strong>12 o más horas/semana:</strong> Descuento de $60 por hora.
          </li>
        </ul>
        <p className="mt-4">
          Puedes ver un estimado de tu gasto y descuentos en tiempo real en la
          sección de <strong>Facturación</strong>.
        </p>
      </div>
    ),
  },
  {
    id: "faq-5",
    question: "¿Cómo puedo renovar mi serie de reservas fijas?",
    answer: (
      <p>
        Cuando a tu serie de 6 meses le queden 45 días o menos para expirar,
        aparecerá una notificación en tu <strong>Dashboard</strong>. También
        verás un botón "Renovar" en los detalles del evento en el{" "}
        <strong>Calendario</strong>. <br />
        <br />
        Con un solo clic y una confirmación, el sistema validará la
        disponibilidad y extenderá tu serie por 6 meses más, manteniendo tu
        horario asegurado.
      </p>
    ),
  },
];

const Ayuda = () => {
  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      <div className="text-center">
        <MessageCircleQuestion className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">Centro de Ayuda</h1>
        <p className="mt-2 text-muted-foreground">
          Aquí encontrarás respuestas a las preguntas más comunes sobre el
          funcionamiento de la plataforma.
        </p>
      </div>

      <Separator />

      <Accordion type="single" collapsible className="w-full">
        {faqData.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id}>
            <AccordionTrigger className="text-left font-semibold">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Card className="mt-12">
        <CardHeader>
          <CardTitle>¿No encontraste tu respuesta?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Si tienes alguna otra duda o un problema técnico, no dudes en
            contactarnos directamente a través de nuestro WhatsApp de soporte.
          </p>
          {/* Opcional: <Button className="mt-4">Contactar por WhatsApp</Button> */}
        </CardContent>
      </Card>
    </div>
  );
};

export default Ayuda;
