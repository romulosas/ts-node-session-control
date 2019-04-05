"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Event_1 = require("./db/Event");
const User_1 = require("./db/User");
const Log_1 = require("./Log");
const UserActivity_1 = require("./UserActivity");
class CloseEvent {
    constructor() { }
    static createMessage(disconnectType, clientsSessionsMap, socketClientId, clientSesionId, username, clientName, indexMap, origin) {
        let event = new Event_1.Event();
        let user = new User_1.User();
        let _event = null;
        let message = "";
        let userActivity = new UserActivity_1.UserActivity(indexMap);
        switch (disconnectType) {
            case 2 /* AllInstances */:
                clientsSessionsMap.delete(indexMap); //desconecta todas las instancias del cliente.
                userActivity.delete(); //elimina la última actividad del cliente, ya sabemos que se desconectó.
                message = username + " se ha desconectado.";
                Log_1.Log.create("Cliente" /* Client */, clientName, "Conexion Cerrada" /* Disconnect */, message);
                user.save({
                    client: clientName,
                    username: username,
                    online: 0
                });
                _event = {
                    environment: "Cliente" /* Client */,
                    tokenWebSocket: socketClientId,
                    sessionId: clientSesionId,
                    client: clientName,
                    username: username,
                    message: message,
                    event: "Conexion Cerrada" /* Disconnect */
                };
                break;
            case 5 /* UnknownConnection */:
                Log_1.Log.create("Cliente" /* Client */, clientName, "Error" /* Error */, "Se ha generado un evento de cierre de conexión, aunque el cliente no estuviese conectado.");
                break;
            default:
                let inst = clientsSessionsMap.get(indexMap);
                //console.log(clientsSessionsMap);
                if (inst) {
                    inst.delete(socketClientId);
                    //console.log(inst);
                    //En el caso de un según intento de inicio de sesión, igual se elimina el websocket de la cola.
                    if (disconnectType === 4 /* NewSessionUnauthorized */) {
                        message = "El usuario " + username + " ha intentado empezar una nueva sesión.";
                        Log_1.Log.create("Cliente" /* Client */, clientName, "Conexion Cerrada" /* Disconnect */, message);
                        _event = {
                            environment: "Cliente" /* Client */,
                            tokenWebSocket: socketClientId,
                            sessionId: clientSesionId,
                            client: clientName,
                            username: username,
                            message: message,
                            event: "Conexion Cerrada" /* Disconnect */
                        };
                    }
                    else {
                        //Si el cliente no tiene instancias activas, quiere decir que ha cerrado el navegador.
                        if (inst.size === 0) {
                            message = username + " se ha desconectado.";
                            _event = {
                                environment: "Cliente" /* Client */,
                                tokenWebSocket: socketClientId,
                                sessionId: clientSesionId,
                                client: clientName,
                                username: username,
                                message: message,
                                event: "Conexion Cerrada" /* Disconnect */
                            };
                            clientsSessionsMap.delete(indexMap);
                            let userActivity = new UserActivity_1.UserActivity(indexMap);
                            userActivity.delete();
                            Log_1.Log.create("Cliente" /* Client */, clientName, "Conexion Cerrada" /* Disconnect */, message);
                            user.save({
                                client: clientName,
                                username: username,
                                online: 0
                            });
                        }
                        else {
                            message = username + " se ha desconectado de una de sus instancias.";
                            Log_1.Log.create("Cliente" /* Client */, clientName, "Conexion Cerrada" /* Disconnect */, message);
                            let userActivity = new UserActivity_1.UserActivity(indexMap);
                            userActivity.set();
                            _event = null; //No guardaremos el cierre de instancias en la base de datos.
                            // _event = { 
                            //     environment : AgentMessage.Client,
                            //     tokenWebSocket: socketClientId,
                            //     sessionId: clientSesionId,
                            //     client : clientName,
                            //     username : username,
                            //     message : message,
                            //     event : EventType.InstanceClosed
                            // }
                        } //end else 
                    } //end else.                                             
                }
                break;
        }
        if (_event) {
            event.save(_event);
        }
        //IMPRIME MENSAJE CON EL TOTAL DE CLIENTES CONECTADOS AL SERVIDOR
        Log_1.Log.create("Cliente" /* Client */, clientName, "Envio de Mensaje" /* Message */, "Clientes conectados: " + clientsSessionsMap.size);
    }
}
exports.CloseEvent = CloseEvent;
//# sourceMappingURL=CloseEvent.js.map