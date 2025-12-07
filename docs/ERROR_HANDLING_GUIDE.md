# Guía de Manejo de Errores - PisamaApp

## 📋 Tabla de Contenidos

- [Visión General](#visión-general)
- [Custom Error Types](#custom-error-types)
- [Logger Service](#logger-service)
- [Error Boundaries](#error-boundaries)
- [Buenas Prácticas](#buenas-prácticas)
- [Ejemplos de Uso](#ejemplos-de-uso)

---

## Visión General

PisamaApp implementa un sistema robusto de manejo de errores que incluye:

1. **Custom Error Types**: Tipos de error específicos para diferentes escenarios
2. **Logger Service**: Servicio centralizado de logging con contexto
3. **Error Boundaries**: Componentes React que capturan errores en el árbol de componentes
4. **ESLint Rules**: Reglas que evitan el uso de `console.log` directo

---

## Custom Error Types

### Tipos Disponibles

Ubicación: `src/errors/AppError.js`

#### 1. `AppError` (Base)
Error base del que heredan todos los demás.

```javascript
import { AppError } from '@/errors';

throw new AppError('Algo salió mal', {
  code: 'CUSTOM_ERROR',
  statusCode: 500,
  isOperational: true,
  metadata: { additionalInfo: 'valor' }
});
```

#### 2. `AuthError`
Para errores de autenticación y autorización.

```javascript
import { AuthError } from '@/errors';

// Usuario no autenticado
throw new AuthError('Debes iniciar sesión', {
  code: 'NOT_AUTHENTICATED'
});

// Sin permisos
throw new AuthError('No tienes permisos para esta acción', {
  code: 'FORBIDDEN',
  statusCode: 403
});
```

#### 3. `ValidationError`
Para errores de validación de formularios o datos.

```javascript
import { ValidationError } from '@/errors';

throw new ValidationError('El email es inválido', {
  code: 'INVALID_EMAIL',
  metadata: { field: 'email', value: userInput }
});
```

#### 4. `BookingConflictError`
Para conflictos en reservas (doble reserva, etc.).

```javascript
import { BookingConflictError } from '@/errors';

throw new BookingConflictError('Este horario ya está reservado', {
  code: 'TIME_SLOT_CONFLICT',
  metadata: {
    requestedTime: '2025-12-07 10:00',
    conflictingBooking: existingBooking
  }
});
```

#### 5. `NetworkError`
Para errores de red o API.

```javascript
import { NetworkError } from '@/errors';

throw new NetworkError('No se pudo conectar al servidor', {
  code: 'CONNECTION_FAILED',
  metadata: { endpoint: '/api/reservations' }
});
```

#### 6. `DatabaseError`
Para errores de Supabase o base de datos.

```javascript
import { DatabaseError } from '@/errors';

throw new DatabaseError('Error al consultar reservas', {
  code: 'QUERY_FAILED',
  metadata: { table: 'reservas', operation: 'select' }
});
```

#### 7. `NotFoundError`
Para recursos no encontrados.

```javascript
import { NotFoundError } from '@/errors';

throw new NotFoundError('Reserva no encontrada', {
  code: 'RESERVATION_NOT_FOUND',
  metadata: { reservationId: 123 }
});
```

#### 8. `PermissionError`
Para permisos denegados.

```javascript
import { PermissionError } from '@/errors';

throw new PermissionError('Solo administradores pueden realizar esta acción', {
  code: 'ADMIN_ONLY'
});
```

### Normalización de Errores

Usa `normalizeError()` para convertir errores desconocidos en `AppError`:

```javascript
import { normalizeError } from '@/errors';

try {
  // Operación que puede lanzar diferentes tipos de errores
  await someFunction();
} catch (error) {
  const normalizedError = normalizeError(error);
  logger.error('Error en operación', normalizedError);
}
```

---

## Logger Service

### Configuración Básica

Ubicación: `src/services/logger/logger.js`

El logger está pre-configurado en `App.jsx` con el contexto del usuario:

```javascript
// En App.jsx - ya configurado
useEffect(() => {
  if (user?.id) {
    logger.setContext({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
    });
  } else {
    logger.clearContext();
  }
}, [user]);
```

### Niveles de Log

#### `logger.debug(message, data)`
Para información de debugging (solo en desarrollo).

```javascript
import { logger } from '@/services/logger';

logger.debug('Calculando precio de reserva', {
  hourlyRate: 100,
  hours: 2,
  usaCamilla: true
});
```

#### `logger.info(message, data)`
Para información general.

```javascript
logger.info('Usuario creó una reserva', {
  reservationId: 456,
  startTime: '2025-12-07 10:00'
});
```

#### `logger.warn(message, data)`
Para advertencias (situaciones que no son errores pero requieren atención).

```javascript
logger.warn('Reserva cerca del límite de cancelación', {
  reservationId: 789,
  hoursUntilStart: 2
});
```

#### `logger.error(message, error, data)`
Para errores.

```javascript
try {
  await createReservation(data);
} catch (error) {
  logger.error('Error al crear reserva', error, {
    userId: user.id,
    reservationData: data
  });
}
```

### Métodos Especializados

#### `logger.api(method, endpoint, data)`
Para logs de llamadas API.

```javascript
logger.api('POST', '/api/reservations', {
  status: 200,
  duration: 245 // ms
});
```

#### `logger.userAction(action, data)`
Para acciones del usuario.

```javascript
logger.userAction('CLICK_CREATE_RESERVATION', {
  page: '/calendario_semanal',
  timestamp: new Date().toISOString()
});
```

#### `logger.performance(metric, value, data)`
Para métricas de performance.

```javascript
logger.performance('page-load', 1234, {
  page: '/dashboard'
});
```

---

## Error Boundaries

### Error Boundary Global

Ya configurado en `App.jsx` - envuelve toda la aplicación.

```jsx
// En App.jsx - ya configurado
<ErrorBoundary name="AppRoot">
  <BrowserRouter>
    {/* ... */}
  </BrowserRouter>
</ErrorBoundary>
```

### Admin Error Boundary

Para rutas de administración - ya configurado.

```jsx
// Ya configurado en App.jsx
<AdminRouteGuard>
  <AdminErrorBoundary>
    <AdminDashboard />
  </AdminErrorBoundary>
</AdminRouteGuard>
```

### Calendar Error Boundary

Para componentes del calendario.

```jsx
import { CalendarErrorBoundary } from '@/components/CalendarErrorBoundary';

function MyCalendarPage() {
  return (
    <CalendarErrorBoundary>
      <CalendarSemanal />
    </CalendarErrorBoundary>
  );
}
```

### Custom Error Boundary

Para casos específicos:

```jsx
import ErrorBoundary from '@/components/ErrorBoundary';

function MyComponent() {
  return (
    <ErrorBoundary
      name="MyComponentBoundary"
      onError={(error) => {
        // Lógica personalizada
        logger.error('Error en MyComponent', error);
      }}
    >
      <SomeRiskyComponent />
    </ErrorBoundary>
  );
}
```

---

## Buenas Prácticas

### ✅ DO: Usar logger en lugar de console

```javascript
// ❌ MAL
console.log('Usuario logueado:', user);

// ✅ BIEN
logger.info('Usuario logueado', { userId: user.id });
```

### ✅ DO: Usar try-catch-finally

```javascript
// ✅ BIEN
async function fetchData() {
  const { startLoading, stopLoading } = useUIStore.getState();

  try {
    startLoading('Cargando datos...');
    const data = await api.fetchData();
    return data;
  } catch (error) {
    logger.error('Error al cargar datos', error);
    throw normalizeError(error);
  } finally {
    stopLoading(); // IMPORTANTE: Siempre se ejecuta
  }
}
```

### ✅ DO: Lanzar errores específicos

```javascript
// ❌ MAL
if (!user) {
  throw new Error('No autenticado');
}

// ✅ BIEN
if (!user) {
  throw new AuthError('Debes iniciar sesión', {
    code: 'NOT_AUTHENTICATED'
  });
}
```

### ✅ DO: Agregar metadata útil

```javascript
// ✅ BIEN
throw new BookingConflictError('Horario no disponible', {
  code: 'TIME_SLOT_CONFLICT',
  metadata: {
    requestedTime: requestedTime.toISOString(),
    consultorioId: consultorio.id,
    conflictingReservations: conflicts.map(r => r.id)
  }
});
```

### ✅ DO: Logs con contexto

```javascript
// ❌ MAL
logger.error('Error');

// ✅ BIEN
logger.error('Error al actualizar perfil', error, {
  userId: user.id,
  fieldsUpdated: Object.keys(updates),
  attemptNumber: retryCount
});
```

### ❌ DON'T: Swallow errors

```javascript
// ❌ MAL
try {
  await operation();
} catch (error) {
  // Ignorar silenciosamente
}

// ✅ BIEN
try {
  await operation();
} catch (error) {
  logger.error('Error en operación', error);
  throw error; // Re-lanzar o manejar apropiadamente
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Service Function

```javascript
import { logger } from '@/services/logger';
import { DatabaseError, NotFoundError } from '@/errors';
import { supabase } from '@/supabase';

export async function fetchReservationById(id) {
  try {
    logger.debug('Fetching reservation', { id });

    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new DatabaseError('Error al obtener reserva', {
        code: 'FETCH_FAILED',
        metadata: { reservationId: id, supabaseError: error }
      });
    }

    if (!data) {
      throw new NotFoundError('Reserva no encontrada', {
        metadata: { reservationId: id }
      });
    }

    logger.info('Reservation fetched successfully', { id });
    return data;
  } catch (error) {
    logger.error('Error in fetchReservationById', error, { id });
    throw error;
  }
}
```

### Ejemplo 2: Component con Error Handling

```jsx
import { useState } from 'react';
import { logger } from '@/services/logger';
import { useUIStore } from '@/stores/uiStore';
import { normalizeError } from '@/errors';

function ReservationForm() {
  const { startLoading, stopLoading, showToast } = useUIStore();
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      startLoading('Creando reserva...');
      logger.userAction('SUBMIT_RESERVATION_FORM', { formData });

      const result = await createReservation(formData);

      logger.info('Reservation created', { reservationId: result.id });
      showToast('Reserva creada exitosamente', 'success');
    } catch (error) {
      const normalizedError = normalizeError(error);

      logger.error('Error creating reservation', normalizedError, {
        formData,
        userAgent: navigator.userAgent
      });

      showToast(
        normalizedError.message || 'Error al crear reserva',
        'error'
      );
    } finally {
      stopLoading();
    }
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### Ejemplo 3: Integración con Error Boundary

```jsx
import ErrorBoundary from '@/components/ErrorBoundary';
import { logger } from '@/services/logger';

function ComplexFeature() {
  return (
    <ErrorBoundary
      name="ComplexFeatureBoundary"
      onError={(error, errorInfo) => {
        logger.error('Complex feature crashed', error, {
          componentStack: errorInfo.componentStack
        });

        // Opcional: Enviar a servicio externo
        // sendToMonitoring(error, errorInfo);
      }}
      onReset={() => {
        logger.info('User reset complex feature');
      }}
    >
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

---

## Integración con Servicios Externos

### Sentry (Ejemplo)

```javascript
// src/services/logger/sentry.js
import * as Sentry from '@sentry/react';
import { logger } from './logger';

export function initializeSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 1.0,
    });

    // Integrar Sentry con nuestro logger
    logger.initializeExternalLogger(Sentry);
  }
}
```

```javascript
// src/main.jsx
import { initializeSentry } from '@/services/logger/sentry';

initializeSentry();
```

---

## Checklist de Migración

Al refactorizar código existente:

- [ ] Reemplazar `console.log` con `logger.debug` o `logger.info`
- [ ] Reemplazar `console.error` con `logger.error`
- [ ] Agregar `finally` blocks en operaciones async con loading states
- [ ] Usar custom error types en lugar de `new Error()`
- [ ] Agregar metadata útil a los errores
- [ ] Envolver componentes riesgosos con Error Boundaries
- [ ] Normalizar errores antes de re-lanzarlos
- [ ] Verificar que ESLint no muestre warnings de `no-console`

---

**Última actualización**: 2025-12-07
**Mantenido por**: Equipo de desarrollo PisamaApp
