import {MqttClient, connect} from "mqtt";
import {Connection} from "./settings";
import {Logger} from "homebridge";
import {rejects} from "assert";

export class HandledMqttClient {
    private mqttClient: MqttClient;
    private callbacks: any;
    constructor(private connection: Connection, public readonly log: Logger) {
        this.callbacks = {};
    }

    start(): Promise<boolean> {
        this.log.info("Starting MQTT connection....");
        return new Promise<boolean>(((resolve, reject) => {
            this.mqttClient = connect({
                host: this.connection.host,
                port: this.connection.port,
                auth: this.connection.username + ":" + this.connection.password,
                resubscribe: true,
                clientId: this.connection.clientId
            });
            this.mqttClient.on("connect", () => {
                this.log.info("MQTT connected")
                resolve(true);
            });

            this.mqttClient.on("error", (error) => {
                this.log.error(`MQTT failed to connect to mqtt://${this.connection.host}:${this.connection.port}. error: ${error}, config: ${JSON.stringify(this.connection)}`);
                reject(error);
            });
        }))

    }

    onMessage(topic, message): void {
        if (this.callbacks[topic]) {
            this.callbacks[topic].forEach((callback) => {
                callback(message);
            });
        } else {
            this.log.warn("No subscriber for topic: {}", topic);
        }
    }

    subscribe(topic: string, callback: Function): boolean {
        if (!this.callbacks[topic]) {
            this.callbacks[topic] = [];
        }
        this.mqttClient.subscribe(topic, () => {
            this.log.info("Subscribed topic:", topic);
            this.callbacks[topic].push(callback);
        });
        return true;
    }

    publish(topic: string, message: any) {
        let payload = message instanceof Object ? JSON.stringify(message) : message;
        this.log.info("Publishing message {} to topic {}", message, topic);
        this.mqttClient.publish(topic, payload);
    }
}
