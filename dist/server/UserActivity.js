"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let _mapClientActivity = new Map();
let _date;
let _indexMap = "";
const _timeoutToForceDisconnect = 1800000; //30
class UserActivity {
    constructor(indexMap) {
        _date = new Date();
        _indexMap = indexMap;
    }
    set() {
        _mapClientActivity.set(_indexMap, _date.getTime());
    }
    delete() {
        _mapClientActivity.delete(_indexMap);
    }
    shouldLogoutForInactivity() {
        let lastTime = _mapClientActivity.get(_indexMap);
        if (lastTime) {
            let inactivityTime = (_date.getTime() - +lastTime);
            return inactivityTime > _timeoutToForceDisconnect;
        }
        else {
            return false;
        }
    }
    debug() {
        let lastAct = _mapClientActivity.get(_indexMap);
        console.log(lastAct);
        if (lastAct instanceof Number) {
            console.log("Last activity:" + _mapClientActivity.get(_indexMap) + " Actual: " + _date.getTime());
            console.log("Milisegundos Inactivo: " + (_date.getTime() - +lastAct));
            console.log("Segundos Inactivo: " + ((_date.getTime() - +lastAct) / 1000).toFixed(0));
        }
        else {
            console.log("Erro: El tiempo de inactividad calculado no es un numero.");
        }
    }
}
exports.UserActivity = UserActivity;
//# sourceMappingURL=UserActivity.js.map