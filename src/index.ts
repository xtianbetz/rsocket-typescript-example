#!/usr/bin/env node

import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import program from 'commander';

import RSocketWebSocketClient from 'rsocket-websocket-client';
import {RSocketClient, MAX_STREAM_ID} from 'rsocket-core';
import {Responder, Payload, ReactiveSocket, ISubscription}  from 'rsocket-types';
import {Flowable, Single}  from 'rsocket-flowable';
import Deferred from 'fbjs/lib/Deferred'; // TODO: needs typings (we cannot use strict because of this)
import WsWebSocket = require('ws');
// Required the hack to RsocketJS typing...
// * A (node ws) WebSocket is not the same as standard browser/WebSocket
// * Modify this file: node_modules/@types/rsocket-websocket-client/RSocketWebSocketClient.d.ts
// * Add the "import WsWebSocket..." line as shown above
// * replace instances of WebSocket with WsWebSocket
// * See: https://github.com/websockets/ws/pull/1584

console.log(
    chalk.red(
        figlet.textSync('rsocket-typescript', { horizontalLayout: 'full' })
    )
);

program
    .version('0.0.1')
    .description('An rsocket typescript example')
    .option('-h, --host <localhost>', "Host", "localhost")
    .option('-p, --port <8080>', "Port", "8080")
    .parse(process.argv);

var logRequest = console.log;

function make(data: string): Payload<string, string> {
    return {
        data,
        metadata: ''
    }
}

class SymmetricResponder implements Partial<Responder<string, string>> {
    fireAndForget(payload: Payload<string,string>): void {
        logRequest('fnf', payload);
    }

    requestResponse(payload: Payload<string, string>): Single<Payload<string, string>> {
        logRequest('requestResponse', payload);
        return Single.error(new Error());
    }

    requestStream(payload: Payload<string, string>): Flowable<Payload<string, string>> {
        logRequest('requestStream', payload);
        return Flowable.just(make('Hello '), make('world!'));
    }

    requestChannel(payloads: Flowable<Payload<string, string>>): Flowable<Payload<string, string>> {
        return Flowable.error(new Error());
    }

    metadataPush(payload: Payload<string, string>): Single<void> {
        logRequest('metadataPush', payload);
        return Single.error(new Error()); // TODO: is the typing for Single.error() wrong?
    }
}

function doOperation(
  socket: ReactiveSocket<string, string>,
  operation: string,
  payload: string,
): Flowable<Payload<string, string>> {
  switch (operation) {
    case 'none':
      return Flowable.never();
    case 'stream':
    default:
      console.log(`Requesting stream with payload: ${payload}`);
      return socket.requestStream({
        data: payload,
        metadata: '',
      });
  }
}

interface OperationOptions {
    operation: string;
    payload: string;
}

function runOperation(socket: ReactiveSocket<string, string>, options: OperationOptions) {
    const deferred = new Deferred();
    let subscription: ISubscription;
    doOperation(socket, options.operation, options.payload).subscribe({
        onComplete() {
            console.log('onComplete()');
            deferred.resolve();
        },
        onError(error) {
            console.log('onError(%s)', error.message);
            deferred.reject(error);
        },
        onNext(payload) {
            console.log('onNext(%s)', payload.data);
        },
        onSubscribe(_subscription) {
            subscription = _subscription;
            subscription.request(MAX_STREAM_ID);
        },
    });
    return deferred.getPromise();
}

function connect() {
    const client = new RSocketClient<string, string>({
        setup: {
            dataMimeType: 'text/plain',
            keepAlive: 1000000, // TODO ADJUST thIS AFTER TEST
            lifetime: 100000,
            metadataMimeType: 'text/plain'
        },
        responder: new SymmetricResponder(),
        transport: new RSocketWebSocketClient({
            url: "ws://localhost:8080",
            wsCreator: url => {
                return new WsWebSocket(url);
            }
        })
    });

    return client.connect();
}

async function run(options) {
    console.log(`Client connecting to ${options.host}:${options.port}`);
    const socket: ReactiveSocket<string, string> = await connect();
    socket.connectionStatus().subscribe(status => {
        console.log("Connection status:", status);
    });

    return runOperation(socket, options);
}

Promise.resolve(run(program)).then(
    () => {
        console.log('exit');
        process.exit(0);
    },
    error => {
        console.error(error.stack);
        process.exit(1);
    }
);
