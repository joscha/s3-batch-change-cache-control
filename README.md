# S3 Cache-Control metadata batch changes

With this tool you can change the `Cache-Control` header of multiple S3 objects in batch.

***
## Getting started

```console
s3-batch-change-cache-control --bucket=your-s3-bucket --profile=your-aws-profile --dry-run apply
```

Once you are satisfied with the output, remove the `dry-run` flag :)

### Logging the output to a file
```console
DEBUG_FD=3 DEBUG=*:info,*:error s3-batch-change-cache-control --bucket=your-s3-bucket --profile=your-aws-profile apply 3> apply.log
```

### Hint
Make a backup of your data before using this tool with:

```console
pip install s4cmd
s4cmd cp -r -s s3://your-s3-bucket/prefix s3://your-s3-bucket/backup/prefix
```

> Beware: Downloading the files to your local disk and re-uploading is technically not a full backup, as it will not retain any meta data - copying within the Bucket will retain the meta data.

***
## Documentation
For help about (more) options, run `npm start`.

***
## How to contribute
The license for this project is Apache-2.0

Please sign the CLA before contributing:

* [Corporate CLA](https://na2.docusign.net/Member/PowerFormSigning.aspx?PowerFormId=e1c17c66-ca4d-4aab-a953-2c231af4a20b)
* [Individual CLA](https://na2.docusign.net/Member/PowerFormSigning.aspx?PowerFormId=3f94fbdc-2fbe-46ac-b14c-5d152700ae5d)

***
##Get support
Open a ticket in the [issue tracker](https://bitbucket.org/atlassian/s3-batch-change-cache-control/issues).
