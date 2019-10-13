yarn 1 <projectname>

rec.s3.bucket.name
rec.s3.object.key

* Create bucket + website.indexDocument=index.htm

* const bucketSubscription = bucket.onObjectCreated("on-new", async e => {

```
const marked = require("marked") as typeof import("marked")
const s3 = new aws.sdk.S3()
for (const rec of e.Records) {
    if (!rec.s3.object.key.endsWith(".md")) continue

    const data = await s3.getObject({ Bucket, Key }).promise()
        
    if (!data.Body) continue

    const html = toPage(rec.s3.bucket.name, marked(data.Body.toString()))
    const htmlFile = rec.s3.object.key.replace(/\.md$/, ".htm")

    await s3
        .putObject({
            Bucket,
            Key: htmlFile,
            Body: html,
            ContentType: "text/html",
            ACL: "public-read"
        })
        .promise()
}
```

* Sync the files

```
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
```