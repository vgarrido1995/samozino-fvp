# 🦘 FVP Jump Profile — Web (estática)

Aplicación **100% web** para calcular el **perfil Fuerza-Velocidad-Potencia** en salto vertical
(método de **Samozino**).

> **Sin instalar nada. Sin servidor.** Corre directo en tu navegador.

## 🔗 Demo en vivo

👉 **https://vgarrido1995.github.io/samozino-fvp/**

## ✨ Características

- 📝 4 pestañas: Datos · Resultados · Instrucciones · Estudios
- 🧮 Cálculo Samozino completo (Fo, Vo, Pmax, Sfv óptima, FVimb)
- 📊 Gráficas interactivas F-v y P-v (Chart.js)
- 💾 Exportación a **CSV**, **PDF** y **JSON** (con gráficos en el PDF)
- 👥 5 arquetipos predefinidos calibrados (sprinter, saltador, jugador, halterófilo, recreativo)
- ✅ Validación automática (rangos plausibles, CV entre intentos)
- 📱 Responsive (móvil, tablet, desktop)

## 🛠️ Tecnología

HTML + CSS + JavaScript puro. Solo dos librerías por CDN:
- [Chart.js](https://www.chartjs.org/) para gráficos
- [jsPDF](https://github.com/parallax/jsPDF) para exportar a PDF

Sin build, sin npm, sin nada. Abres `index.html` y funciona.

## 🚀 Ejecutar localmente

Doble click en `index.html`. Eso es todo.

(O sirve la carpeta con cualquier servidor estático: `python -m http.server`).

## 📚 Bases científicas

Pestaña **Estudios** dentro de la app, con referencias:
Samozino 2008, 2010, 2012, 2014; Morin & Samozino 2016.

## 📜 Licencia

MIT © 2026 Victor Garrido
