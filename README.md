<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# megaAnime 🚀

Este es el repositorio oficial de **megaAnime** configurado y optimizado para entornos de desarrollo y producción.

https://ai.studio/apps/cca3bfb7-a544-456f-b843-2f581a5873c4

---

## 🛠️ Desarrollo Local

**Requisitos previos:** Node.js v20+ o v22+

1. **Instalar dependencias**:
   ```bash
   npm install
   ```
2. **Configurar variables de entorno**:
   Copia el archivo `.env.example` como `.env` y añade tu clave API de Gemini:
   ```bash
   cp .env.example .env
   ```
3. **Iniciar en modo desarrollo**:
   ```bash
   npm run dev
   ```

---

## 🚀 Despliegue en Producción

El servidor se ha optimizado con soporte para **puertos dinámicos** y **carga perezosa (lazy load) de dependencias**, lo que permite desplegarlo sin problemas en plataformas como **Render, Railway, VPS, cPanel**, etc.

### Pasos para desplegar:

1. **Comando de Construcción (Build Command)**:
   ```bash
   npm install && npm run build
   ```
   *(Esto compilará el frontend en la carpeta `/dist` y empaquetará el servidor backend en `dist/server.cjs`)*.

2. **Comando de Inicio (Start Command)**:
   ```bash
   npm start
   ```
   *(Levantará la aplicación Node.js en producción utilizando el puerto que tu proveedor asigne dinámicamente en `process.env.PORT`)*.

---

## ⚡ Automatización con n8n

Para iniciar el flujo de automatización y webhooks locales de n8n:

```bash
npx n8n start
```
*Accede a la interfaz local en: [http://localhost:5678](http://localhost:5678)*