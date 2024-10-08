/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'HomebridgeCustomMQTT';

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = 'homebridge-custom-mqtt';

export interface Connection {
    clientId: string;
    username: string;
    password: string;
    api: string;
    token: string;
}


export interface NodeConfig {
    name: string;
    type: string;
    id: number;
    uuid: string;
    onTopic: string;
    offTopic: string;
    stateTopic: string;
    state: boolean;
}

export interface DeviceConfig {
    name: string;
    id: number;
    uuid: string;
    nodes: NodeConfig[]
}

export interface HomeConfig {
    id: number;
    uuid: string;
    devices: DeviceConfig[]
}

export interface MqttPlatformConfig {
    name: string;
    platform: string;
    connection: Connection;
    home: HomeConfig;
}
