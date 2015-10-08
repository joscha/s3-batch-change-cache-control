# S3 Cache-Control metadata batch changes

With this tool you can change the `Cache-Control` header of multiple S3 objects in batch.


## Usage

```console
npm start -- --bucket=your-s3-bucket --profile=your-aws-profile --dry-run apply
```

Once you are satisfied with the output, remove the `dry-run` flag :)

## Options
For help about (more) options, run `npm start`.

## Hint
Make a backup of your data before using this tool with:

```console
pip install s4cmd
s4cmd cp -r -s s3://your-s3-bucket/prefix s3://your-s3-bucket/backup/prefix
```

Beware: Downloading the files to your local disk and re-uploading is technically not a full backup, as it will not retain any meta data - copying within the Bucket will retain the meta data.
