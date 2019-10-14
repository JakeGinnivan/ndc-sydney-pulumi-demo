import * as pulumi from "@pulumi/pulumi"
import * as awsx from "@pulumi/awsx"

import * as awsSdk from "aws-sdk"
import { FargateTask } from "./fargate-task"

export class AuroraDbMigrator extends pulumi.ComponentResource {
    constructor(name: string, private args: AuroraDbMigratorArgs, opts?: pulumi.ResourceOptions) {
        super("aurora:db", name, {}, opts)

        const DatabaseMigratorImage = awsx.ecs.Image.fromPath("database-migrator-image", "../../database-migrator")
        const createDbTask = new awsx.ecs.FargateTaskDefinition(
            "create-db",
            {
                container: {
                    image: DatabaseMigratorImage,
                    environment: [],
                    command: ["node", "create-db"]
                }
            },
            {
                parent: this
            }
        )
        const dropDbTask = new awsx.ecs.FargateTaskDefinition(
            "drop-db",
            {
                container: {
                    image: DatabaseMigratorImage,
                    environment: [],
                    command: ["node", "create-db"]
                }
            },
            {
                parent: this
            }
        )
        const runMigrationsTask = new awsx.ecs.FargateTaskDefinition(
            "run-migrations",
            {
                container: {
                    image: DatabaseMigratorImage,
                    environment: [],
                    command: ["node", "./command1.js"]
                }
            },
            {
                parent: this
            }
        )

        const createDb = new FargateTask(
            "create-database-task",
            {
                cluster: this.args.cluster,
                taskDefinition: createDbTask,
                deleteTask: dropDbTask
            },
            {
                dependsOn: [createDbTask, dropDbTask]
            }
        )

        new FargateTask("run-db-migrations", {
            cluster: this.args.cluster,
            taskDefinition: runMigrationsTask
        })
    }
}

export interface AuroraDbMigratorArgs {
    cluster: awsx.ecs.Cluster
    databaseName: string
}
