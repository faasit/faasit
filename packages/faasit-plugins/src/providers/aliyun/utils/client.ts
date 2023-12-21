import FC_Open20210406 from '@alicloud/fc-open20210406';
import * as $OpenApi from '@alicloud/openapi-client';
import { AliyunSecretType } from './secret';

export function createClient(opt: { secret: AliyunSecretType }): FC_Open20210406 {
	const secret = opt.secret
	const config = new $OpenApi.Config({
		accessKeyId: secret.accessKeyId,
		accessKeySecret: secret.accessKeySecret
	});
	config.endpoint = `${secret.accountId}.${secret.region}.fc.aliyuncs.com`;
	return new FC_Open20210406(config);
}