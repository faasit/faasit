import FC_Open20210406 from '@alicloud/fc-open20210406';
import * as $OpenApi from '@alicloud/openapi-client';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, "./.env") });


export function createClient(): FC_Open20210406 {
    const accessKeyId = process.env.accessID;
	const accessKeySecret = process.env.accessKey;
	const accountID = process.env.accountID;
	const region = process.env.region;
	let config = new $OpenApi.Config({
		accessKeyId: accessKeyId,
		accessKeySecret: accessKeySecret
	});
	config.endpoint = `${accountID}.${region}.fc.aliyuncs.com`;
	return new FC_Open20210406(config);
}