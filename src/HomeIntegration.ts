import {Logger} from "homebridge";
import {Connection, NodeConfig} from "./settings";
import {HttpResponse} from "./dto/HttpResponse";

export class HomeIntegration {
    constructor(public readonly log: Logger, private connection: Connection) {
    }

    async getNodes(): Promise<NodeConfig[]> {
        return new Promise<NodeConfig[]>((async (resolve) => {
            let response = await fetch(this.connection.api + "/bridge/sync-nodes?token=" + this.connection.token);
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
        }))
    }
}
