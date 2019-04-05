"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Mongoose = require("mongoose");
const mongoose = Mongoose;
let Schema = mongoose.Schema;
let EventSchema = new Schema({
    "environment": {
        type: String
    },
    "client": {
        type: String
    },
    "username": {
        type: String
    },
    "message": {
        type: String
    },
    "event": {
        type: String
    },
    "createdAt": {
        type: Date,
        default: Date.now
    }
});
let Events = mongoose.model('Events', EventSchema);
class Event {
    constructor() { }
    // Initialize connection once
    save(event) {
        Events.create(event, function (err, small) {
            if (err) {
                return console.error(err.stack);
            }
        });
    }
    getLastEvents() {
        return Events.find().where("client").ne(null).sort({ 'createdAt': 'descending' }).limit(10).exec().then(resp => { return resp; });
    }
    countUsers() {
        return Events.distinct('username').where("username").ne(null).exec().then(resp => { return resp; });
    }
    countClients() {
        return Events.distinct('client').where("client").ne(null).exec().then(resp => { return resp; });
    }
    //.sort({ createdAt: 'desc'})
    // public countConnectedUsers()
    // {
    //     return Events.distinct('client').where("client").ne(null).exec().then(resp => { return resp } );
    // }
    // public countDisconnectedUsers()
    // {
    //     return Events.countDocuments({ event:'Conexion Cerrada' }).where("client").ne(null).exec().then(resp => { return resp } );
    // }
    countDeniedUserConnections() {
        return Events.find().where({ "event": "Conexión Rechazada" }).where("client").ne(null).exec().then(resp => { return resp; });
    }
}
exports.Event = Event;
//# sourceMappingURL=Event.1.js.map