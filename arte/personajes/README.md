# Ilustraciones de los personajes

Aquí van los archivos **originales**, tal como salen del programa de
dibujo. Los que usa la página se generan a partir de estos.

## Cambiar las ilustraciones de una edición

1. Deja los archivos nuevos en esta carpeta, con el nombre del
   personaje. No importan mayúsculas, acentos ni la extensión:
   `Nyxie.png`, `mofu.PNG`, `Kaini-diciembre.webp` — todos se reconocen.
2. Corre:

   ```
   npm run personajes
   ```

3. Abre `/test/todos` y revisa cómo quedaron.

Eso es todo. No hay que tocar código: el ancho y el alto se leen del
archivo, así que una ilustración con otra forma se acomoda sola.

## Qué les hace el script

- Les recorta el espacio transparente de alrededor (suelen venir en
  lienzos cuadrados enormes con el personaje en una esquina).
- Las escala a 900px de alto, que es la medida con la que la página
  trabaja y con la que se ven al compartir un resultado.
- Las guarda como `public/char-<nombre>.webp`.

## Los ocho nombres

`mofu`, `nyxie`, `mimirosa`, `hanzo`, `rakkun`, `charmy`, `nori`,
`kaini`.

La página no compila si falta alguno — es a propósito, para que un
personaje faltante se note antes de subir y no como un hueco en la
pantalla.

## Nota

De Mofu, Nyxie, Mimirosa y Hanzo no está aquí el original porque ya
venían procesados de antes. Cuando cambien sus ilustraciones, deja los
archivos nuevos aquí como los demás.
