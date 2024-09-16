import {Logger} from "homebridge";
import {Connection, NodeConfig} from "./settings";
import {HttpResponse} from "./dto/HttpResponse";

export class HomeIntegration {
    constructor(public readonly log: Logger, private address: string, private port: number) {
        this.log.info("Created home integration address: %s port: %d", address, port);
    }

    async getNodes(): Promise<NodeConfig[]> {
        return new Promise<NodeConfig[]>((async (resolve) => {
            const api = "http://" + this.address + ":" + this.port + "/bridge/sync-nodes?token=";
            try {
                let response = await fetch(api);
                if ((response).ok) {
                    let result: HttpResponse<NodeConfig[]> = await response.json() as HttpResponse<NodeConfig[]>;
                    if (result && result.success) {
                        resolve(result.data);
                    } else {
                        this.log.error("Failed to load node list");
                        resolve([]);
                    }
                } else {
                    this.log.error("Failed to load node list: ", response.status);
                    resolve([]);
                }
            } catch (e) {
                this.log.error("Failed to load node list: ", e);
            }
        }))
    }
}
