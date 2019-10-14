import * as pulumi from "@pulumi/pulumi"
import * as awsx from "@pulumi/awsx"

import * as awsSdk from "aws-sdk"

export interface FargateTaskResourceInputs {
    awsRegion: pulumi.Input<string>
    clusterArn: pulumi.Input<string>
    taskDefinitionArn: pulumi.Input<string>
    deleteTaskDefinitionArn?: pulumi.Input<string>
    subnetIds: pulumi.Input<string>[]
    securityGroupIds: pulumi.Input<string>[]
}

interface FargateRunTask {
    awsRegion: string
    clusterArn: string
    taskDefinitionArn: string
    subnetIds: string[]
    securityGroupIds: string[]
}

interface FargateTaskInputs extends FargateRunTask {
    deleteTaskDefinitionArn?: string
}

const fargateTaskService: pulumi.dynamic.ResourceProvider = {
    async create(inputs: FargateTaskInputs) {
        const results = await run(inputs)

        return {
            ...results,
            id: "task-id"
        }
    },

    async update(_id, _oldInputs: FargateTaskInputs, newInputs: FargateTaskInputs) {
        return {
            outs: await run(newInputs)
        }
    },

    async delete(id, inputs: FargateTaskInputs) {
        if (inputs.deleteTaskDefinitionArn) {
            await run({ ...inputs, taskDefinitionArn: inputs.deleteTaskDefinitionArn })
        }
    }
}

export class FargateTask extends pulumi.dynamic.Resource {
    constructor(
        name: string,
        args: {
            cluster: awsx.ecs.Cluster
            taskDefinition: awsx.ecs.FargateTaskDefinition
            deleteTask?: awsx.ecs.FargateTaskDefinition
        },
        opts?: pulumi.CustomResourceOptions
    ) {
        const awsConfig = new pulumi.Config("aws")

        const securityGroupIds = args.cluster.securityGroups.map(g => g.id)
        const subnetIds = args.cluster.vpc.getSubnetIds("public")

        const resourceArgs: FargateTaskResourceInputs = {
            clusterArn: args.cluster.cluster.arn,
            taskDefinitionArn: args.taskDefinition.taskDefinition.arn,
            deleteTaskDefinitionArn: args.deleteTask ? args.deleteTask.taskDefinition.arn : undefined,
            awsRegion: awsConfig.require("region"),
            subnetIds,
            securityGroupIds
        }

        super(fargateTaskService, name, resourceArgs, {
            ...opts,
            // TODO Merge with opts.dependsOn
            dependsOn: args.deleteTask ? [args.taskDefinition, args.deleteTask] : args.taskDefinition
        })
    }
}

async function run(inputs: FargateRunTask) {
    const ecs = new awsSdk.ECS({ region: "ap-southeast-2" })

    const result = await ecs
        .runTask({
            cluster: inputs.clusterArn,
            taskDefinition: inputs.taskDefinitionArn,
            launchType: "FARGATE",

            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets: inputs.subnetIds,
                    securityGroups: inputs.securityGroupIds,
                    assignPublicIp: "ENABLED"
                }
            }
        })
        .promise()

    return {
        tasks: (result.tasks || []).map(task => task.taskArn),
        failures: result.failures
    }
}
