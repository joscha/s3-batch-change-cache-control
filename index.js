'use strict';
let bucket = 'aui-origin.herokuapp.com';

const debug = require('debug')('s3-batch')
const error = require('debug')('s3-batch:error')

const AWS = require('aws-sdk');
const objectAssign = require('object-assign');
const _ = require('lodash')

let s3 = new AWS.S3({
  params: {
    Bucket: bucket
  }
});

function list(marker) {
  let params = {
    Marker: marker,
    Prefix: 'test',
    //Delimiter: '/'
  };
  s3.listObjects(params, (err, data) => {
    if(err) {
      error(err, err.stack);
      process.exit(1);
    }
    data.Contents.forEach((object) => {
      if(object.Key.substr(-1) === '/') {
        // it is a "folder"
        return;
      }
      debug('object', object);
      s3.headObject({
        Bucket: bucket,
        Key: object.Key
      }, (err, headData) => {
        if(err) {
          error(err, err.stack);
        }
        debug('headData', headData);
        let cacheControl = 'public, max-age=201';

        var newMeta = objectAssign({}, headData.Metadata, {
          'cache-control': cacheControl
        });
        if(_.isEqual(headData.Metadata, newMeta) && cacheControl === headData.CacheControl) {
          debug(`Metadata and Cache-Control is same for '${object.Key}'`);
          return;
        }
        debug('newMeta', newMeta);

        s3.copyObject({
          Bucket: bucket,
          CopySource: encodeURIComponent(`${bucket}/${object.Key}`),
          Key: object.Key,
          MetadataDirective: 'REPLACE',
          CacheControl: cacheControl,
          Metadata: newMeta
        }, (err, copyData) => {
          if(err) {
            error(err, err.stack);
          }
          debug('copyData', copyData);
        })
      })
    });
    if(data.IsTruncated) {
      list(data.NextMarker);
    }
  });
}

list();
