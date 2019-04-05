"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Log {
    static create(environment, clientName, event, message) {
        let agent = (environment === "Cliente" /* Client */) ? clientName.toUpperCase() : "SERVIDOR";
        let eventOut = "";
        switch (event) {
            case "Servicio Inicializado" /* Open */:
                eventOut = "Inicializado";
                break;
            case "Conexi\u00F3n Inicializada" /* Connect */:
                eventOut = "Conectado";
                break;
            case "Envio de Mensaje" /* Message */:
                eventOut = "Info";
                break;
            case "Conexi\u00F3n Rechazada" /* Deny */:
                eventOut = "Rechazado";
                break;
            case "Error" /* Error */:
                eventOut = "Error";
                break;
            case "Conexion Cerrada" /* Disconnect */:
                eventOut = "Desconectado";
                break;
        }
        console.log('[' + this.getTime() + '][' + agent + '][' + eventOut + '] - ' + message);
    }
    static getTime() {
        const dt = new Date();
        return dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
    }
}
exports.Log = Log;
//# sourceMappingURL=Log.js.map