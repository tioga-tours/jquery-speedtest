# jquery-speedtest

Benchmark an internet connection with javascript.

Depends on jQuery.

[Demo](https://tech.tiogatours.nl/jquery-speedtest/demo.htm)

Example:
```javascript
var speedTest = new SpeedTest({
  upload: {
    // Where to post the data to
    // This should be a valid post-target
    // It should return a 200 header, but as little as possible
    url: 'https://hostname.com/dev/null', 
    // Initial post size in bytes
    byteSize: 300 * 1024,
    // Make data larger or smaller with every try (100KB)
    byteStep: 100 * 1024
    // Number of tries to average
    iterations: 3,
    // How many seconds to wait before trying smaller size
    timeout: 2,
    // Every request has a little overhead for headers
    //  this is an arbitrary number in bytes
    arbitraryHeaderByteSize: 400
  },
  download: {
    // Where to get the data
    //  as the library measures the total time
    //  keep processing as small as possible
    //  a get parameter is added for the requested size
    //  Below will become https://hostname.com/source?size=307200
    url: 'https://hostname.com/source',
    // Initial download size in bytes
    byteSize: 300 * 1024,
    // Make data larger or smaller with every try (100KB)
    byteStep: 100 * 1024
    // Number of tries to average
    iterations: 3,
    // How many seconds to wait before trying smaller size
    timeout: 2,
    // Every request has a little overhead for headers
    //  this is an arbitrary number in bytes
    arbitraryHeaderByteSize: 400
  }
});

speedTest.benchmark().then(function(downloadSpeed, uploadSpeed) {
  console.log('Benchmark completed. Downloadspeed: ' + (downloadSpeed/1024) + ' KB/s, uploadspeed: ' + (uploadSpeed/1024) + ' KB/s');
});
```
