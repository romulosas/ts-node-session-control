"use strict";

import { AgentMessage } from "./enum/AgentMessage";
import { EventType } from "./enum/EventType";

export class Log
{
    public static create(environment:AgentMessage, clientName:String, event:EventType, message:String)
    {
        let agent         = (environment === AgentMessage.Client) ? clientName.toUpperCase() : "SERVIDOR";
        let eventOut = "";
        switch(event)
        {
            case EventType.Open:
            eventOut = "Inicializado";
            break;
    
            case EventType.Connect:
            eventOut = "Conectado";
            break;
    
            case EventType.Message:
            eventOut = "Info";
            break;
    
            case EventType.Deny:
            eventOut = "Rechazado";
            break;
    
            case EventType.Error:
            eventOut = "Error";
            break;
    
            case EventType.Disconnect:
            eventOut = "Desconectado";
            break;        
        }        

        console.log('[' + this.getTime() + '][' + agent + '][' + eventOut + '] - ' + message);
    }

    public static getTime()
    {
        const dt:Date     = new Date();
        return dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
    }

}