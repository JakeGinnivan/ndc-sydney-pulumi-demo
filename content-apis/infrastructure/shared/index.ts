import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as awsx from '@pulumi/awsx'

const cluster = new awsx.ecs.Cluster('fargate-cluser')

const vpcSecurityGroupIds = cluster.securityGroups.map(group => group.id)
const postgresSubnetGroup = new aws.rds.SubnetGroup('content-platform-database-subnet', {
    subnetIds: cluster.vpc.getSubnetIds('public'),
})

const postgresql = new aws.rds.Cluster('aurora-cluser', {
    engine: 'aurora-postgresql',
    engineVersion: '9.6.12',
    skipFinalSnapshot: true,
    masterUsername: 'this_should_be',
    masterPassword: 'in_secrets_managment',
    vpcSecurityGroupIds: vpcSecurityGroupIds,
    dbSubnetGroupName: postgresSubnetGroup.name,
})

new aws.rds.ClusterInstance(`aurora-instance-1`, {
    clusterIdentifier: postgresql.id,
    instanceClass: aws.rds.InstanceTypes.R5_Large,
    engine: 'aurora-postgresql',
})

export const databaseProviderId = postgresql.id
export const fargateClusterName = cluster.cluster.name
export const fargateVpcId = cluster.vpc.vpc.id
export const fargateSecuityGroupIds = cluster.securityGroups.map(group => group.id)
