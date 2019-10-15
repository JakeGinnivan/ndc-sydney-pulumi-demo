import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as awsx from '@pulumi/awsx'

import { ContentApiDatabase } from './database'

const env = pulumi.getStack()
const config = new pulumi.Config()
const shared = new pulumi.StackReference('shared-infra-stack', { name: config.get('shared-stack-name') || env })

const fargateClusterName = shared.requireOutput('fargateClusterName')
const databaseProviderId = shared.requireOutput('databaseProviderId')

const dbCluster = aws.rds.Cluster.get('aurora', databaseProviderId)

const fargate = new awsx.ecs.Cluster('fargate-cluster', {
    cluster: aws.ecs.Cluster.get('fargate-cluster', fargateClusterName),
})

new ContentApiDatabase('database', {
    aurora: dbCluster,
    cluster: fargate,
    databaseName: env,
    enableDrop: config.getBoolean('enableDrop'),
    recreate: config.getBoolean('recreateDbOnUpdate'),
})
