// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher
import { scf } from "tencentcloud-sdk-nodejs-scf";
import config from "config";

const ScfClient = scf.v20180416.Client;

// 实例化要请求产品的client对象,clientProfile是可选的
const client = new ScfClient(config.get("clientConfig"));
const params = {
  "FunctionName": "helloworld-1685415824",
  "Type": 'apigw',
  "TriggerName": 'apiGatewayTrigger',
  "TriggerDesc": '{}',
};
client.CreateTrigger(params).then(
  (data) => {
    console.log(data);
  },
  (err) => {
    console.error(err);
  }
);