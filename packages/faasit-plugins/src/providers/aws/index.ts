import { CreateFunctionCommandInput, Lambda } from '@aws-sdk/client-lambda';
import { faas } from '@faasit/std'
import AdmZip from 'adm-zip'
import { z } from 'zod'

const AwsSecretSchema = z.object({
  // "us-west-2"
  region: z.string(),
  // 'arn:aws:iam::123456789012:role/lambda-role', // 需要替换为实际的 IAM 角色 ARN
  iamRole: z.string()
})

type AwsSecretType = z.infer<typeof AwsSecretSchema>;

export function parseAwsSecret(env: faas.EnvironmentVars): AwsSecretType {
  const obj: Partial<AwsSecretType> = {
    region: env.FAASIT_SECRET_AWS_REGION,
    iamRole: env.FAASIT_SECRET_AWS_IAM_ROLE
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
    const lambda = new Lambda({
      region: secret.region,
    }); // 示例使用 us-west-2 区域
    const params = {
      FunctionName: input.funcName,
      Payload: JSON.stringify(input.input),
    };
    const response = await lambda.invoke(params);
    return JSON.parse(response.Payload?.toString() || '');
  }

  async deployWorkflowApp(p: DeployParams, app: faas.WorkflowApplication) {
    throw new Error('not implemented');
  }

  async deployFunctionApp(p: DeployParams) {
    const logger = p.ctx.logger

    const lambda = new Lambda({
      region: p.secret.region,
    });

    for (const funcRef of p.input.app.output.functions) {
      const func = funcRef.value.output
      const funcName = funcRef.value.$ir.name
      logger.info(`zip codeDir for function=${funcName}`)
      const zipData = await this.zipFunctionCode(func.codeDir);
      const functionData: CreateFunctionCommandInput = {
        FunctionName: funcName,
        Runtime: func.runtime as CreateFunctionCommandInput['Runtime'],
        Role: p.secret.iamRole,
        Handler: func.handler,
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
        if (error.code === 'ResourceConflictException') {
          await lambda.updateFunctionCode({
            FunctionName: funcName,
            ZipFile: zipData,
          });
        } else {
          throw error;
        }
      }
    }
  }

  private async zipFunctionCode(codeDir: string) {
    const zip = new AdmZip()
    zip.addLocalFolder(codeDir)
    return zip.toBuffer()
  }
}


export default function AwsPlugin(): faas.ProviderPlugin {
  return new AwsProvider()
}
