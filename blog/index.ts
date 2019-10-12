import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"

import * as fs from "fs"
import * as mime from "mime"
import * as path from "path"

const bucket = new aws.s3.Bucket("blog-bucket", {
    website: {
        indexDocument: "index.htm"
    },
    forceDestroy: true
})

const bucketSubscription = bucket.onObjectCreated(
    "on-new",
    async e => {
        if (!e.Records) {
            return
        }

        const marked = require("marked") as typeof import("marked")
        const s3 = new aws.sdk.S3()
        for (const rec of e.Records) {
            if (!rec.s3.object.key.endsWith(".md")) {
                continue
            }

            const data = await s3
                .getObject({
                    Bucket: rec.s3.bucket.name,
                    Key: rec.s3.object.key
                })
                .promise()
            if (!data.Body) {
                continue
            }

            const html = toPage(
                rec.s3.bucket.name,
                marked(data.Body.toString())
            )

            await s3
                .putObject({
                    Bucket: rec.s3.bucket.name,
                    Key: rec.s3.object.key.replace(/\.md$/, ".htm"),
                    Body: html,
                    ContentType: "text/html",
                    ACL: "public-read"
                })
                .promise()
        }
    },
    {}
)

const assetsRootPath = path.join(__dirname, "files")
crawlDirectory(assetsRootPath, (filePath: string) => {
    const relativeFilePath = filePath.replace(assetsRootPath + "/", "")

    new aws.s3.BucketObject(
        relativeFilePath,
        {
            key: relativeFilePath,

            acl: "private",
            bucket,
            contentType: mime.getType(filePath) || undefined,
            source: new pulumi.asset.FileAsset(filePath)
        },
        {
            parent: bucketSubscription.func
        }
    )
})

// crawlDirectory recursive crawls the provided directory, applying the provided function
// to every file it contains. Doesn't handle cycles from symlinks.
function crawlDirectory(dir: string, f: (_: string) => void) {
    const files = fs.readdirSync(dir)

    for (const file of files) {
        const filePath = `${dir}/${file}`
        const stat = fs.statSync(filePath)

        if (stat.isDirectory()) {
            crawlDirectory(filePath, f)
        }

        if (stat.isFile()) {
            f(filePath)
        }
    }
}

export const bucketName = bucket.id
export const publicUrl = bucket.websiteEndpoint

function toPage(title: string, content: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${title}</title>
    <link rel="stylesheet" href="/main.css">
</head>
<body>
    ${content}
</body>
</html>`
}
