import {Characteristic, CharacteristicValue, PlatformAccessory, Service} from "homebridge";
import {MqttHomebridgePlatform} from "../platform";
import {MqttClient} from "mqtt";
import {NodeConfig} from "../settings";
import {HandledMqttClient} from "../HandledMqttClient";
import {StateMessage} from "./StateMessage";

export class SwitchAccessory {
    private service: Service;

    /**
     * These are just used to create a working example
     * You should implement your own code to track the state of your accessory
     */
    private state = {
        On: false
    };

    constructor(
        private readonly platform: MqttHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
        private readonly config: NodeConfig,
        private readonly mqttClient: HandledMqttClient
    ) {

        // set accessory information
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, "Longka-Home")
            .setCharacteristic(this.platform.Characteristic.Model, 'Longka-Home-Switch')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, config.uuid);

        // get the LightBulb service if it exists, otherwise create a new LightBulb service
        // you can create multiple services for each accessory
        this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

        // set the service name, this is what is displayed as the default name on the Home app
        // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
        this.service.setCharacteristic(this.platform.Characteristic.Name, config.name);

        // each service must implement at-minimum the "required characteristics" for the given service type
        // see https://developers.homebridge.io/#/service/Lightbulb

        // register handlers for the On/Off Characteristic
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
            .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

        this.listenState();
    }

    /**
     * Handle "SET" requests from HomeKit
     * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
     */
    async setOn(value: CharacteristicValue) {
        this.platform.log.debug("setOn mothod called: ", value);
        if (value) {
            this.mqttClient.publish(this.config.onTopic, "{}");
        } else {
            this.mqttClient.publish(this.config.offTopic, "{}");
        }
        this.platform.log.debug('Set {} On -> {}', this.config.name, value);
    }

    /**
     * Handle the "GET" requests from HomeKit
     * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
     *
     * GET requests should return as fast as possible. A long delay here will result in
     * HomeKit being unresponsive and a bad user experience in general.
     *
     * If your device takes time to respond you should update the status of your device
     * asynchronously instead using the `updateCharacteristic` method instead.

     * @example
     * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
     */
    async getOn(): Promise<CharacteristicValue> {
        return this.state.On;
    }

    listenState(): void {
        this.mqttClient.subscribe(this.config.stateTopic, (message: string) => {
            this.state.On = message == "1";
        })
    }
}
