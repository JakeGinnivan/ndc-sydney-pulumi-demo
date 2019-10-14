import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx"

const env = pulumi.getStack()
const config = new pulumi.Config()

awsx.ec2.Vpc.fromExistingIds("existing", {
    vpcId: ""
})

const existingVpcId = config.get("vpc-id")

const contentPlatformVpc = existingVpcId
    ? awsx.ec2.Vpc.fromExistingIds("existing", {
          vpcId: existingVpcId
      })
    : new awsx.ec2.Vpc(`content-platform-vpc`, {
          cidrBlock: "172.29.0.0/16",
          enableDnsSupport: true,
          enableDnsHostnames: true,
          subnets: [
              {
                  name: "content-platform-web",
                  type: "private",
                  cidrMask: 24
              },
              {
                  name: "content-platform-midware",
                  type: "private",
                  cidrMask: 24
              },
              {
                  name: "content-platform-db",
                  type: "isolated",
                  cidrMask: 24
              }
          ],
          tags: {
              Stack: env,
              Description: "VPC For Content Platform"
          }
      })

const dbSubnets = contentPlatformVpc.isolatedSubnets.filter(subnet => subnet.subnetName.includes("content-platform-db"))
if (dbSubnets.length === 0) {
    throw new Error("Cant find content-platform-db subnet")
}
const webSubnets = contentPlatformVpc.privateSubnets.filter(subnet =>
    subnet.subnetName.includes("content-platform-web")
)
if (webSubnets.length === 0) {
    throw new Error("Cant find content-platform-web subnet")
}
const midwareSubnets = contentPlatformVpc.privateSubnets.filter(subnet =>
    subnet.subnetName.includes("content-platform-midware")
)
if (midwareSubnets.length === 0) {
    throw new Error("Cant find content-platform-midware subnet")
}

const postgresSubnetGroup = new aws.rds.SubnetGroup("content-platform-database-subnet", {
    subnetIds: dbSubnets.map(subnet => subnet.id)
})
const postgresql = new aws.rds.Cluster(
    "content-platform-database",
    {
        clusterIdentifier: "content-apis-branch-deploys",
        engine: "aurora-postgresql",
        engineVersion: "9.6.12",
        skipFinalSnapshot: true,
        dbSubnetGroupName: postgresSubnetGroup.name
    },
    {}
)

new aws.rds.ClusterInstance(`content-api-aurorainstance-1`, {
    clusterIdentifier: postgresql.id,
    instanceClass: aws.rds.InstanceTypes.R5_Large,
    engine: "aurora-postgresql",
    dbSubnetGroupName: postgresSubnetGroup.name
})

const cluster = new awsx.ecs.Cluster("content-api-fargate", {
    vpc: contentPlatformVpc
})

export const databaseUrn = postgresql.urn
export const databaseProviderId = postgresql.id
export const fargateClusterName = cluster.cluster.name
export const fargateClusterId = cluster.id

export const contentPlatformVpcId = contentPlatformVpc.id

export const webSubnetIds = webSubnets.map(subnet => subnet.id)
export const midwareSubnetIds = midwareSubnets.map(subnet => subnet.id)
export const dbSubnetIds = dbSubnets.map(subnet => subnet.id)
