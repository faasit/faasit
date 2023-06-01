// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher
import { scf } from "tencentcloud-sdk-nodejs-scf";
import config from "config";

const ScfClient = scf.v20180416.Client;

// 实例化要请求产品的client对象,clientProfile是可选的
const client = new ScfClient(config.get("clientConfig"));

// 计算a+b
const a = 1;
const b = 2;
const params = {
  "FunctionName": "aPlusB",
  "ClientContext": JSON.stringify({
    a, b
  })
};
client.Invoke(params).then(
  (data) => {
    console.log(data);
    console.log(`a + b = ${data.Result.RetMsg}`);
  },
  (err) => {
    console.error("error", err);
  }
);