import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx"

const env = pulumi.getStack()
const shared = new pulumi.StackReference(`branch-deploys`)

const fargateClusterId = shared.requireOutput("fargateClusterId")
const fargateClusterName = shared.requireOutput("fargateClusterUrn")

// const dbCluster = aws.rds.Cluster.get(sharedDbName, sharedDbProviderId)

const vpc = new awsx.ec2.Vpc("content-platform-vpc", {
    vpc: aws.ec2.Vpc.get("content-platform-vpc", "vpc-08998f718417ed205")
})
const fargate = new awsx.ecs.Cluster(`fargate-cluser-branch-deploys`, {
    cluster: aws.ecs.Cluster.get("fargate-cluser-branch-deploys", "fargate-cluser-branch-deploys"),
    vpc
})
