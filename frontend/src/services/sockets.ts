import { io } from 'socket.io-client';

const socket = io('ws://localhost:4000');

export function asyncEmit(eventName, data) {
    return new Promise(function (resolve, reject) {
    socket.emit(eventName, data);
    socket.on(eventName, result => {
            socket.off(eventName);
            resolve(result);
        });
        setTimeout(reject, 1000);
    });
}
