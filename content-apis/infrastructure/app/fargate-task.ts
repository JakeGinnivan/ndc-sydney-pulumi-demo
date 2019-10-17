import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'

import { fargateTaskResourceProvider } from './fargate-task-resource-provider'

export interface FargateTaskResourceInputs {
    awsRegion: pulumi.Input<string>
    clusterArn: pulumi.Input<string>
    taskDefinitionArn: pulumi.Input<string>
    deleteTaskDefinitionArn?: pulumi.Input<string>
    subnetIds: pulumi.Input<string>[]
    securityGroupIds: pulumi.Input<string>[]
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

        super(fargateTaskResourceProvider, name, { taskArn: undefined, ...resourceArgs }, opts)
    }

    public readonly /*out*/ taskArn!: pulumi.Output<string>
}
