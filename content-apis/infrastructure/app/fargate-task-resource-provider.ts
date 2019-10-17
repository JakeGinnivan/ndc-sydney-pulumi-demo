import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'

import { runFargateTask, FargateRunTask } from './runFargateTask'

export interface FargateTaskInputs extends FargateRunTask {
    deleteTaskDefinitionArn?: string
}

export const fargateTaskResourceProvider: pulumi.dynamic.ResourceProvider = {
    async create(inputs: FargateTaskInputs) {
        const { exitCode, taskArn } = await runFargateTask(inputs)

        if (exitCode !== 0) {
            throw new Error(`Task run failed: ${taskArn}`)
        }

        return {
            id: 'not-needed',
            taskArn,
        }
    },

    async update(_id, _oldInputs: FargateTaskInputs, newInputs: FargateTaskInputs) {
        const { exitCode, taskArn } = await runFargateTask(newInputs)
        if (exitCode !== 0) {
            throw new Error(`Task run failed: ${taskArn}`)
        }

        return {
            outs: { taskArn },
        }
    },

    async delete(id, inputs: FargateTaskInputs) {
        if (inputs.deleteTaskDefinitionArn) {
            const { exitCode, taskArn } = await runFargateTask({
                ...inputs,
                taskDefinitionArn: inputs.deleteTaskDefinitionArn,
            })

            if (exitCode !== 0) {
                throw new Error(`Task run failed: ${taskArn}`)
            }
        }
    },

    async diff() {
        return {
            changes: true,
        }
    },
}
