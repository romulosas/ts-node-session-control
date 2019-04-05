"use strict";

import * as Mongoose from 'mongoose';

const mongoose = Mongoose;
let Schema = mongoose.Schema;
let EventSchema = new Schema({
    "environment" : {
        type: String
    },
    "client" : {
        type: String
    },
    "username" : {
        type: String
    },
    "message" : {
        type: String
    },
    "event" : {
        type: String
    },
    "createdAt" : {
        type : Date,
        default: Date.now
    }
});

let Events = mongoose.model('Events', EventSchema);

export class Event {

        constructor(){}

        // Initialize connection once
        public save(event: any)
        {
            Events.create(event, function (err: any, small: any) {
                        if (err){
                            return console.error(err.stack);
                        }                   
            });
        }


        public getStadisticsForGraph()
        {
           return Events.aggregate(
            [{
                $group : {
                    _id: {
                      "Client" : "$client",
                      "Date" : { 
                        "$dateToString": { 
                            format: "%Y-%m-%d", 
                            date: "$createdAt" 
                        }
                      }                 
                    },
                    count: {
                      "$sum": 1
                    },
                    
                },
                
            },
            { 
                $sort : {
                    "_id.Fecha": -1
                }
            }]).then(resp => {
                
                let arr:any[] = [];

                resp.forEach(r => {
                    
                    if(!(r._id.Client in arr))  arr[r._id.Client] = [];

                    //console.log(r._id.Client + " : "+ r._id.Date + " : " + r.count);
                    let dt = r._id.Date.split("-");
                    let y:number  = +dt[0];
                    let m:number  = +dt[1];
                    let d:number  = +dt[2];

                    arr[r._id.Client].push([new Date(y, m, d).getTime(), r.count]);
                    
                });
                return {
                            data: arr,
                            colors: [
                                     "rgba(38, 185, 154, 0.38)", 
                                     "rgba(3, 88, 106, 0.38)",
                                    "rgba(98,103,108,0.9)",
                                    "rgba(215,49,104,0.5)",
                                    "rgba(187,26,4,0.9)",
                                    "rgba(165,125,202,0.9)",
                                    "rgba(77,89,29,0.6)",
                                    "rgba(213,74,96,1.0)",
                                    "rgba(113,230,101,0.7)",
                                    "rgba(106,21,9,0.3)",
                                    "rgba(197,33,85,0.2)",
                                    "rgba(76,39,166,0.9)"
                                    ]
                        };

              });
        }

        public getLastEvents()
        {
            return Events.find().where("event").ne("Envio de Mensaje").sort({'createdAt': 'desc'}).limit(10).exec().then(resp => { 
                return resp;         
            } );
        }

        public countDeniedUserConnections()
        {
            return Events.find().where({"event": "Conexión Rechazada"}).where("client").ne(null).exec().then(resp => { return resp } );
        }

}