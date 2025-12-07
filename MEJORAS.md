# Plan de Mejoras - PisamaApp

**Fecha de creación**: 2025-12-03
**Fuente**: Análisis completo del codebase por Claude Code

Este documento contiene un plan detallado de mejoras prioritizadas para PisamaApp. Marca las tareas completadas con `[x]`.

---

## 🔴 PRIORIDAD ALTA - Crítico

### 1. Testing ✅ COMPLETADO
**Impacto**: Alto | **Esfuerzo**: Alto | **Sprint**: 1

- [x] Instalar y configurar Vitest
  ```bash
  npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
  ```
- [x] Crear configuración de Vitest (`vitest.config.js`)
- [x] Agregar scripts de testing en `package.json`
- [x] Tests para lógica de reservas:
  - [x] `checkForConflicts` - detección de conflictos
  - [x] `generateRecurringEvents` - generación de eventos recurrentes
  - [x] `generateRecurringEventsForRenewal` - renovación de series
  - [x] `mapEventsToReservations` - transformación de eventos
  - [x] `mapReservationToEvent` - transformación de reservas
- [ ] Tests para cálculo de penalizaciones:
  - [ ] Lógica de `cancelBooking` con diferentes escenarios
  - [ ] Cálculo de `permite_reagendar_hasta`
- [x] Tests para validaciones Zod:
  - [x] `registrationSchema`
  - [x] `loginSchema`
  - [x] `profileSchema`
  - [x] `passwordSchema`
  - [x] `reservationSchema`
- [x] Tests para Zustand stores:
  - [x] `authStore` - login, logout, checkSession, signUp (11 tests - algunos con errores de mocking)
  - [x] `uiStore` - loading states, toasts, reagendamiento mode (17 tests - todos pasando)
  - [x] `calendarStore` - fetchEventsByWeek, loadInitialEvents, CRUD operations (14 tests - algunos con errores de mocking)
- [x] Tests de componentes críticos:
  - [x] `AdminRouteGuard` (6 tests - todos pasando)
  - [ ] `ReservationDialog` (pendiente)
  - [ ] `CalendarSemanal` (pendiente)
- [x] Configurar coverage mínimo (objetivo: 70%+)

**Resultados actuales:**
- ✅ **92 tests totales - 92 pasando (100% success rate)**
- ✅ Issues de mocking corregidos con vi.hoisted()
- ✅ Coverage configurado con threshold de 70%
- ✅ Scripts: `npm test`, `npm run test:watch`, `npm run test:ui`, `npm run test:coverage`

**Tests implementados:**
- ✅ 25 tests de validaciones Zod (100% passing)
- ✅ 13 tests de utils/calendarUtils (100% passing)
- ✅ 17 tests de uiStore (100% passing)
- ✅ 6 tests de AdminRouteGuard (100% passing)
- ✅ 13 tests de authStore (100% passing - mocking refinado)
- ✅ 18 tests de calendarStore (100% passing - mocking refinado)
- ⚠️ 0 tests de cancelBooking (pendiente - complejidad alta)

### 2. Seguridad - Autorización Server-Side ✅ RLS IMPLEMENTADO
**Impacto**: Alto | **Esfuerzo**: Medio | **Sprint**: 1

- [x] Implementar Row Level Security (RLS) en Supabase:
  - [x] Política RLS para `reservas` (usuarios solo ven sus reservas)
  - [x] Política RLS para `facturas` (usuarios solo ven sus facturas)
  - [x] Política RLS para `user_profiles` (solo admin puede modificar roles)
  - [x] Política RLS para `notificaciones` (cola_envios)
  - [x] Política RLS para `detalles_factura`
  - [x] Política RLS para `preferencias_notificaciones`
  - [x] Política RLS para `consultorios` (lectura pública, admin escritura)
  - [x] Crear índices para optimizar políticas RLS
  - [x] Documentar políticas y casos de uso
- [ ] Validar rol admin en RPCs:
  - [ ] `admin_forgive_penalties` - verificar rol antes de ejecutar
  - [ ] `cancel_recurring_series_with_penalty` - verificar ownership
  - [ ] Crear función helper `is_admin()` en Postgres
- [ ] Agregar validación server-side en operaciones admin:
  - [ ] Broadcast de notificaciones
  - [ ] Marcar facturas como pagadas
  - [ ] Modificar datos de usuarios
  - [ ] Gestión de precios
- [ ] Auditoría de seguridad:
  - [ ] Revisar todos los `supabase.from()` calls
  - [ ] Verificar que datos sensibles no se exponen
  - [ ] Validar inputs en todos los RPCs

**Implementación RLS:**
- ✅ Migración SQL: `supabase/migrations/001_enable_row_level_security.sql`
- ✅ Documentación: `supabase/migrations/README.md`
- ✅ Tests de verificación: `supabase/migrations/test_rls_policies.sql`
- ✅ Políticas por tabla:
  - user_profiles: 5 políticas (SELECT, UPDATE por usuario + admin)
  - reservas: 7 políticas (CRUD por usuario + admin)
  - facturas: 5 políticas (SELECT usuario + CRUD admin)
  - detalles_factura: 5 políticas (SELECT usuario + CRUD admin)
  - cola_envios: 5 políticas (SELECT/UPDATE usuario + admin)
  - preferencias_notificaciones: 4 políticas (CRUD usuario + SELECT admin)
  - consultorios: 4 políticas (SELECT public + CRUD admin)
- ⚠️ **PENDIENTE**: Aplicar migración en Supabase Dashboard

### 3. Manejo de Errores Consistente
**Impacto**: Alto | **Esfuerzo**: Medio | **Sprint**: 1

- [ ] Implementar servicio de logging centralizado:
  - [ ] Evaluar opciones: Sentry, LogRocket, o custom
  - [ ] Instalar SDK elegido
  - [ ] Configurar sourcemaps para production
  - [ ] Configurar user context (id, email, role)
- [ ] Crear custom error types:
  - [ ] `AuthError`
  - [ ] `ValidationError`
  - [ ] `BookingConflictError`
  - [ ] `NetworkError`
- [ ] Implementar Error Boundaries:
  - [ ] Error boundary global en `App.jsx`
  - [ ] Error boundary para rutas admin
  - [ ] Error boundary para calendario
  - [ ] Página de fallback personalizada
- [ ] Agregar `finally` blocks en operaciones async:
  - [ ] Revisar todos los `startLoading()` sin `stopLoading()` en finally
  - [ ] `ReservationDialog.jsx` - handlers de submit
  - [ ] `UserManagement.jsx` - operaciones CRUD
  - [ ] `BillingManagement.jsx` - actualización de facturas
- [ ] Reemplazar `console.log` (74 encontrados):
  - [ ] Usar logger service en desarrollo
  - [ ] Remover logs de producción
  - [ ] Agregar ESLint rule: `no-console: warn`

### 4. Fix Store Anti-Pattern
**Impacto**: Alto | **Esfuerzo**: Medio | **Sprint**: 1

- [ ] Refactorizar services para no usar `getState()`:
  - [ ] `reservationLogic.js` - retornar resultados, no manejar UI
  - [ ] `dashboardService.js` - misma estrategia
  - [ ] `adminService.js` - misma estrategia
  - [ ] `billingService.js` - misma estrategia
- [ ] Actualizar componentes para manejar UI state:
  - [ ] `ReservationDialog` - recibir resultados y mostrar toasts
  - [ ] `AdminDashboard` - manejar loading/errors del service
  - [ ] `BillingManagement` - misma estrategia
- [ ] Patrón recomendado:
  ```javascript
  // ❌ Antes (en service)
  const { showToast } = useUIStore.getState();
  showToast('Error', 'error');

  // ✅ Después (service retorna, component maneja UI)
  // Service:
  return { success: false, error: 'mensaje' };
  // Component:
  const result = await service();
  if (!result.success) showToast(result.error, 'error');
  ```
- [ ] Documentar patrón en CLAUDE.md

---

## 🟡 PRIORIDAD MEDIA - Importante

### 5. Accesibilidad (a11y)
**Impacto**: Medio | **Esfuerzo**: Medio | **Sprint**: 2

- [ ] ARIA labels y roles:
  - [ ] `NotificationBell.jsx` - agregar `aria-label="Notificaciones"`
  - [ ] `Sidebar.jsx` - `aria-label` en navigation items
  - [ ] Modales - `role="dialog"`, `aria-modal="true"`
  - [ ] Botones de acción - `aria-label` descriptivos
- [ ] Keyboard navigation:
  - [ ] Tab order lógico en formularios
  - [ ] ESC cierra modales
  - [ ] Enter/Space activa botones
  - [ ] Testing completo solo con teclado
- [ ] Indicadores no dependientes de color:
  - [ ] Toasts - agregar iconos (CheckCircle, XCircle)
  - [ ] Estados de facturas - iconos + texto
  - [ ] Estados de reservas - iconos + texto
- [ ] Contraste de color:
  - [ ] Verificar ratios WCAG AA (4.5:1 texto, 3:1 UI)
  - [ ] Usar herramienta: https://webaim.org/resources/contrastchecker/
- [ ] Form labels:
  - [ ] Todos los inputs con `<label>` asociado
  - [ ] Error messages con `aria-describedby`
  - [ ] Required fields marcados con `aria-required`
- [ ] Screen reader testing:
  - [ ] Test con NVDA (Windows) o VoiceOver (Mac)
  - [ ] Verificar flujo de reserva completo
  - [ ] Verificar flujo de login/registro

### 6. Performance - Bundle Optimization
**Impacto**: Medio | **Esfuerzo**: Medio | **Sprint**: 2

- [ ] Code splitting:
  - [ ] Lazy load rutas admin:
    ```javascript
    const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
    const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
    ```
  - [ ] Lazy load Calendar (pesado):
    ```javascript
    const CalendarSemanal = lazy(() => import('./components/calendar/CalendarSemanal'));
    ```
  - [ ] Agregar Suspense fallbacks apropiados
- [ ] Optimización de imágenes:
  - [ ] Comprimir `icon-512x512.png` (actual: 277KB → objetivo: <50KB)
  - [ ] Usar https://squoosh.app o similar
  - [ ] Considerar SVG para iconos simples
  - [ ] Implementar lazy loading de imágenes
- [ ] Consolidar librerías de fechas:
  - [ ] **Decisión**: Mantener solo dayjs (más ligero) o date-fns
  - [ ] Migrar todos los usos a librería elegida
  - [ ] Remover librería no usada del package.json
  - [ ] Actualizar imports en todos los archivos
- [ ] Bundle analysis:
  - [ ] Instalar `rollup-plugin-visualizer`
  - [ ] Analizar bundle generado
  - [ ] Identificar dependencias grandes innecesarias
- [ ] Remover dependencias no usadas:
  - [ ] TanStack Query (importado pero no usado)
  - [ ] Revisar package.json completo
- [ ] Optimización de renders:
  - [ ] Agregar `useMemo` en cálculos costosos (ej: `hourlyEvents`)
  - [ ] Agregar `useCallback` en handlers pasados como props
  - [ ] Usar React DevTools Profiler para identificar re-renders

### 7. Paginación Eficiente
**Impacto**: Medio | **Esfuerzo**: Bajo | **Sprint**: 2

- [ ] UserManagement.jsx:
  - [ ] Implementar paginación real (actualmente carga 1000 users)
  - [ ] Agregar límite por página (ej: 50 usuarios)
  - [ ] Implementar offset/cursor pagination
- [ ] ReservationsManagement.jsx:
  - [ ] Paginación de reservas
  - [ ] Agregar filtros (fecha, usuario, estado)
  - [ ] Búsqueda por nombre de usuario
- [ ] BillingManagement.jsx:
  - [ ] Paginación de facturas
  - [ ] Filtros por estado, fecha, usuario
- [ ] UserCombobox:
  - [ ] Implementar búsqueda server-side
  - [ ] Limitar resultados iniciales
  - [ ] Cargar más al hacer scroll (infinite scroll)

### 8. Migración a TypeScript
**Impacto**: Medio | **Esfuerzo**: Alto | **Sprint**: 3

- [ ] Setup inicial:
  - [ ] Instalar TypeScript y tipos
    ```bash
    npm install -D typescript @types/react @types/react-dom
    ```
  - [ ] Crear `tsconfig.json` apropiado
  - [ ] Configurar Vite para soportar TS
  - [ ] Renombrar `vite.config.js` → `vite.config.ts`
- [ ] Fase 1 - Services (semana 1):
  - [ ] `reservationLogic.js` → `reservationLogic.ts`
  - [ ] `dashboardService.js` → `dashboardService.ts`
  - [ ] `adminService.js` → `adminService.ts`
  - [ ] `billingService.js` → `billingService.ts`
  - [ ] Crear types para responses de Supabase
- [ ] Fase 2 - Stores (semana 1):
  - [ ] `authStore.js` → `authStore.ts`
  - [ ] `uiStore.js` → `uiStore.ts`
  - [ ] `calendarStore.js` → `calendarStore.ts`
  - [ ] `notificationStore.js` → `notificationStore.ts`
- [ ] Fase 3 - Utils y Validations (semana 2):
  - [ ] `validations/schemas.js` → `schemas.ts`
  - [ ] `utils/` completamente tipado
  - [ ] `hooks/` completamente tipado
- [ ] Fase 4 - Components (semana 2-3):
  - [ ] Componentes de UI primero (`/components/ui/`)
  - [ ] Luego componentes de features
  - [ ] Finalmente páginas (`/pages/`)
- [ ] Fase 5 - Strict mode (semana 3):
  - [ ] Habilitar `strict: true` en tsconfig
  - [ ] Resolver todos los errores
  - [ ] Remover todos los `any` types

---

## 🟢 PRIORIDAD BAJA - Mejoras Incrementales

### 9. Documentación Mejorada
**Impacto**: Bajo | **Esfuerzo**: Medio | **Sprint**: 3

- [ ] Database Schema Documentation:
  - [ ] Crear diagrama ERD (usar dbdiagram.io o similar)
  - [ ] Documentar cada tabla y sus columnas
  - [ ] Documentar relaciones (foreign keys)
  - [ ] Documentar índices y constraints
  - [ ] Guardar en `/docs/database-schema.md`
- [ ] RPC Functions Documentation:
  - [ ] `cancel_recurring_series_with_penalty` - params, returns, side effects
  - [ ] `handle_reagendamiento` - flujo completo
  - [ ] `revert_reagendamiento` - cuándo usar
  - [ ] `extend_and_create_series` - lógica de renovación
  - [ ] Guardar en `/docs/rpc-functions.md`
- [ ] Environment Setup Guide:
  - [ ] Pre-requisitos (Node version, npm)
  - [ ] Clonar repo
  - [ ] Configurar `.env.local` (con valores de ejemplo)
  - [ ] Setup de Supabase (proyecto, tablas, RPCs)
  - [ ] Ejecutar migraciones
  - [ ] Seed data para desarrollo
  - [ ] Guardar en `/docs/setup.md`
- [ ] Deployment Guide:
  - [ ] Build process
  - [ ] Variables de entorno para producción
  - [ ] Hosting recomendado (Vercel, Netlify, etc.)
  - [ ] Configuración de dominio
  - [ ] SSL/HTTPS setup
  - [ ] Guardar en `/docs/deployment.md`
- [ ] Troubleshooting Guide:
  - [ ] Errores comunes y soluciones
  - [ ] Problemas de autenticación
  - [ ] Conflictos de reservas
  - [ ] Problemas de permisos
  - [ ] Guardar en `/docs/troubleshooting.md`
- [ ] Actualizar CLAUDE.md:
  - [ ] Agregar sección de testing
  - [ ] Agregar convenciones de código
  - [ ] Agregar guía de contribución
  - [ ] Link a docs adicionales

### 10. Mejoras de UX
**Impacto**: Bajo/Medio | **Esfuerzo**: Bajo | **Sprint**: 2

- [ ] Loading states en botones:
  - [ ] Agregar `isLoading` prop a Button component
  - [ ] Mostrar spinner en botón durante submit
  - [ ] Deshabilitar botón automáticamente
- [ ] Deshabilitar durante operaciones:
  - [ ] Forms - deshabilitar inputs durante submit
  - [ ] Botones de acción - prevent double-click
  - [ ] Navigation - prevenir cambio de ruta durante guardado
- [ ] Mensajes de error mejorados:
  - [ ] Errores específicos vs genéricos
  - [ ] Sugerencias de solución cuando sea posible
  - [ ] Links a documentación de ayuda
- [ ] Confirmaciones:
  - [ ] Diálogo antes de cancelar reserva
  - [ ] Confirmación antes de eliminar usuario (admin)
  - [ ] Confirmación antes de forgive penalties
  - [ ] Usar AlertDialog de shadcn/ui
- [ ] Feedback visual:
  - [ ] Animaciones de éxito (checkmark)
  - [ ] Progress indicators para operaciones largas
  - [ ] Skeleton loaders mientras carga data
- [ ] Validación en tiempo real:
  - [ ] Mostrar errores de validación on blur
  - [ ] Indicadores visuales de campo válido/inválido
  - [ ] Contadores de caracteres donde sea relevante

### 11. CI/CD Pipeline
**Impacto**: Medio | **Esfuerzo**: Bajo | **Sprint**: 3

- [ ] GitHub Actions - Linting:
  - [ ] Crear `.github/workflows/lint.yml`
  - [ ] Ejecutar ESLint en cada PR
  - [ ] Bloquear merge si falla
- [ ] GitHub Actions - Testing:
  - [ ] Crear `.github/workflows/test.yml`
  - [ ] Ejecutar tests en cada PR
  - [ ] Reporte de coverage
  - [ ] Bloquear merge si coverage < 70%
- [ ] GitHub Actions - Build:
  - [ ] Crear `.github/workflows/build.yml`
  - [ ] Verificar que build no falla
  - [ ] Check bundle size (alertar si crece >10%)
- [ ] Automated Deployment:
  - [ ] Deploy a staging en cada push a `develop`
  - [ ] Deploy a production en cada push a `main`
  - [ ] Integración con Vercel/Netlify
- [ ] Branch Protection Rules:
  - [ ] Require PR reviews
  - [ ] Require status checks to pass
  - [ ] No direct push to main
- [ ] Dependabot:
  - [ ] Enable automated dependency updates
  - [ ] Configure update schedule
  - [ ] Auto-merge minor/patch updates

### 12. Monitoring & Analytics
**Impacto**: Medio | **Esfuerzo**: Bajo | **Sprint**: 3

- [ ] Error Tracking:
  - [ ] Setup Sentry (o alternativa)
  - [ ] Configurar source maps
  - [ ] Configurar alertas (email/Slack)
  - [ ] Dashboard de errores
- [ ] Performance Monitoring:
  - [ ] Implementar Web Vitals tracking
  - [ ] Enviar métricas a analytics
  - [ ] Alertas para performance degradation
  - [ ] Core Web Vitals: LCP, FID, CLS
- [ ] User Analytics:
  - [ ] Elegir herramienta (PostHog, Plausible, Google Analytics)
  - [ ] Implementar tracking de eventos clave:
    - [ ] Registro de usuario
    - [ ] Login
    - [ ] Creación de reserva
    - [ ] Cancelación de reserva
    - [ ] Pago de factura
  - [ ] Dashboard de métricas de negocio
  - [ ] Respetar privacidad (GDPR compliance)
- [ ] Uptime Monitoring:
  - [ ] Setup monitoring service (UptimeRobot, Pingdom)
  - [ ] Monitor endpoints críticos
  - [ ] Alertas de downtime

---

## 🧹 LIMPIEZA DE CÓDIGO - Quick Wins

### Tareas rápidas (1-2 horas total)
**Sprint**: Cualquiera (fillers)

- [ ] Renombrar directorio typo:
  ```bash
  mv src/components/notificactions src/components/notifications
  # Actualizar imports afectados
  ```
- [ ] Remover código comentado:
  - [ ] `authStore.js` líneas 129-151
  - [ ] Buscar más comentarios grandes: `grep -r "\/\/" src/ | wc -l`
- [ ] Remover console.log (74 encontrados):
  - [ ] Buscar: `grep -r "console.log" src/`
  - [ ] Reemplazar con logger service o remover
- [ ] Limpiar ESLint disables innecesarios:
  - [ ] Buscar: `grep -r "eslint-disable" src/`
  - [ ] Revisar cada uno, eliminar si no es necesario
  - [ ] Agregar comentario explicando por qué es necesario si se mantiene
- [ ] Remover imports no usados:
  - [ ] Configurar ESLint rule: `"no-unused-vars": "warn"`
  - [ ] Usar IDE para detect unused imports
- [ ] Formatear código consistentemente:
  - [ ] Instalar Prettier
  - [ ] Crear `.prettierrc`
  - [ ] Ejecutar `prettier --write src/`
  - [ ] Agregar a pre-commit hook
- [ ] package.json cleanup:
  - [ ] Remover dependencias no usadas
  - [ ] Actualizar versiones a latest (verificar breaking changes)
  - [ ] Ordenar alfabéticamente

---

## 📊 Métricas de Éxito

Al completar estas mejoras, el proyecto debería alcanzar:

- ✅ **Coverage**: >70% de tests unitarios
- ✅ **Performance**: Lighthouse score >90
- ✅ **Accessibility**: WCAG AA compliance
- ✅ **Security**: Todas las operaciones validadas server-side
- ✅ **Bundle Size**: <500KB initial load
- ✅ **Error Rate**: <1% en producción (monitoreado)
- ✅ **Build Time**: <2 minutos en CI
- ✅ **TypeScript**: 100% migrado (opcional, pero recomendado)

---

## 🗓️ Timeline Sugerido

- **Sprint 1** (2-3 semanas): Prioridad Alta - Testing, Seguridad, Errores, Stores
- **Sprint 2** (2 semanas): Prioridad Media - a11y, Performance, Paginación
- **Sprint 3** (2-3 semanas): Prioridad Media/Baja - TypeScript, CI/CD, Docs, Monitoring
- **Ongoing**: Limpieza de código (quick wins intercalados)

**Total estimado**: 6-8 semanas para completar todas las mejoras

---

## 📝 Notas

- Estas mejoras están priorizadas por impacto vs esfuerzo
- Puedes reordenar según tus necesidades de negocio
- Marca cada tarea completada con `[x]`
- Agrega nuevas tareas que descubras durante la implementación
- Revisa este documento al inicio de cada sprint

---

**Última actualización**: 2025-12-03
