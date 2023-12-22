import { CreateFunctionCommandInput, Lambda, ResourceConflictException } from '@aws-sdk/client-lambda';
import { faas } from '@faasit/std'
import AdmZip from 'adm-zip'
import { z } from 'zod'

const AwsSecretSchema = z.object({
  // "ap-southeast-1"
  region: z.string().default("ap-southeast-1"),
  // 'arn:aws:iam::123456789012:role/lambda-role', // 需要替换为实际的 IAM 角色 ARN
  // IAM Role 在 https://console.aws.amazon.com/iam/home#/roles 中创建，为 Lambda 分配访问 AWS 其他资源的角色
  iamRole: z.string(),
  accessKeyId: z.string(),
  accessKeySecret: z.string(),
})

type AwsSecretType = z.infer<typeof AwsSecretSchema>;

export function parseAwsSecret(env: faas.EnvironmentVars): AwsSecretType {
  const obj: Partial<AwsSecretType> = {
    region: env.FAASIT_SECRET_AWS_REGION,
    iamRole: env.FAASIT_SECRET_AWS_IAM_ROLE,
    accessKeyId: env.FAASIT_SECRET_AWS_ACCESS_KEY_ID,
    accessKeySecret: env.FAASIT_SECRET_AWS_ACCESS_KEY_SECRET,
  }
  return AwsSecretSchema.parse(obj)
}

interface DeployParams {
  ctx: faas.ProviderPluginContext
  input: faas.ProviderDeployInput
  secret: AwsSecretType,
}

class AwsProvider implements faas.ProviderPlugin {
  name: string = 'aws'

  async deploy(input: faas.ProviderDeployInput, ctx: faas.ProviderPluginContext) {
    const secret = parseAwsSecret(ctx.env)
    if (faas.isWorkflowApplication(input.app)) {
      return this.deployWorkflowApp({ ctx, input, secret }, input.app)
    }
    return this.deployFunctionApp({ ctx, input, secret })
  }

  async invoke(input: faas.ProviderInvokeInput, ctx: faas.ProviderPluginContext) {
    const secret = parseAwsSecret(ctx.env)
    const lambda = this.createLambda({ secret });
    const params = {
      FunctionName: input.funcName,
      Payload: JSON.stringify(input.input),
    };
    const response = await lambda.invoke(params);
    const obj = response.Payload?.transformToString();
    console.log(JSON.parse(obj || 'null'))
  }

  async deployWorkflowApp(p: DeployParams, app: faas.WorkflowApplication) {
    throw new Error('not implemented');
  }

  async deployFunctionApp(p: DeployParams) {
    const logger = p.ctx.logger

    const lambda = this.createLambda({ secret: p.secret });

    for (const funcRef of p.input.app.output.functions) {
      const func = funcRef.value.output
      const funcName = funcRef.value.$ir.name
      logger.info(`zip codeDir for function=${funcName}`)
      const zipData = await this.zipFunctionCode(func.codeDir);
      const functionData: CreateFunctionCommandInput = {
        FunctionName: funcName,
        // TODO: transform runtime
        Runtime: 'nodejs16.x',
        Role: p.secret.iamRole,
        // TODO: transform handler
        Handler: func.handler || 'index.handler',
        Code: {
          ZipFile: zipData,
        },
        Environment: {
          Variables: {
            FAASIT_PROVIDER: "aws",
            FAASIT_APP_NAME: p.input.app.$ir.name,
            FAASIT_FUNC_NAME: funcName,
            FAASIT_WORKFLOW_FUNC_NAME: funcName
          }
        }
      };

      // Create or update function
      try {
        logger.info(`create lambda for function=${funcName}`)
        await lambda.createFunction(functionData);
      } catch (error) {
        if (error instanceof ResourceConflictException) {
          await lambda.updateFunctionCode({
            FunctionName: funcName,
            ZipFile: zipData,
          });
        } else {
          throw error;
        }
      }

      logger.info(`deploy function=${funcName} success`)
    }

  }

  private async zipFunctionCode(codeDir: string) {
    const zip = new AdmZip()
    zip.addLocalFolder(codeDir)
    return zip.toBuffer()
  }

  private createLambda(opt: { secret: AwsSecretType }) {
    return new Lambda({
      region: opt.secret.region,
      credentials: {
        accessKeyId: opt.secret.accessKeyId,
        secretAccessKey: opt.secret.accessKeySecret,
      }
    })
  }
}


export default function AwsPlugin(): faas.ProviderPlugin {
  return new AwsProvider()
}
