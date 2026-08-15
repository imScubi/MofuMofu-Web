# MofuMofu Market — Registro de expositores

Web para recabar el registro de expositores del evento: mapa de stands
interactivo, formulario de registro, comprobante de pago y un panel de
administración con exportación a Excel (con fórmulas) para llevar el
control del dinero.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4
- **Supabase**: Postgres (stands + registros), Realtime (mapa en vivo),
  Storage (capturas de comprobantes de pago)
- **exceljs** para generar el Excel de expositores con fórmulas reales

## Cómo funciona

1. `/registro` — el expositor elige su stand en el mapa interactivo,
   llena sus datos de negocio y sube la captura de su transferencia.
   Al enviarlo, una función de Postgres (`reserve_stand`) reserva el
   stand de forma atómica: si dos personas seleccionan el mismo stand
   casi al mismo tiempo, solo la primera lo consigue.
2. El mapa se actualiza **en tiempo real** (Supabase Realtime) para
   todos los que estén viendo la página: en cuanto alguien aparta un
   stand, se pone en amarillo/rosa para los demás automáticamente.
3. `/admin` — panel protegido por contraseña para revisar cada
   registro, ver el comprobante, aprobar o rechazar, y descargar un
   Excel siempre actualizado con:
   - Hoja **Registros**: todos los datos de cada expositor.
   - Hoja **Stands**: los 40 espacios con su precio y estatus.
   - Hoja **Resumen**: fórmulas de Excel (no valores fijos) que suman
     cuántos stands hay vendidos/disponibles, cuánto dinero se ha
     recaudado, cuánto falta por cobrar y una proyección diaria según
     la fecha límite de pago.

## Configuración del evento

Edita `src/lib/eventConfig.ts` para:
- Nombre del evento, fecha del evento y fecha límite de pago
- Precio por defecto del stand
- Datos bancarios que se le muestran al expositor para transferir
- Categorías de "giro del negocio"

El mapa de stands (posiciones, cuáles son reservables) vive en
`src/lib/standLayout.ts`. Está armado a partir del plano del evento
(filas 1-13, 14-19 en la curva, 20-32+39+40, 33-38, y el módulo "A" de
informes). Si cambia el plano, ajusta las coordenadas ahí.

## Variables de entorno

Copia `.env.example` a `.env.local` y llena:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: en el
  panel de Supabase, Project Settings → API. Son públicas, solo dan
  acceso de lectura a los stands y a ejecutar la función de reserva.
- `SUPABASE_SERVICE_ROLE_KEY`: misma sección, "service_role". **Nunca
  se expone al navegador** — solo la usan las rutas del servidor
  (`/api/*`, panel admin). Le da acceso completo a la base de datos,
  trátala como una contraseña.
- `ADMIN_PASSWORD`: la contraseña para entrar a `/admin`.

## Base de datos

El esquema vive en `supabase/migrations/0001_init.sql` (tablas
`stands` y `registrations`, la función `reserve_stand`, políticas de
RLS y el bucket de Storage `payment-proofs`). Ya está aplicado en el
proyecto de Supabase de este evento; si necesitas recrearlo en otro
proyecto, aplica ese archivo con el SQL Editor de Supabase o con
`supabase db push`.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Despliegue

El proyecto está conectado a Vercel. Cualquier push a la rama
configurada dispara un nuevo deploy — solo asegúrate de que las
variables de entorno de arriba estén configuradas en Vercel
(Project Settings → Environment Variables).
