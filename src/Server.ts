"use strict";

import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as Cors from 'cors';
import * as BodyParser from 'body-parser';
import { Log } from "./Log";
import { AgentMessage } from "./enum/AgentMessage";
import { EventType } from "./enum/EventType";
import { DisconnectType }  from "./enum/DisconnectType";
import { Event } from "./db/Event";
import { User } from "./db/User";
import { CloseEvent } from "./CloseEvent";
import { CodeMessage } from "./enum/CodeMessage";
import { UserActivity } from "./UserActivity";
import * as Mongoose from 'mongoose';

//Server config variables.
const event = new Event();
const user = new User();
const mongoose = Mongoose;
const app = express();
const cors = Cors;
const bp = BodyParser;
const clientsDomainlist = [];
const mongooseUri = "mongodb://admin:admin123@ds135456.mlab.com:35456/ts-node-session-control";
//const mongooseUri     = "mongodb://localhost:27017/local";
const optionsDB = {
    useNewUrlParser: true,
    autoIndex: false, // Don't build indexes
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 500, // Reconnect every 500ms
    poolSize: 10, // Maintain up to 10 socket connections
    // If not connected, return errors immediately rather than waiting for reconnect
    bufferMaxEntries: 0,
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4 // Use IPv4, skip trying IPv6
};

const port:number = 3000;
const options = {

    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "X-Access-Token"],
    credentials: true,
    methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
    origin: function (origin: string, callback: any) 
    {
        callback(null, true);
        /*if (clientsDomainlist.indexOf(origin) !== -1) {
        callback(null, true)
        } else {
            Log.create(AgentMessage.Server, "", EventType.Deny, "Intento de acceso no autorizado. (" + origin +")");
            callback(new Error('Acceso no autorizado.'))
        }*/
    },

    preflightContinue: false
}

app.use(bp.urlencoded({extended: false}));
app.use(bp.json())
app.use(cors(options));

//INSTANCIA Y LEVANTA EL SERVIDOR
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

//let client: Client;
var sessionsMapByUserAndClientName = new Map<String, Map<String, String>>();
var socketIdAndClientSessionIdMap = new Map<String, String>();
let disconnectType: DisconnectType;
var CLIENTS = new Map<String, WebSocket>();

//Declara interface y variable de controle de sesión.
interface ExtWebSocket extends WebSocket {
    isAlive: boolean;
}

//Declaramos el evento de conexión a la instancia WebSocket.
wss.on('connection', (ws: WebSocket, req) => {

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
    const extWs = ws as ExtWebSocket;
    extWs.isAlive = true;

    //Se cierra la conexión si el servidor no recibe los 3 datos necesarios para empezar una conexión
    if (arrClientData.length !== 3) {
        Log.create(AgentMessage.Server, "", EventType.Message, " El acceso no ha sido identificado.");
        disconnectType = DisconnectType.UnknownConnection;
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

                disconnectType = DisconnectType.NewSessionUnauthorized;//Se agrega al mapa de acceso del cliente, los datos asociados al nuevo socket id.(Se genera al abrir una nueva pestaña)

                Log.create(AgentMessage.Client, clientName, EventType.Deny, username + " ya está conectado.");

                ws.send(JSON.stringify({ time: Log.getTime(), message: username + " ya está conectado.", event: EventType.Deny, code: CodeMessage.Forbidden }));

                event.save({
                    environment: AgentMessage.Client,
                    tokenWebSocket: socketClientId,
                    sessionId: clientSesionId,
                    client: clientName,
                    username: username,
                    message: "Intento de doble sesión, el usuario ya se encuentra conectado.",
                    event: EventType.Deny
                });

                ws.close();

                disconnectType = DisconnectType.Init; //Forza un valor que no esté en ninguna condición.
            }
            else {
                //Agrega nueva instancia de acceso del usuario.
                let cli = sessionsMapByUserAndClientName.get(indexMap);
                if (cli) {
                    cli.set(socketClientId, clientSesionId); //client.username, clientDataMap

                    Log.create(AgentMessage.Client, clientName, EventType.Connect, username + " ha abierto una nueva pestaña.");

                    // event.save({
                    //     environment: AgentMessage.Client,
                    //     tokenWebSocket: socketClientId,
                    //     sessionId: clientSesionId,
                    //     client: clientName,
                    //     username: username,
                    //     message: username + " ha abierto una nueva pestaña.",
                    //     event: EventType.Connect
                    // });

                    Log.create(AgentMessage.Client, clientName, EventType.Message, username + " tiene " + cli.size + " instancias en paralelo.");
                    
                    // event.save({
                    //     environment: AgentMessage.Client,
                    //     tokenWebSocket: socketClientId,
                    //     sessionId: clientSesionId,
                    //     client: clientName,
                    //     username: username,
                    //     message: username + " tiene " + cli.size + " instancias en paralelo.",
                    //     event: EventType.Message
                    // });

                    let userActivity = new UserActivity(indexMap);
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

        Log.create(AgentMessage.Client, clientName, EventType.Connect, username + " se ha conectado. (" + origin + ")");
        
        event.save({
            environment: AgentMessage.Client,
            tokenWebSocket: socketClientId,
            sessionId: clientSesionId,
            client: clientName,
            username: username,
            message: username + " se ha conectado. (" + origin + ")",
            event: EventType.Connect
        });

        user.save({
            client: clientName,
            username: username,
            online: 1
        });

        let userActivity = new UserActivity(indexMap);
        userActivity.set();
    }

    ws.on('pong', () => {

        let userActivity = new UserActivity(indexMap);

        if (userActivity.shouldLogoutForInactivity()) {
            sendMsgToDisconnectAllUserInstances("Sesión expirada por falta de actividad en el servidor.", sessionsMapByUserAndClientName.get(indexMap));
        }
        else {
            extWs.isAlive = true;
        }
       
    });

    ws.on('message', (message: string) => {

        Log.create(AgentMessage.Client, clientName, EventType.Message, username + " ha enviado un mensaje: " + message);
        

        if (message == 'disconnect') {

            event.save({
                environment: AgentMessage.Client,
                tokenWebSocket: socketClientId,
                sessionId: clientSesionId,
                client: clientName,
                username: username,
                message: "Mensaje recibido: " + message,
                event: EventType.Message
            });

            ws.send(JSON.stringify({ time: Log.getTime(), message: "Cerrando la sesión por timeout.", event: EventType.Disconnect, code: CodeMessage.TimeOut }));

            message = 'El admin ha desconectado a ' + username + " por inactividad.";
            Log.create(AgentMessage.Client, clientName, EventType.Disconnect, message);

            event.save({
                environment: AgentMessage.Client,
                tokenWebSocket: socketClientId,
                sessionId: clientSesionId,
                client: clientName,
                username: username,
                message: message,
                event: EventType.Disconnect
            });

            sendMsgToDisconnectAllUserInstances("Sesión expirada.", sessionsMapByUserAndClientName.get(indexMap));

            user.save({
                client: clientName,
                username: username,
                online: 0
            });

            ws.terminate();

        } else if (message == 'logout') {

            event.save({
                environment: AgentMessage.Client,
                tokenWebSocket: socketClientId,
                sessionId: clientSesionId,
                client: clientName,
                username: username,
                message: "Mensaje recibido: " + message,
                event: EventType.Message
            });

            ws.send(JSON.stringify({ time: Log.getTime(), message: "Ejecutando solicitud de logout.", event: EventType.Disconnect, code: CodeMessage.Logout }));

            message = 'El usuario ha cerrado la sesión.';
            Log.create(AgentMessage.Client, clientName, EventType.Disconnect, message);

            event.save({
                environment: AgentMessage.Client,
                tokenWebSocket: socketClientId,
                sessionId: clientSesionId,
                client: clientName,
                username: username,
                message: message,
                event: EventType.Disconnect
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

            ws.send(JSON.stringify({ time: Log.getTime(), message: "Mensaje recibido: " + message, event: EventType.Message }));

            event.save({
                environment: AgentMessage.Client,
                tokenWebSocket: socketClientId,
                sessionId: clientSesionId,
                client: clientName,
                username: username,
                message: "Mensaje recibido: " + message,
                event: EventType.Message
            });

            let userActivity = new UserActivity(indexMap);
            userActivity.set();

        }

    });

    ws.on('error', (err) => {
        Log.create(AgentMessage.Client, clientName, EventType.Error, "Ops, hubo un error. (" + err + ")");
        
        ws.send(JSON.stringify({ time: Log.getTime(), message: "Ops, hubo un error. (" + err + ")", event: EventType.Error }));

        let _event: any = {
            environment: AgentMessage.Server,
            tokenWebSocket: socketClientId,
            sessionId: clientSesionId,
            client: clientName,
            username: username,
            message: "Ops, hubo un error. (" + err + ")",
            event: EventType.Error
        }

        event.save(_event);

    });

    ws.on('close', (err, res) => {
        if (sessionsMapByUserAndClientName.has(indexMap)) {
            CloseEvent.createMessage(disconnectType, sessionsMapByUserAndClientName, socketClientId, clientSesionId, username, clientName, indexMap, origin);
        } else {
            user.save({
                client: clientName,
                username: username,
                online: 0
            });
        }
    });

});

//Get the lastest 10 events.
app.post('/get-last-events', async function(req, res, next){
    try 
    {
        const lastEvents = await event.getLastEvents();

        return res.status(201).json(
            {
                data: lastEvents.reverse()
            }
        );
    }
    catch(err) 
    {
        return next(err);
    }
});

//Get the lastest 10 connected users.
app.post('/get-connected-users', async function(req, res, next){
    try 
    {
        const users = await user.getLastOnlineUsers();

        return res.status(201).json({data: users});
    }
    catch(err) 
    {
        return next(err);
    }
});

//Get total users, total connected users, denied users and total clients.
app.post('/get-totals', async function(req, res, next){
    try 
    {
        let users:any[]         = await user.getAllUsers();
        let clients:any[]       = await user.getAllClients();
        let connecteds:any[]    = await user.getAllOnlineUsers();
        let denied:any[]        = await event.countDeniedUserConnections();

        let ttUsers:Number                = users.length;
        let ttClients:Number              = clients.length;
        let ttConnectedUsers:Number       = connecteds.length;
        let ttDeniedUsers:Number          = denied.length;
        
        return res.status(201).json(
            {
                users: ttUsers,
                clients: ttClients,
                connectedUsers: ttConnectedUsers,
                deniedUsers: ttDeniedUsers
            }
        );
    }
    catch(err) 
    {
        return next(err);
    }
});

// Get data to draw an activity users by client.
app.post('/get-statistics-for-graph', async function(req, res, next){
    try
    {
        let events:any = await event.getStadisticsForGraph();
        let newArr:any[] = [];

        for(let clientName in events.data){
            newArr.push(events.data[clientName]);
            events.data[clientName].sort();
        }

        return res.status(201).json(
            {
                clients: newArr,
                colors: events.colors
            }
        );

    } catch(err){
        return next(err);
    }
});

//Valida conexión con el cliente.
setInterval(() => {

    wss.clients.forEach((ws: WebSocket, data) => {
        const extWs = ws as ExtWebSocket;

        if (!extWs.isAlive) {
            Log.create(AgentMessage.Server, "", EventType.Message, "Conexión sin respuesta. Cerrar la conexión.");
            

            let _event: any = {
                environment: AgentMessage.Server,
                tokenWebSocket: null,
                sessionId: null,
                client: 'Servidor',
                username: 'Admin',
                message: "Conexión sin respuesta. Cerrar la conexión.",
                event: EventType.Message
            }

            event.save(_event);

            return ws.terminate();
        }

        extWs.isAlive = false;

        ws.ping(null, undefined);

    });
}, 10000);

//Inicializamos el server.
server.listen(process.env.PORT || port, '127.0.0.1', () => {
    Log.create(AgentMessage.Server, "", EventType.Open, "Servicio inicializado. (puerto: " + port + ")");
    
    if(mongoose.connection.readyState === 1){
        mongoose.disconnect();
    }

    mongoose.connect(mongooseUri, optionsDB, function(error) {
        event.save({
            environment: AgentMessage.Server,
            tokenWebSocket: null,
            sessionId: null,
            client: 'Servidor',
            username: 'Admin',
            message: "Servicio inicializado.",
            event: EventType.Open
        });
    });

});

let sendMsgToDisconnectAllUserInstances = function (msg: String, socketIdAndClientSessionIdMap: Map<String, String> | undefined) {
    if (socketIdAndClientSessionIdMap instanceof Map) {
        for (let [websocketId, client] of CLIENTS) {
            if (socketIdAndClientSessionIdMap.has(websocketId)) {
                client.send(JSON.stringify({ message: msg, event: EventType.Disconnect, code: CodeMessage.TimeOut }));
                client.terminate();
                CLIENTS.delete(websocketId);
            }
        }
    }
}

