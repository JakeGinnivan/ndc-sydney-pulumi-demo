import * as awsSdk from 'aws-sdk'

export interface FargateRunTask {
    awsRegion: string
    clusterArn: string
    taskDefinitionArn: string
    subnetIds: string[]
    securityGroupIds: string[]
}

export async function runFargateTask(inputs: FargateRunTask) {
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
