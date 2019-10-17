import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as awsx from '@pulumi/awsx'

import { ContentApiDatabase } from './database'

const env = pulumi.getStack()
const config = new pulumi.Config()
const shared = new pulumi.StackReference('shared-infra-stack', {
    name: `JakeGinnivan/content-platform-shared/${config.get('shared-stack-name') || env}`,
})

const fargateClusterName = shared.requireOutput('fargateClusterName')
const databaseProviderId = shared.requireOutput('databaseProviderId')

const dbCluster = aws.rds.Cluster.get('aurora', databaseProviderId)

const fargate = new awsx.ecs.Cluster('fargate-cluster', {
    cluster: aws.ecs.Cluster.get('fargate-cluster', fargateClusterName),
})

const database = new ContentApiDatabase('database', {
    aurora: dbCluster,
    cluster: fargate,
    databaseName: env,
    masterPassword: 'in_secrets_managment',
    enableDrop: config.getBoolean('enableDrop'),
    recreate: config.getBoolean('recreateDbOnUpdate'),
})

const ContentApiImage = awsx.ecs.Image.fromPath('api', '../../content-api')

const connectionString = pulumi
    .all([dbCluster.masterUsername, dbCluster.endpoint])
    .apply(([username, endpoint]) => `pg://${username}:in_secrets_managment@${endpoint}/${env}`)

const apiListener = new awsx.elasticloadbalancingv2.NetworkListener('api', { port: 80 })

new awsx.ecs.FargateService(
    'api',
    {
        cluster: fargate,
        taskDefinitionArgs: {
            container: {
                image: ContentApiImage,
                portMappings: [apiListener],
                environment: connectionString.apply(e => [{ name: 'CONNECTION_STRING', value: e }]),
            },
        },
    },
    {
        dependsOn: database,
    },
)

export const apiEndpoint = apiListener.endpoint
export const createDbTaskArn = database.createDbTaskArn
export const dbMigrateTaskArn = database.dbMigrateTaskArn
