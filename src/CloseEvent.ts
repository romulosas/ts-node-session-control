"use strict";

import { Event as EventInCloseEvents }  from "./db/Event";
import { User  }  from "./db/User";
import { Log } from "./Log";
import { AgentMessage }  from "./enum/AgentMessage";
import { EventType } from "./enum/EventType";
import { DisconnectType } from "./enum/DisconnectType";
import { UserActivity } from "./UserActivity";

export class CloseEvent {

        constructor(){}

        public static createMessage(disconnectType: DisconnectType,
                                    clientsSessionsMap: Map<String, Map<String, String>>, 
                                    socketClientId: String, 
                                    clientSesionId: String, 
                                    username: String, 
                                    clientName: String,  
                                    indexMap: String,
                                    origin?:String)
        {

            let event = new EventInCloseEvents();
            let user = new User();
            let _event = null;
            let message = "";
            let userActivity = new UserActivity(indexMap);
            
            switch(disconnectType)
            {
                case DisconnectType.AllInstances:

                    clientsSessionsMap.delete(indexMap); //desconecta todas las instancias del cliente.
                    userActivity.delete();//elimina la última actividad del cliente, ya sabemos que se desconectó.

                    message = username + " se ha desconectado.";
                    Log.create(AgentMessage.Client, clientName, EventType.Disconnect,  message);                
    
                    user.save({
                        client: clientName,
                        username: username,
                        online: 0
                    });

                    _event = { 
                        environment : AgentMessage.Client,
                        tokenWebSocket: socketClientId,
                        sessionId: clientSesionId,
                        client : clientName,
                        username : username,
                        message : message,
                        event : EventType.Disconnect
                    }
                break;
    
                case DisconnectType.UnknownConnection:
                    Log.create(AgentMessage.Client, clientName, EventType.Error,  "Se ha generado un evento de cierre de conexión, aunque el cliente no estuviese conectado.");
                break;
    
                default:
                    
                    let inst = clientsSessionsMap.get(indexMap);
                    //console.log(clientsSessionsMap);
                    if(inst)
                    {
                        inst.delete(socketClientId);

                        //console.log(inst);

                        //En el caso de un según intento de inicio de sesión, igual se elimina el websocket de la cola.
                        if(disconnectType === DisconnectType.NewSessionUnauthorized)
                        {
                            message = "El usuario " + username + " ha intentado empezar una nueva sesión.";
                            Log.create(AgentMessage.Client, clientName, EventType.Disconnect, message);                            
            
                            _event = { 
                                environment : AgentMessage.Client,
                                tokenWebSocket: socketClientId,
                                sessionId: clientSesionId,
                                client : clientName,
                                username : username,
                                message : message,
                                event : EventType.Disconnect
                            }

                        }
                        else 
                        {

                                //Si el cliente no tiene instancias activas, quiere decir que ha cerrado el navegador.
                                if(inst.size === 0)
                                {
                                    message = username + " se ha desconectado.";

                                    _event = { 
                                        environment : AgentMessage.Client,
                                        tokenWebSocket: socketClientId,
                                        sessionId: clientSesionId,
                                        client : clientName,
                                        username : username,
                                        message : message,
                                        event : EventType.Disconnect
                                    }

                                    clientsSessionsMap.delete(indexMap);
                                    let userActivity = new UserActivity(indexMap);
                                    userActivity.delete();

                                    Log.create(AgentMessage.Client, clientName, EventType.Disconnect, message);
                                    
                                    user.save({
                                        client: clientName,
                                        username: username,
                                        online: 0
                                    });
                                }
                                else 
                                {
                                    message = username + " se ha desconectado de una de sus instancias.";
                                    Log.create(AgentMessage.Client, clientName, EventType.Disconnect, message);
                                    

                                    let userActivity = new UserActivity(indexMap);
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

            if(_event){
                event.save(_event);
            }
            
    
            //IMPRIME MENSAJE CON EL TOTAL DE CLIENTES CONECTADOS AL SERVIDOR
            Log.create(AgentMessage.Client, clientName, EventType.Message,  "Clientes conectados: " + clientsSessionsMap.size);
            
        }


}