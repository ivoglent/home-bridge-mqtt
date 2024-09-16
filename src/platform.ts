import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import {connect, MqttClient} from "mqtt"
import {MqttPlatformConfig, NodeConfig, PLATFORM_NAME, PLUGIN_NAME} from './settings';
import { ExamplePlatformAccessory } from './platformAccessory';
import {HandledMqttClient} from "./HandledMqttClient";
import {HomeIntegration} from "./HomeIntegration";
import {SwitchAccessory} from "./nodes/SwitchAccessory";
import {platform} from "os";

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class MqttHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private handledMqtt: HandledMqttClient;
  private homeIntegration: HomeIntegration;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig | MqttPlatformConfig,
    public readonly api: API,
  ) {
    this.log.info('Finished initializing platform: {}, config: {}', this.config.name, this.config);

    // Homebridge 1.8.0 introduced a `log.success` method that can be used to log success messages
    // For users that are on a version prior to 1.8.0, we need a 'polyfill' for this method
    if (!log.success) {
      log.success = log.info;
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      if (this.config.connection) {
        //Get service API from mDNS
        const mdns = require('mdns');
        const httpBrowser = mdns.createBrowser(mdns.tcp('http'));
        this.log.info("mDNS looking for http service...");
        let self = this;
        httpBrowser.on('serviceUp', function (service) {
          console.log("Service found:", service);
          if (service.fullname === "register-service._http._tcp.local.") {
            self.homeIntegration = new HomeIntegration(log, service.addresses[0], service.port);
            self.discoverDevices().then((result) => {
              self.log.info("Success discover accessories")
            })
          }

        });
        httpBrowser.on('serviceDown', function (service) {
          console.log("Service down:", service);
        });
        httpBrowser.start();

        const mqttBrowser = mdns.createBrowser(mdns.tcp('mqtt'));
        this.log.info("mDNS looking for mqtt service...");
        mqttBrowser.on('serviceUp', function (service) {
          console.log("Service found:", service);
          if (service.fullname === "mqtt-service._mqtt._tcp.local.") {
            self.handledMqtt = new HandledMqttClient(self.config.connection, service.addresses[0], service.port, log);
            self.handledMqtt.start().then(() => {
              console.log("Connected to MQTT broker!");
            }).catch((err) => {
              self.log.error(err);
            });
          }

        });
        mqttBrowser.on('serviceDown', function (service) {
          console.log("Service down:", service);
        });
        mqttBrowser.start();

      }

    });


  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {
    //Load devices (nodes) from cloud
    let nodes: NodeConfig[] = await this.homeIntegration.getNodes();
    if (nodes.length > 0) {
      for(const nodeConfig of nodes) {
        if (nodeConfig.type === "SWITCH") {
          const uuid = this.api.hap.uuid.generate(nodeConfig.uuid);
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new SwitchAccessory(this, existingAccessory, nodeConfig, this.handledMqtt);
          } else {
            // the accessory does not yet exist, so we need to create it
            this.log.info('Adding new accessory:', nodeConfig.name);
            const accessory = new this.api.platformAccessory(nodeConfig.name, uuid);
            accessory.context.device = nodeConfig;

            // create the accessory handler for the newly create accessory
            // this is imported from `platformAccessory.ts`
            new SwitchAccessory(this, accessory, nodeConfig, this.handledMqtt);
            // link the accessory to your platform
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }
      }
    } else {
      this.log.error("No node config from remote server!");
    }
  }
}
