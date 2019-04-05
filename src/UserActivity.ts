"use strict";

let _mapClientActivity = new Map<String, Number>();
let _date: Date;
let _indexMap: String = "";
const _timeoutToForceDisconnect = 1800000;//30

export class UserActivity {

    constructor(indexMap: String) {
        _date = new Date();
        _indexMap = indexMap;
    }

    public set() {
        _mapClientActivity.set(_indexMap, _date.getTime());
    }

    public delete() {
        _mapClientActivity.delete(_indexMap);
    }

    public shouldLogoutForInactivity() {

        let lastTime:Number|undefined = _mapClientActivity.get(_indexMap);
        
        if(lastTime){
            let inactivityTime = (_date.getTime() - +lastTime);
             return inactivityTime > _timeoutToForceDisconnect;
        } else {
            return false;
        }
        
    }

    public debug() {
        let lastAct: Number | undefined = _mapClientActivity.get(_indexMap);

        console.log(lastAct);
        if(lastAct instanceof Number){
            console.log("Last activity:" + _mapClientActivity.get(_indexMap) + " Actual: " + _date.getTime());
            console.log("Milisegundos Inactivo: " + (_date.getTime() - +lastAct));
            console.log("Segundos Inactivo: " + ((_date.getTime() - +lastAct) / 1000).toFixed(0));
        } else {
            console.log("Erro: El tiempo de inactividad calculado no es un numero.");
        }
        
    }
}