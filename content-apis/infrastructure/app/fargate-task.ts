import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'

import * as awsSdk from 'aws-sdk'

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

const fargateTaskResourceProvider: pulumi.dynamic.ResourceProvider = {
    async create(inputs: FargateTaskInputs) {
        const { exitCode, taskArn } = await runFargateTask(inputs)

        if (exitCode !== 0) {
            throw new Error(`Task run failed: ${taskArn}`)
        }

        return {
            id: 'not-needed',
            taskArn,
        }
    },

    async update(_id, _oldInputs: FargateTaskInputs, newInputs: FargateTaskInputs) {
        const { exitCode, taskArn } = await runFargateTask(newInputs)
        if (exitCode !== 0) {
            throw new Error(`Task run failed: ${taskArn}`)
        }

        return {
            outs: { taskArn },
        }
    },

    async delete(id, inputs: FargateTaskInputs) {
        if (inputs.deleteTaskDefinitionArn) {
            const { exitCode, taskArn } = await runFargateTask({
                ...inputs,
                taskDefinitionArn: inputs.deleteTaskDefinitionArn,
            })

            if (exitCode !== 0) {
                throw new Error(`Task run failed: ${taskArn}`)
            }
        }
    },

    async diff() {
        return {
            changes: true,
        }
    },
}

export class FargateTask extends pulumi.dynamic.Resource {
    constructor(
        name: string,
        args: {
            cluster: awsx.ecs.Cluster
            taskDefinition: awsx.ecs.FargateTaskDefinition
            deleteTask?: awsx.ecs.FargateTaskDefinition
        },
        opts?: pulumi.CustomResourceOptions,
    ) {
        const awsConfig = new pulumi.Config('aws')

        const securityGroupIds = args.cluster.securityGroups.map(g => g.id)
        const subnetIds = args.cluster.vpc.getSubnetIds('public')

        const resourceArgs: FargateTaskResourceInputs = {
            clusterArn: args.cluster.cluster.arn,
            taskDefinitionArn: args.taskDefinition.taskDefinition.arn,
            deleteTaskDefinitionArn: args.deleteTask ? args.deleteTask.taskDefinition.arn : undefined,
            awsRegion: awsConfig.require('region'),
            subnetIds,
            securityGroupIds,
        }

        // const mergedOptions = pulumi.mergeOptions(opts, {
        //     dependsOn: args.deleteTask
        //         ? [args.cluster, args.taskDefinition, args.deleteTask]
        //         : [args.cluster, args.taskDefinition],
        // })

        super(fargateTaskResourceProvider, name, { taskArn: undefined, ...resourceArgs }, opts)
    }

    public readonly /*out*/ taskArn!: pulumi.Output<string>
}

async function runFargateTask(inputs: FargateRunTask) {
    const ecs = new awsSdk.ECS({ region: 'ap-southeast-2' })

    const result = await ecs
        .runTask({
            cluster: inputs.clusterArn,
            taskDefinition: inputs.taskDefinitionArn,
            launchType: 'FARGATE',

            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets: inputs.subnetIds,
                    securityGroups: inputs.securityGroupIds,
                    assignPublicIp: 'ENABLED',
                },
            },
        })
        .promise()

    if (!result.tasks) {
        throw new Error('Missing tasks')
    }
    if (result.tasks.length !== 1) {
        throw new Error(`Unexpected number of tasks: ${result.tasks.length}`)
    }

    const task = result.tasks[0]
    if (!task.taskArn) {
        throw new Error(`Task missing taskArn`)
    }
    const taskArn = task.taskArn

    const runResult = await ecs
        .waitFor('tasksStopped', {
            tasks: [taskArn],
            cluster: inputs.clusterArn,
        })
        .promise()

    if (!runResult.tasks) {
        throw new Error('Missing tasks')
    }
    if (runResult.tasks.length !== 1) {
        throw new Error(`Unexpected number of tasks: ${runResult.tasks.length}`)
    }
    if (!runResult.tasks[0].containers) {
        throw new Error('Task status is missing container')
    }
    if (runResult.tasks[0].containers.length !== 1) {
        throw new Error(`Unexpected number of containers: ${runResult.tasks[0].containers.length}`)
    }

    return {
        taskArn,
        exitCode: runResult.tasks[0].containers[0].exitCode,
    }
}
