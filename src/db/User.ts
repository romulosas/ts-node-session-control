"use strict";

import * as Mongoose from 'mongoose';

const mongoose = Mongoose;
let Schema = mongoose.Schema;
let UserSchema = new Schema({
    "client" : {
        type: String
    },
    "username" : {
        type: String
    },
    "online" : {
        type: Number
    },
    "updatedAt" : {
        type : Date,
        default: Date.now
    }
});

let Users = mongoose.model('Users', UserSchema);

export class User {

        constructor(){}

        public save(user: any)
        {
            Users.find().where({ 'username' : user.username}).exec().then(u => {
                
                if(u.length>0)
                {
                    //Actualiza status del usuario.
                    let cond = {'_id' : u[0]._id};
                    Users.updateOne(cond, user, function (err: any, small: any) {
                        if (err){
                            return console.error("Error al actualizar un usuario. (" + err.stack +")");
                        } 
                    });       
                } 
                else 
                {
                    //Agrega un nuevo usuario.
                    Users.create(user, function (err: any, small: any) {
                        if (err){
                            return console.error("Error al guardar un usuario. (" + err.stack +")");
                        }                   
                    });         
                }               
            }).catch(error => {
                console.log("Error al actualizar status del usuario " + user.username + ".");
            });
            
        }

        public getAllUsers()
        {
            return Users.find().exec().then(resp => { return resp } );
        }

        public getAllClients()
        {
            return Users.distinct('client').exec().then(resp => { return resp } );
        }

        public getLastOnlineUsers()
        {
            return Users.find().where({"online":1}).sort({'updatedAt': 'desc'}).limit(10).exec().then(resp => { return resp } );
        }

        public getAllOnlineUsers()
        {
            return Users.find().where({"online":1}).exec().then(resp => { return resp } );
        }

        public getStadisticsForGraph(){
               return false;         
        }
        
}