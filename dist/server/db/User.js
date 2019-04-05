"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Mongoose = require("mongoose");
const mongoose = Mongoose;
let Schema = mongoose.Schema;
let UserSchema = new Schema({
    "client": {
        type: String
    },
    "username": {
        type: String
    },
    "online": {
        type: Number
    },
    "updatedAt": {
        type: Date,
        default: Date.now
    }
});
let Users = mongoose.model('Users', UserSchema);
class User {
    constructor() { }
    save(user) {
        Users.find().where({ 'username': user.username }).exec().then(u => {
            if (u.length > 0) {
                //Actualiza status del usuario.
                let cond = { '_id': u[0]._id };
                Users.updateOne(cond, user, function (err, small) {
                    if (err) {
                        return console.error("Error al actualizar un usuario. (" + err.stack + ")");
                    }
                });
            }
            else {
                //Agrega un nuevo usuario.
                Users.create(user, function (err, small) {
                    if (err) {
                        return console.error("Error al guardar un usuario. (" + err.stack + ")");
                    }
                });
            }
        }).catch(error => {
            console.log("Error al actualizar status del usuario " + user.username + ".");
        });
    }
    getAllUsers() {
        return Users.find().exec().then(resp => { return resp; });
    }
    getAllClients() {
        return Users.distinct('client').exec().then(resp => { return resp; });
    }
    getLastOnlineUsers() {
        return Users.find().where({ "online": 1 }).sort({ 'updatedAt': 'desc' }).limit(10).exec().then(resp => { return resp; });
    }
    getAllOnlineUsers() {
        return Users.find().where({ "online": 1 }).exec().then(resp => { return resp; });
    }
    getStadisticsForGraph() {
        return false;
    }
}
exports.User = User;
//# sourceMappingURL=User.js.map