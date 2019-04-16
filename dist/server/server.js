"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const Cors = require("cors");
const BodyParser = require("body-parser");
const Log_1 = require("./Log");
const Event_1 = require("./db/Event");
const User_1 = require("./db/User");
const CloseEvent_1 = require("./CloseEvent");
const UserActivity_1 = require("./UserActivity");
const Mongoose = require("mongoose");
//Server config variables.
const event = new Event_1.Event();
const user = new User_1.User();
const mongoose = Mongoose;
const app = express();
const cors = Cors;
const bp = BodyParser;
const clientsDomainlist = [];
const mongooseUri = "mongodb://admin:admin123@ds135456.mlab.com:35456/ts-node-session-control";
//const mongooseUri     = "mongodb://localhost:27017/local";
const optionsDB = {
    useNewUrlParser: true,
    autoIndex: false,
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 500,
    poolSize: 10,
    // If not connected, return errors immediately rather than waiting for reconnect
    bufferMaxEntries: 0,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4, skip trying IPv6
};
const port = 3000;
const options = {
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "X-Access-Token"],
    credentials: true,
    methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
    origin: function (origin, callback) {
        callback(null, true);
        /*if (clientsDomainlist.indexOf(origin) !== -1) {
        callback(null, true)
        } else {
            Log.create(AgentMessage.Server, "", EventType.Deny, "Intento de acceso no autorizado. (" + origin +")");
            callback(new Error('Acceso no autorizado.'))
        }*/
    },
    preflightContinue: false
};
app.use(bp.urlencoded({ extended: false }));
app.use(bp.json());
app.use(cors(options));
//INSTANCIA Y LEVANTA EL SERVIDOR
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
//let client: Client;
var sessionsMapByUserAndClientName = new Map();
var socketIdAndClientSessionIdMap = new Map();
let disconnectType;
var CLIENTS = new Map();
//Declaramos el evento de conexión a la instancia WebSocket.
wss.on('connection', (ws, req) => {
    let origin = req.headers.origin;
    let socketClientId = String(req.headers['sec-websocket-key']);
    let clientDatas = String(req.headers['sec-websocket-protocol']);
    let arrClientData = clientDatas.split(", ");
    CLIENTS.set(socketClientId, ws);
    //Desconecta clientes que no tengan permiso de acceso.
    /*if (clientsDomainlist.indexOf(origin) === -1) {

        disconnectType = DisconnectType.DomainUnauthorized;

        let message = "Intento de acceso no autorizado. (" + origin + ")";
        Log.create(AgentMessage.Server, "", EventType.Deny, message);

        ws.send(JSON.stringify({ time: Log.getTime(), message: "Intento de acceso no autorizado.", event: EventType.Deny, code: CodeMessage.Forbidden }));

        event.save({
            environment: AgentMessage.Server,
            tokenWebSocket: socketClientId,
            sessionId: null,
            client: 'Servidor',
            username: 'Admin',
            message: message,
            event: EventType.Deny
        });

        ws.close();
    }*/
    //Valida si la conexión se mantiene activa.
    const extWs = ws;
    extWs.isAlive = true;
    //Se cierra la conexión si el servidor no recibe los 3 datos necesarios para empezar una conexión
    if (arrClientData.length !== 3) {
        Log_1.Log.create("Servidor" /* Server */, "", "Envio de Mensaje" /* Message */, " El acceso no ha sido identificado.");
        disconnectType = 5 /* UnknownConnection */;
        ws.close();
    }
    //Declaramos las variables con que van a recibir los datos del usuario que se ha conectado al servidor.
    //0 - Nombre del Cliente (Ej: Girard)
    //1 - Id de la sesión en el cliente.
    //2 - Nombre del usuario
    let clientName = arrClientData[0];
    let clientSesionId = arrClientData[1];
    let username = arrClientData[2];
    let indexMap = clientName + "-" + username;
    if (sessionsMapByUserAndClientName.has(indexMap)) {
        //Instancia el mapa que lleva socketClientId como Key y Map los datos del cliente.
        let cli = sessionsMapByUserAndClientName.get(indexMap);
        if (cli) {
            let isNewSession = false;
            for (let [websocketId, sessionId] of cli) {
                if (sessionId !== clientSesionId) {
                    isNewSession = true;
                    continue;
                }
            }
            if (isNewSession === true) {
                disconnectType = 4 /* NewSessionUnauthorized */; //Se agrega al mapa de acceso del cliente, los datos asociados al nuevo socket id.(Se genera al abrir una nueva pestaña)
                Log_1.Log.create("Cliente" /* Client */, clientName, "Conexi\u00F3n Rechazada" /* Deny */, username + " ya está conectado.");
                ws.send(JSON.stringify({ time: Log_1.Log.getTime(), message: username + " ya está conectado.", event: "Conexi\u00F3n Rechazada" /* Deny */, code: 403 /* Forbidden */ }));
                event.save({
                    environment: "Cliente" /* Client */,
                    tokenWebSocket: socketClientId,
                    sessionId: clientSesionId,
                    client: clientName,
                    username: username,
                    message: "Intento de doble sesión, el usuario ya se encuentra conectado.",
                    event: "Conexi\u00F3n Rechazada" /* Deny */
                });
                ws.close();
                disconnectType = 0 /* Init */; //Forza un valor que no esté en ninguna condición.
            }
            else {
                //Agrega nueva instancia de acceso del usuario.
                let cli = sessionsMapByUserAndClientName.get(indexMap);
                if (cli) {
                    cli.set(socketClientId, clientSesionId); //client.username, clientDataMap
                    Log_1.Log.create("Cliente" /* Client */, clientName, "Conexi\u00F3n Inicializada" /* Connect */, username + " ha abierto una nueva pestaña.");
                    // event.save({
                    //     environment: AgentMessage.Client,
                    //     tokenWebSocket: socketClientId,
                    //     sessionId: clientSesionId,
                    //     client: clientName,
                    //     username: username,
                    //     message: username + " ha abierto una nueva pestaña.",
                    //     event: EventType.Connect
                    // });
                    Log_1.Log.create("Cliente" /* Client */, clientName, "Envio de Mensaje" /* Message */, username + " tiene " + cli.size + " instancias en paralelo.");
                    // event.save({
                    //     environment: AgentMessage.Client,
                    //     tokenWebSocket: socketClientId,
                    //     sessionId: clientSesionId,
                    //     client: clientName,
                    //     username: username,
                    //     message: username + " tiene " + cli.size + " instancias en paralelo.",
                    //     event: EventType.Message
                    // });
                    let userActivity = new UserActivity_1.UserActivity(indexMap);
                    userActivity.set();
                }
            }
        }
    }
    else {
        //Se agrega el nuevo cliente a la lista de clientes y su respectivo token de conexión al websocket.
        socketIdAndClientSessionIdMap = new Map();
        socketIdAndClientSessionIdMap.set(socketClientId, clientSesionId);
        sessionsMapByUserAndClientName.set(indexMap, socketIdAndClientSessionIdMap);
        //console.log(socketIdAndClientSessionIdMap);
        //console.log(sessionsMapByUserAndClientName);
        Log_1.Log.create("Cliente" /* Client */, clientName, "Conexi\u00F3n Inicializada" /* Connect */, username + " se ha conectado. (" + origin + ")");
        event.save({
            environment: "Cliente" /* Client */,
            tokenWebSocket: socketClientId,
            sessionId: clientSesionId,
            client: clientName,
            username: username,
            message: username + " se ha conectado. (" + origin + ")",
            event: "Conexi\u00F3n Inicializada" /* Connect */
        });
        user.save({
            client: clientName,
            username: username,
            online: 1
        });
        let userActivity = new UserActivity_1.UserActivity(indexMap);
        userActivity.set();
    }
    ws.on('pong', () => {
        let userActivity = new UserActivity_1.UserActivity(indexMap);
        if (userActivity.shouldLogoutForInactivity()) {
            sendMsgToDisconnectAllUserInstances("Sesión expirada por falta de actividad en el servidor.", sessionsMapByUserAndClientName.get(indexMap));
        }
        else {
            extWs.isAlive = true;
        }
    });
    ws.on('message', (message) => {
        Log_1.Log.create("Cliente" /* Client */, clientName, "Envio de Mensaje" /* Message */, username + " ha enviado un mensaje: " + message);
        if (message == 'disconnect') {
            event.save({
                environment: "Cliente" /* Client */,
                tokenWebSocket: socketClientId,
                sessionId: clientSesionId,
                client: clientName,
                username: username,
                message: "Mensaje recibido: " + message,
                event: "Envio de Mensaje" /* Message */
            });
            ws.send(JSON.stringify({ time: Log_1.Log.getTime(), message: "Cerrando la sesión por timeout.", event: "Conexion Cerrada" /* Disconnect */, code: 408 /* TimeOut */ }));
            message = 'El admin ha desconectado a ' + username + " por inactividad.";
            Log_1.Log.create("Cliente" /* Client */, clientName, "Conexion Cerrada" /* Disconnect */, message);
            event.save({
                environment: "Cliente" /* Client */,
                tokenWebSocket: socketClientId,
                sessionId: clientSesionId,
                client: clientName,
                username: username,
                message: message,
                event: "Conexion Cerrada" /* Disconnect */
            });
            sendMsgToDisconnectAllUserInstances("Sesión expirada.", sessionsMapByUserAndClientName.get(indexMap));
            user.save({
                client: clientName,
                username: username,
                online: 0
            });
            ws.terminate();
        }
        else if (message == 'logout') {
            event.save({
                environment: "Cliente" /* Client */,
                tokenWebSocket: socketClientId,
                sessionId: clientSesionId,
                client: clientName,
                username: username,
                message: "Mensaje recibido: " + message,
                event: "Envio de Mensaje" /* Message */
            });
            ws.send(JSON.stringify({ time: Log_1.Log.getTime(), message: "Ejecutando solicitud de logout.", event: "Conexion Cerrada" /* Disconnect */, code: 200 /* Logout */ }));
            message = 'El usuario ha cerrado la sesión.';
            Log_1.Log.create("Cliente" /* Client */, clientName, "Conexion Cerrada" /* Disconnect */, message);
            event.save({
                environment: "Cliente" /* Client */,
                tokenWebSocket: socketClientId,
                sessionId: clientSesionId,
                client: clientName,
                username: username,
                message: message,
                event: "Conexion Cerrada" /* Disconnect */
            });
            sendMsgToDisconnectAllUserInstances("Cierre de Sessión.", sessionsMapByUserAndClientName.get(indexMap));
            user.save({
                client: clientName,
                username: username,
                online: 0
            });
            ws.terminate();
        }
        else {
            ws.send(JSON.stringify({ time: Log_1.Log.getTime(), message: "Mensaje recibido: " + message, event: "Envio de Mensaje" /* Message */ }));
            event.save({
                environment: "Cliente" /* Client */,
                tokenWebSocket: socketClientId,
                sessionId: clientSesionId,
                client: clientName,
                username: username,
                message: "Mensaje recibido: " + message,
                event: "Envio de Mensaje" /* Message */
            });
            let userActivity = new UserActivity_1.UserActivity(indexMap);
            userActivity.set();
        }
    });
    ws.on('error', (err) => {
        Log_1.Log.create("Cliente" /* Client */, clientName, "Error" /* Error */, "Ops, hubo un error. (" + err + ")");
        ws.send(JSON.stringify({ time: Log_1.Log.getTime(), message: "Ops, hubo un error. (" + err + ")", event: "Error" /* Error */ }));
        let _event = {
            environment: "Servidor" /* Server */,
            tokenWebSocket: socketClientId,
            sessionId: clientSesionId,
            client: clientName,
            username: username,
            message: "Ops, hubo un error. (" + err + ")",
            event: "Error" /* Error */
        };
        event.save(_event);
    });
    ws.on('close', (err, res) => {
        if (sessionsMapByUserAndClientName.has(indexMap)) {
            CloseEvent_1.CloseEvent.createMessage(disconnectType, sessionsMapByUserAndClientName, socketClientId, clientSesionId, username, clientName, indexMap, origin);
        }
        else {
            user.save({
                client: clientName,
                username: username,
                online: 0
            });
        }
    });
});
//Get the lastest 10 events.
app.post('/get-last-events', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const lastEvents = yield event.getLastEvents();
            return res.status(201).json({
                data: lastEvents.reverse()
            });
        }
        catch (err) {
            return next(err);
        }
    });
});
//Get the lastest 10 connected users.
app.post('/get-connected-users', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const users = yield user.getLastOnlineUsers();
            return res.status(201).json({ data: users });
        }
        catch (err) {
            return next(err);
        }
    });
});
//Get total users, total connected users, denied users and total clients.
app.post('/get-totals', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let users = yield user.getAllUsers();
            let clients = yield user.getAllClients();
            let connecteds = yield user.getAllOnlineUsers();
            let denied = yield event.countDeniedUserConnections();
            let ttUsers = users.length;
            let ttClients = clients.length;
            let ttConnectedUsers = connecteds.length;
            let ttDeniedUsers = denied.length;
            return res.status(201).json({
                users: ttUsers,
                clients: ttClients,
                connectedUsers: ttConnectedUsers,
                deniedUsers: ttDeniedUsers
            });
        }
        catch (err) {
            return next(err);
        }
    });
});
// Get data to draw an activity users by client.
app.post('/get-statistics-for-graph', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let events = yield event.getStadisticsForGraph();
            let newArr = [];
            for (let clientName in events.data) {
                newArr.push(events.data[clientName]);
                events.data[clientName].sort();
            }
            return res.status(201).json({
                clients: newArr,
                colors: events.colors
            });
        }
        catch (err) {
            return next(err);
        }
    });
});
//Valida conexión con el cliente.
setInterval(() => {
    wss.clients.forEach((ws, data) => {
        const extWs = ws;
        if (!extWs.isAlive) {
            Log_1.Log.create("Servidor" /* Server */, "", "Envio de Mensaje" /* Message */, "Conexión sin respuesta. Cerrar la conexión.");
            let _event = {
                environment: "Servidor" /* Server */,
                tokenWebSocket: null,
                sessionId: null,
                client: 'Servidor',
                username: 'Admin',
                message: "Conexión sin respuesta. Cerrar la conexión.",
                event: "Envio de Mensaje" /* Message */
            };
            event.save(_event);
            return ws.terminate();
        }
        extWs.isAlive = false;
        ws.ping(null, undefined);
    });
}, 10000);
//Inicializamos el server.
server.listen(process.env.PORT || port, 'ts-node-session-control.herokuapp.com', () => {
    Log_1.Log.create("Servidor" /* Server */, "", "Servicio Inicializado" /* Open */, "Servicio inicializado. (puerto: " + port + ")");
    if (mongoose.connection.readyState === 1) {
        mongoose.disconnect();
    }
    mongoose.connect(mongooseUri, optionsDB, function (error) {
        event.save({
            environment: "Servidor" /* Server */,
            tokenWebSocket: null,
            sessionId: null,
            client: 'Servidor',
            username: 'Admin',
            message: "Servicio inicializado.",
            event: "Servicio Inicializado" /* Open */
        });
    });
});
let sendMsgToDisconnectAllUserInstances = function (msg, socketIdAndClientSessionIdMap) {
    if (socketIdAndClientSessionIdMap instanceof Map) {
        for (let [websocketId, client] of CLIENTS) {
            if (socketIdAndClientSessionIdMap.has(websocketId)) {
                client.send(JSON.stringify({ message: msg, event: "Conexion Cerrada" /* Disconnect */, code: 408 /* TimeOut */ }));
                client.terminate();
                CLIENTS.delete(websocketId);
            }
        }
    }
};
//# sourceMappingURL=Server.js.map