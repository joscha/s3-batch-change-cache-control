#!/usr/bin/env node --harmony
'use strict';

const program = require('commander');
const pkg = require('./package.json');
const d = require('debug');
const AWS = require('aws-sdk');
const objectAssign = require('object-assign');
const _ = require('lodash');
const Q = require('q');

const debug = d('s3-batch-ccc:debug');
const error = d('s3-batch-ccc:error');
const info = d('s3-batch-ccc:info');
const CACHE_CONTROL_DEFAULT = `public, max-age=${86400 * 365}`;

program
  .version(pkg.version)
  .option('-n, --dry-run', 'Whether to do a dry-run (read-only)')
  .option('-b, --bucket <bucket>', 'The bucket to use')
  .option('-p, --profile [profile]', 'The AWS profile to use; defaults to "default"')
  .option('-p, --prefix [prefix]', 'The prefix to use when searching for S3 objects')
  .option('-cc, --cache-control [header]',`The Cache-Control header; defaults to "${CACHE_CONTROL_DEFAULT}"`);

program
  .command('apply')
  .description('apply the changes to S3')
  .action(function() {
    info('Starting...');
    start();
  });

if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);

function start() {
  let dryRun = program.dryRun;
  let bucket = program.bucket;
  let profile = 'default';
  let cacheControl = program.cacheControl || CACHE_CONTROL_DEFAULT;

  if(program.profile) {
    profile = program.profile;
  } else {
    info(`No AWS profile given - using "${profile}"`)
  }

  const credentials = new AWS.SharedIniFileCredentials({profile: program.profile});
  AWS.config.credentials = credentials;

  const s3 = new AWS.S3({
    params: {
      Bucket: bucket
    }
  });

  function list(marker, prefix) {
    info(`Listing objects of bucket "${bucket}"` + (marker ? ` from marker "${marker}"` : '') + (prefix ? ` with prefix "${prefix}"` : '') + '...');

    return Q.ninvoke(s3, 'listObjects', {
      Marker: marker,
      Prefix: prefix
    })
    .then((listData) => {
      info(`Got ${listData.Contents.length} S3 objects`);
      let objects = [];
      listData.Contents.forEach((object) => {
        if(object.Key.substr(-1) === '/') {
          // skip; it is a "folder"
          return;
        }
        debug('object', object);
        objects.push(object);
      });
      if(listData.IsTruncated) {
        info('There are more results, fetching...')
        list(objects[objects.length - 1].Key, prefix);
      }
      return objects;
    })
    .then((objects) => {
      info(`Working on ${objects.length} S3 'files'`);
      return Q.allSettled(objects.map((object) => {
        info(`Working on "${object.Key}"...`);
        return Q.ninvoke(s3, 'headObject', {
          Bucket: bucket,
          Key: object.Key
        })
        .then((headData) => {
          debug('headData', headData);
          // Amend the meta data we have already, leaving everything intact, just changing the cache-control
          var newMeta = objectAssign({}, headData.Metadata);
          // in case there is old cache-control Metadata set, we remove it - if we don't it will be prefixed with x-amz-meta- to avoid collisions
          delete newMeta['cache-control'];
          // in case there is old content-type Metadata set, we remove it - if we don't it will be prefixed with x-amz-meta- to avoid collisions
          delete newMeta['content-type'];

          if(_.isEqual(headData.Metadata, newMeta) && cacheControl === headData.CacheControl) {
            info(`Metadata and Cache-Control is same for "${object.Key}", skipping...`);
            return;
          }

          debug('newMeta', newMeta);

          if(dryRun) {
            info(`Would have applied Metadata and Cache-Control for "${object.Key}".`);
            return;
          }

          return Q.ninvoke(s3, 'copyObject', {
            Bucket: bucket,
            CopySource: encodeURIComponent(`${bucket}/${object.Key}`),
            Key: object.Key,
            /* we do have to replace the Metadata, even though it is probably the same, otherwise we get a
              "InvalidRequest: This copy request is illegal because it is trying to copy an object to itself without changing the object's metadata, storage class, website redirect location or encryption attributes"
            */
            MetadataDirective: 'REPLACE',
            CacheControl: cacheControl,
            ContentType: headData.ContentType,
            ContentDisposition: headData.ContentDisposition,
            ContentEncoding: headData.ContentEncoding,
            ContentLanguage: headData.ContentLanguage,
            Metadata: newMeta
          }).then((copyData) => {
            debug('copyData', copyData);
            info(`Applied Metadata and Cache-Control for "${object.Key}".`);
          })
          .catch((err) => {
            error(err, err.stack);
          });
        });
      }));
    })
    .catch((err) => {
      error(err, err.stack);
    })
    .done();
  }
  list(undefined, program.prefix || undefined);
}
