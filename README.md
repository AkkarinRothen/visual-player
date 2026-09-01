# 🎭 Visual Player

Herramienta interactiva y audiovisual para partidas de rol en vivo (Master & Tablet/TV) con sincronización WebRTC P2P en tiempo real, motor de escenas, momentos cinematográficos, combate por turnos, efectos climáticos en Canvas, persistencia IndexedDB y soporte TURN para NAT simétrico.

## 🚀 Características

- **Sincronización WebRTC P2P**: Protocolo versionado v1 en 3 niveles (Críticos con ACK, Continuos Monótonos y Efímeros).
- **Controlador del Master**: Preparación y publicación selectiva, deshacer/rehacer, checkpoints y macros cinematográficas.
- **Pantalla para Jugadores**: Atmósfera visual inmersiva, efectos de partículas, clima dinámico, retratos y audio multicanal.
- **Combate y Encuentros**: Seguimiento de iniciativas, barras de HP, condiciones de estado y oleadas de refuerzos.
- **Diagnóstico ICE & Caos**: Telemetría en tiempo real (`host`, `srflx`, `relay`), inyección de fallos para pruebas y resincronización de emergencia.

## 🛠️ Tecnologías

- **Frontend**: React, TypeScript, Vite, Canvas API, Lucide Icons.
- **Red & Sincronización**: WebRTC, PeerJS, STUN/TURN, Serverless Ephemeral Credentials.
- **Persistencia**: Dexie.js (IndexedDB).
- **Testing**: Vitest (29 tests de integración y contrato).

## 📦 Instalación y Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Ejecutar suite de pruebas
npm test

# Compilar para producción
npm run build
```
