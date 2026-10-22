# Explorador del cerebro humano

Aplicación estática para explorar un modelo anatómico 3D en formato GLB. Three.js carga la geometría, los JSON externos aportan las fichas educativas y la interfaz no inventa descripciones: si falta una ficha, muestra «Información anatómica pendiente de incorporar».

El modelo incluido (`assets/brain.glb`) es una escena plana de 29 mallas con nombre único: lóbulos, ínsula, hipocampo propio, tálamo, cápsula interna, ventrículos, diencéfalo, tronco encefálico y cerebelo. La carga también admite jerarquías: la unidad anatómica es el nodo con nombre más profundo que contiene mallas. Si un nombre se repite, el identificador pasa a ser la ruta jerárquica (`Padre/Hijo`) y hay que usar esa ruta como clave del JSON.

## 1. Ejecutar en local

Hace falta un servidor HTTP. Los módulos ES y el GLB no funcionan abriendo el archivo directamente.

```bash
cd brain-explorer
python3 -m http.server 8080
```

Abre `http://localhost:8080`. La primera carga descarga Three.js desde jsDelivr.

## 2. Sustituir el modelo GLB

Sustituye `assets/brain.glb` y conserva el nombre, o cambia la ruta en `js/main.js` (`loadBrainModel`). Al arrancar, la aplicación centra el modelo, lo escala y encuadra la cámara. No hace falta convertir unidades a mano.

## 3. Identificar los nombres de los nodos

Al cargar, la consola lista cada estructura. En la interfaz, la lista anatómica y la ficha muestran el nombre del nodo bajo «Nombre en el modelo». Esa cadena es la clave del JSON cuando el nombre es único. Si hubiera duplicados, la consola avisa y la clave válida es la ruta (`Grupo/Estructura`).

## 4. Agregar información educativa

Edita `data/anatomy.es.json` y, si existe, `data/anatomy.en.json`. La clave de cada ficha debe coincidir con el nombre del nodo:

```json
"Left thalamus": {
  "name": "Tálamo izquierdo",
  "category": "Diencéfalo",
  "description": "...",
  "function": "...",
  "location": "...",
  "interestingFact": "...",
  "order": 11,
  "color": "#91B7D9",
  "labelEnabled": true,
  "visibleInExplore": true,
  "cameraDistance": 0.78
}
```

`name` es el texto visible. No se traducen nombres por reglas automáticas: cada idioma tiene su propio archivo. Si falta el inglés, la aplicación sigue en español.

Un identificador que no exista en el GLB solo produce un aviso en consola.

## 5. Orden del recorrido guiado

`order` es un número. El recorrido usa las estructuras visibles del modo exploración (oculta las que contienen `right` en el nombre) y las ordena por `order`. Las que no tienen `order` quedan al final, en orden alfabético del nombre educativo.

## 6. Colores y parámetros

- `color`: color hexadecimal de la estructura en el modo exploración. Si falta, se asigna uno estable de una paleta.
- `cameraDistance`: factor relativo de encuadre. `1` es el encuadre automático; un valor menor acerca la cámara y uno mayor la aleja.
- `labelEnabled`: `false` oculta la etiqueta, no la estructura.
- `visibleInExplore`: `false` oculta la estructura al explorar, además de la regla de los nombres que contienen `right`.
- La separación se controla en la interfaz, de 0 % a 100 %. No está fijada en el JSON.

Los materiales originales del GLB se clonan antes de tintarlos y pueden restaurarse con «Colores originales».

## 7. Desplegar como sitio estático

Sube el directorio a cualquier hosting estático (Nginx, GitHub Pages, Netlify, S3, etc.) conservando las rutas relativas de `index.html`, `css/`, `js/`, `data/` y `assets/`. No hay compilación ni backend. El servidor debe entregar los `.json` y el `.glb` como archivos estáticos.
