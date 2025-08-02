import AdminDashboardTab from "@/components/admin/AdminDashboardTab";
import BillingManagementTab from "@/components/admin/BillingManagementTab";
import PricingManagementTab from "@/components/admin/PricingManagementTab";
import ReservationsManagementTab from "@/components/admin/ReservationsManagementTab";
import UserManagementTab from "@/components/admin/UserManagementTab";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";

export const Admin = () => {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <p className="text-muted-foreground">
          Gestiona usuarios, reservas, facturación y la configuración general de
          la aplicación.
        </p>
      </div>
      <Separator />

      <Tabs defaultValue="dashboard" className="w-full">
        {/* --- Lista de Pestañas --- */}
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="reservas">Reservas</TabsTrigger>
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
          <TabsTrigger value="precios">Precios</TabsTrigger>
        </TabsList>

        {/* --- Contenido de cada Pestaña --- */}

        {/* Pestaña 1: Dashboard del Admin */}
        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>
                Una vista general de las métricas clave del negocio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <AdminDashboardTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña 2: Gestión de Usuarios */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                Busca, visualiza y modifica los perfiles de los usuarios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <UserManagementTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña 3: Búsqueda de Reservas */}
        <TabsContent value="reservas">
          <Card>
            <CardHeader>
              <CardTitle>Búsqueda de Reservas</CardTitle>
              <CardDescription>
                Encuentra cualquier reserva en el sistema con filtros avanzados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReservationsManagementTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña 4: Gestión de Facturación */}
        <TabsContent value="facturacion">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Facturación</CardTitle>
              <CardDescription>
                Visualiza todas las facturas y gestiona los pagos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <BillingManagementTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña 5: Gestión de Precios */}
        <TabsContent value="precios">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Precios</CardTitle>
              <CardDescription>
                Define y actualiza los precios por hora de los consultorios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingManagementTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
