import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'
import * as aws from '@pulumi/aws'

import { FargateTask } from './fargate-task'

export interface ContentApiDatabaseArgs {
    cluster: awsx.ecs.Cluster
    aurora: aws.rds.Cluster
    masterPassword: string
    databaseName: pulumi.Input<string>
    recreate?: pulumi.Input<boolean>
    enableDrop?: pulumi.Input<boolean>
}

/** Content API database resource, database migrations included */
export class ContentApiDatabase extends pulumi.ComponentResource {
    constructor(name: string, private args: ContentApiDatabaseArgs, opts?: pulumi.ResourceOptions) {
        super('aurora:db', name, {}, opts)

        const masterConnectionString = pulumi
            .all([args.aurora.masterUsername, args.masterPassword, args.aurora.endpoint])
            .apply(([username, password, endpoint]) => `pg://${username}:${password}@${endpoint}/postgres`)

        const connectionString = pulumi
            .all([args.aurora.masterUsername, args.masterPassword, args.aurora.endpoint])
            .apply(([username, password, endpoint]) => `pg://${username}:${password}@${endpoint}/${args.databaseName}`)

        const DatabaseMigratorImage = awsx.ecs.Image.fromPath('database-migrator-image', '../../database-migrator')

        /**
         * Database
         */
        const createDbTaskDefinition = new awsx.ecs.FargateTaskDefinition(
            'create-db',
            {
                container: {
                    image: DatabaseMigratorImage,
                    command: pulumi
                        .all([masterConnectionString])
                        .apply(([connectionString]) => [
                            'node',
                            'database-migrator.js',
                            'create-db',
                            `--masterConnectionString=${connectionString}`,
                            `--databaseName=${args.databaseName}`,
                            ...(args.recreate ? ['--recreate'] : []),
                        ]),
                },
            },
            {
                parent: this,
            },
        )

        const dropDbTaskDefinition = new awsx.ecs.FargateTaskDefinition(
            'drop-db',
            {
                container: {
                    image: DatabaseMigratorImage,
                    command: pulumi
                        .all([masterConnectionString])
                        .apply(([connectionString]) => [
                            'node',
                            'database-migrator.js',
                            'drop-db',
                            `--masterConnectionString=${connectionString}`,
                            `--databaseName=${args.databaseName}`,
                        ]),
                },
            },
            {
                parent: this,
            },
        )

        // Creates db on up, drops on destroy if enableDrop specified
        const createDbTask = new FargateTask(
            'create-database-task',
            {
                cluster: this.args.cluster,
                taskDefinition: createDbTaskDefinition,
                deleteTask: args.enableDrop ? dropDbTaskDefinition : undefined,
            },
            {
                parent: this,
                dependsOn: args.enableDrop ? [createDbTaskDefinition, dropDbTaskDefinition] : [createDbTaskDefinition],
            },
        )

        /**
         * Database migrations
         */
        const runMigrationsTask = new awsx.ecs.FargateTaskDefinition(
            'run-migrations',
            {
                container: {
                    image: DatabaseMigratorImage,
                    environment: [],
                    command: pulumi
                        .all([connectionString])
                        .apply(([cs]) => [
                            'node',
                            'database-migrator.js',
                            `--connectionString=${cs}`,
                            `--databaseName=${args.databaseName}`,
                            '--app=newssite',
                        ]),
                },
            },
            {
                parent: this,
            },
        )

        const dbMigratorTask = new FargateTask(
            'run-db-migrations',
            {
                cluster: this.args.cluster,
                taskDefinition: runMigrationsTask,
            },
            {
                parent: this,
                dependsOn: [createDbTask, runMigrationsTask],
            },
        )

        this.createDbTaskArn = createDbTask.taskArn
        this.dbMigrateTaskArn = dbMigratorTask.taskArn
        this.registerOutputs({
            createDbTaskArn: this.createDbTaskArn,
            dbMigrateTaskArn: this.dbMigrateTaskArn,
        })
    }

    public readonly /*out*/ createDbTaskArn: pulumi.Output<string>
    public readonly /*out*/ dbMigrateTaskArn: pulumi.Output<string>
}
