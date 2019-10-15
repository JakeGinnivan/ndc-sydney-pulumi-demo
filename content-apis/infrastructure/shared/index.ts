import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as awsx from '@pulumi/awsx'

const postgresql = new aws.rds.Cluster(
    'aurora-cluser',
    {
        engine: 'aurora-postgresql',
        engineVersion: '9.6.12',
        skipFinalSnapshot: true,
    },
    {},
)

new aws.rds.ClusterInstance(`aurora-instance-1`, {
    clusterIdentifier: postgresql.id,
    instanceClass: aws.rds.InstanceTypes.R5_Large,
    engine: 'aurora-postgresql',
})

const cluster = new awsx.ecs.Cluster('fargate-cluser', {})

export const databaseProviderId = postgresql.id
export const fargateClusterName = cluster.cluster.name
