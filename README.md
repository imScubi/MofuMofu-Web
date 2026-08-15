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

## Ediciones del evento

El sistema maneja **varias ediciones a la vez** (por ejemplo septiembre,
octubre y diciembre). Cada edición tiene sus propias fechas, su propia
fecha límite de pago, su propio mapa de stands y su propio Excel.

Se administran en **`/admin/dashboard/eventos`**: ahí se crea una edición
con un selector de fechas (primer y último día del evento, más la fecha
límite de pago), se abre o cierra el registro, y se activa o desactiva la
lista de giros restringidos para esa fecha en particular.

## Cómo funciona

1. `/registro` — el expositor elige la edición en la que quiere
   participar, elige su stand en el mapa interactivo de esa edición,
   llena sus datos de negocio, **lee y acepta el reglamento**, y sube la
   captura de su transferencia. Al enviarlo, una función de Postgres
   (`reserve_stand`) reserva el stand de forma atómica: si dos personas
   seleccionan el mismo stand casi al mismo tiempo, solo la primera lo
   consigue.
2. El mapa se actualiza **en tiempo real** (Supabase Realtime) para
   todos los que estén viendo la página: en cuanto alguien aparta un
   stand, se pone en amarillo/rosa para los demás automáticamente.
3. Cada registro recibe un **folio corto** (1000, 1001, …). Con ese folio
   y su teléfono, el expositor puede volver en `/registro/completar` para
   agregar un segundo pago al mismo registro, sin duplicarse en el Excel.
4. `/admin` — panel protegido por contraseña para revisar cada
   registro, ver el comprobante, aprobar o rechazar, y descargar un
   Excel **por edición** con:
   - Hoja **Registros**: todos los datos de cada expositor, incluyendo
     folio y constancia de que aceptó el reglamento.
   - Hoja **Stands**: los 40 espacios con su estatus en esa edición.
   - Hoja **Resumen**: fórmulas de Excel (no valores fijos) que suman
     cuántos stands hay vendidos/disponibles, cuánto dinero se ha
     recaudado, cuánto falta por cobrar, el desglose por plan y una
     proyección diaria según la fecha límite de pago de esa edición.

## Reglamento y giros restringidos

El texto del reglamento y la lista de giros restringidos viven en
`src/lib/reglamento.ts`. Antes de poder pagar, el expositor tiene que
desplazarse hasta el final del reglamento (la casilla de aceptación está
deshabilitada hasta entonces) y marcar que lo acepta; queda registrado en
la base de datos con fecha y hora. Si la edición tiene los giros
restringidos activados, además debe aceptar por separado la cláusula 8.8
sobre las sanciones por llevar un giro restringido.

## Configuración del evento

Edita `src/lib/eventConfig.ts` para:
- Nombre del evento
- Planes y precios de los stands (`PRICING_PLANS`)
- Datos bancarios que se le muestran al expositor para transferir
- Categorías de "giro del negocio"

Las fechas ya **no** viven aquí: se configuran por edición desde el panel
de administración.

El mapa interactivo usa la imagen real del plano (`public/stand-map.webp`)
como fondo, con un botón invisible superpuesto sobre cada stand. Las
coordenadas de cada botón (calibradas a mano en píxeles sobre esa imagen)
viven en `src/lib/standLayout.ts`. Si el plano cambia, hay que reemplazar
`public/stand-map.webp` y volver a calibrar las coordenadas `x`/`y` de cada
stand contra la nueva imagen.

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

El esquema vive en `supabase/migrations/`, en orden:

- `0001_init.sql`: tablas `stands` y `registrations`, la función
  `reserve_stand`, políticas de RLS y el bucket privado de Storage
  `payment-proofs`.
- `0002_pricing_plans.sql`: plan y precio elegido por cada registro.
- `0003_events.sql`: ediciones del evento (`events`), disponibilidad de
  stands por edición (`event_stands`), folio corto y constancia de
  aceptación del reglamento y de los giros restringidos.

Ya están aplicadas en el proyecto de Supabase de este evento; si
necesitas recrearlo en otro proyecto, aplícalas en orden con el SQL
Editor de Supabase o con `supabase db push`.

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
