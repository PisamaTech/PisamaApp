import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui";

/**
 * Un componente reutilizable para mostrar una métrica (KPI) en el dashboard.
 *
 * @param {object} props
 * @param {import('lucide-react').LucideIcon} props.Icon - El icono a mostrar.
 * @param {string} props.title - El título de la tarjeta.
 * @param {string|number} props.value - El valor principal a mostrar.
 * @param {string} [props.footer] - Texto opcional para el pie de la tarjeta.
 * @param {boolean} [props.isLoading] - Si está en estado de carga.
 */
export const StatCard = ({ Icon, title, value, footer, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-32" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mt-1" />
          <Skeleton className="h-3 w-40 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {footer && <p className="text-xs text-muted-foreground">{footer}</p>}
      </CardContent>
    </Card>
  );
};
