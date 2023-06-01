// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher
import { scf } from "tencentcloud-sdk-nodejs-scf";
import config from "config";
import codeToBase64 from "./tool/codeToBase64.js";

const ScfClient = scf.v20180416.Client;
const codeZipFile = codeToBase64("function/src/aPlusB.zip");

// 实例化要请求产品的client对象,clientProfile是可选的
const client = new ScfClient(config.get("clientConfig"));
const params = {
  FunctionName: "aPlusB",
  Code: {
    ZipFile: codeZipFile
  }
};
client.CreateFunction(params).then(
  (data) => {
    console.log(data);
  },
  (err) => {
    console.error("error", err);
  }
);