# Pádel Buche Kuete — app real

App web instalable (PWA) para el grupo: login con nombre + PIN, carga de
partidos con confirmación del rival, ranking por sets ganados dentro de un
torneo de 2 meses, noticias, y notificaciones push reales cuando se publica
una noticia.

Tecnología: Next.js (frontend) + Firebase (base de datos, login anónimo,
notificaciones push) + Vercel (hosting, gratis).

No hace falta saber programar para desplegarla, pero sí seguir los pasos con
calma. Vas a necesitar: una cuenta de Google (para Firebase) y una cuenta de
GitHub + Vercel (gratis).

---

## 1. Crear el proyecto de Firebase

1. Entrá a https://console.firebase.google.com y creá un proyecto nuevo
   (ej. "padel-buche-kuete"). No hace falta activar Google Analytics.
2. Dentro del proyecto, andá a Compilación > **Firestore Database** → Crear
   base de datos → modo producción → elegí una región cercana (ej.
   `southamerica-east1`).
3. Compilación > **Authentication** → Comenzar → pestaña "Sign-in method" →
   activá **Anónimo**.
4. Compilación > **Cloud Messaging** → dentro de esa página, en
   "Certificados push web", generá un par de claves. Copiá la clave que
   empieza a mostrarse (es tu `VAPID key`).
5. Ícono de engranaje (arriba a la izquierda) → **Configuración del
   proyecto** → abajo, en "Tus apps", hacé clic en el ícono `</>` (Web) →
   registrá la app (el nombre no importa) → copiá el objeto `firebaseConfig`
   que te muestra, vas a necesitar esos valores en el paso 3.

## 2. Subir el plan a Blaze (necesario para las notificaciones)

Las Cloud Functions (que son las que mandan la notificación push) requieren
el plan **Blaze** de Firebase. Sigue siendo gratis para este uso: Blaze es
"pago por uso" pero incluye una cuota gratuita mensual enorme que un grupo
de amigos jamás va a superar (así que en la práctica no vas a pagar nada),
pero Google te pide cargar una tarjeta como respaldo.

Configuración del proyecto → Uso y facturación → Modificar plan → Blaze.

Si preferís no cargar una tarjeta, podés saltear este paso: la app funciona
igual (ranking, partidos, noticias), solo que sin notificaciones push
automáticas — el contador de noticias no leídas dentro de la app sigue
funcionando sin esto.

## 3. Configurar el proyecto localmente

1. Descomprimí este proyecto.
2. Copiá `.env.local.example` como `.env.local` y completá los valores con
   los que copiaste del `firebaseConfig` en el paso 1.5.
3. Abrí `public/firebase-messaging-sw.js` y reemplazá los valores
   `REEMPLAZAR_...` con los mismos datos de `firebaseConfig` (este archivo
   no puede leer el `.env.local`, hay que pegarlos directo ahí).

## 4. Reglas de seguridad de Firestore

Con la [CLI de Firebase](https://firebase.google.com/docs/cli) instalada
(`npm install -g firebase-tools`), desde la carpeta del proyecto:

```bash
firebase login
firebase use --add        # elegí tu proyecto
firebase deploy --only firestore:rules
```

## 5. Desplegar las Cloud Functions (notificaciones push)

Solo si activaste el plan Blaze en el paso 2:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 6. Subir la app a Vercel

1. Subí esta carpeta a un repositorio de GitHub (podés arrastrar los
   archivos directo en github.com si no usás Git desde la terminal).
2. Entrá a https://vercel.com, "Add New" → "Project" → importá ese
   repositorio.
3. En "Environment Variables", cargá las mismas variables que pusiste en
   `.env.local` (las `NEXT_PUBLIC_FIREBASE_...`).
4. Deploy. En un par de minutos te da una URL tipo
   `https://padel-buche-kuete.vercel.app`.

## 7. Instalar la app en el celular

Cada jugador entra a esa URL desde el navegador del celular:

- **iPhone (Safari)**: botón de compartir → "Agregar a pantalla de inicio".
- **Android (Chrome)**: menú (⋮) → "Instalar app" o "Agregar a pantalla de
  inicio".

Queda como un ícono más, se abre a pantalla completa como cualquier app.

## 8. Primer uso

El primer jugador que entra y crea su usuario queda como **administrador**
(puede dar de alta al resto, configurar el torneo y publicar noticias).
Desde el ícono de ajustes (⚙️) dentro de la app cada jugador puede activar
las notificaciones push tocando "Activar notificaciones".

---

## Sobre la seguridad

Esta app está pensada para un grupo de amigos, no para datos sensibles: el
PIN de 4 dígitos evita cargas accidentales, no es un sistema de contraseñas
robusto. No reutilices un PIN que uses en otro lado.

## Si te trabás en algún paso

Cualquiera de estos pasos (Firebase, Vercel, Cloud Functions) puede fallar
por detalles chicos de configuración. Puedo ayudarte a resolver errores
puntuales si me contás qué mensaje te aparece.
