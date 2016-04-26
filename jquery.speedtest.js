/*!
 * jQuery Speedtest for testing internet speed
 * https://tech.tiogatours.nl/jquery-speedtest/README.md
 *
 * Copyright Tioga Tours B.V.
 * Released under the MIT license
 * https://tech.tiogatours.nl/jquery-speedtest/LICENSE
 *
 * Date: 2016-04-26
 */
;(function ($, undef) {

    var milliFactor  = 1000,
        kFactor = 1024,

        SpeedTest = function (options)
        {
            var self = this,
                opts,
                i;
            $.extend(true, self.options, options);

            for (i=0; i<2;i++) {
                opts = self.options[['upload', 'download'][i]];

                if (opts.byteSize > 2 * kFactor * kFactor) {
                    throw 'Cannot bench with sizes bigger than 2 MB';
                }
                if (opts.byteStep > kFactor * kFactor) {
                    throw 'Cannot bench with step sizes bigger than 1 MB';
                }
            }

            // Execute the test twice, the first connection always takes a long time
            // the second connection is much more responsive
            if (self.options.testConnectionTime === true) {
                self.benchType('upload', 1).then(function () {
                });

                self.benchType('upload', 1).then(function (speed, duration) {
                    self.connectTime = duration;
                });
            }
        };
    SpeedTest.prototype = {
        options: {
            upload: {
                url: '',
                byteSize: 300 * kFactor,
                byteStep: 100 * kFactor,
                iterations: 3,
                timeout: 2, // Seconds
                arbitraryHeaderByteSize: 400 // bytes
            },
            download: {
                url: '',
                iterations: 3,
                byteSize: 300 * kFactor,
                byteStep: 100 * kFactor,
                timeout: 2, // Seconds
                arbitraryHeaderByteSize: 400 // bytes
            },
            // Test the time it takes to do an empty
            // request
            testConnectionTime: true
        },
        startTime: null,
        connectTime: 0,

        randomString: function (byteSize)
        {
            //random data prevents gzip effect
            var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*()_+`-=[]\{}|;':,./<>?",
                randomString = '',
                i;
            for (i = 0; i < byteSize; i++) {
                randomString += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return randomString;
        },
        benchmark: function ()
        {
            var self = this,
                deferred = $.Deferred();
            self.benchUpload().then(function(uploadSpeed, uploadDuration) {
                self.benchDownload().then(function(downloadSpeed, downloadDuration){
                    deferred.resolve(downloadSpeed, uploadSpeed, uploadDuration, downloadDuration);
                });
            });
            return deferred.promise();
        },
        benchUpload: function ()
        {
            var deferred = $.Deferred();
            this.benchIterate('upload', this.options.upload.iterations).then(function (speed, duration) {
                deferred.resolve(speed, duration);
            });
            return deferred.promise();
        },
        benchDownload: function ()
        {
            var deferred = $.Deferred();
            this.benchIterate('download', this.options.download.iterations).then(function (speed, duration) {
                deferred.resolve(speed, duration);
            });
            return deferred.promise();
        },
        benchIterate: function (type, iterations) {
            var self = this,
                speeds = [],
                durations = [],
                byteSize = this.options[type].byteSize,
                deferred = $.Deferred(),
                run = function ()
                {
                    iterations--;
                    self.benchType(type, byteSize).then(function (speed, duration) {
                        if (speed !== -1) {
                            speeds.push(speed);
                            durations.push(duration);
                            byteSize += self.options[type].byteStep;
                        } else {
                            byteSize -= self.options[type].byteStep;
                        }

                        if (iterations > 0) {
                            run();
                        } else {
                            var sumSpeed = 0, i, sumDuration = 0;

                            for (i=0;i<speeds.length; i++) {
                                sumSpeed += speeds[i];
                                sumDuration += durations[i];
                            }
                            if (speeds.length > 0) {
                                deferred.resolve(Math.round(sumSpeed / speeds.length), Math.round(sumDuration / durations.length));
                            } else {
                                deferred.resolve(-1, -1);
                            }
                        }
                    });
                };
            run();
            return deferred.promise();
        },
        benchType: function (type, byteSize, deferred)
        {
            var self = this,
                data = 'size='+byteSize,
                t,
                $s = $(self);

            $s.trigger('before-run', [type, byteSize]);

            if (!deferred) {
                deferred = $.Deferred();
            }

            if (self.startTime !== null) {
                setTimeout(function () {
                    $s.trigger('run-wait', [type, byteSize]);
                    self.benchType(type, byteSize, deferred);
                }, 300);
                return deferred.promise();
            }

            if (type === 'upload') {
                data = '';
                var chunkSize = 200 < byteSize ? 200 : byteSize;
                for (var i=0; i<byteSize; i+=chunkSize) {
                    data += '&data=' + encodeURIComponent(self.randomString(chunkSize));
                }
                // Correct the size as some extra data was added
                byteSize = data.length;
            }


            $s.trigger('before-start', [type, byteSize]);

            self.rq = $.ajax({
                url: self.options[type].url,
                method: type === 'upload' ? 'POST' : 'GET',
                cache: false,
                data: data,
                timeout: self.options[type].timeout * milliFactor,
                success: function (data, txt, xhr) {
                    var t = new Date(),
                        endTime = t.getSeconds() * milliFactor + t.getMilliseconds(),
                        duration = (endTime - self.startTime),
                        ot = 0,
                        speed,
                        decodeTime = 0,
                        s, e;

                    if (xhr.responseText) {
                        // Benchmark decoding, larger responses require serious decode time
                        s = new Date();
                        JSON.parse(xhr.responseText);
                        e = new Date();

                        decodeTime = e.getSeconds() * milliFactor + e.getMilliseconds() - s.getSeconds() * milliFactor - s.getMilliseconds();
                    }

                    if (data && data.ownTime) {
                        ot = data.ownTime * milliFactor;
                    }

                    duration = duration - ot - decodeTime;

                    if (duration > self.connectTime) { // Only substract connection time if not below 0
                        duration = duration - self.connectTime;
                    } else {
                        // Half the connection time
                        self.connectTime = self.connectTime/2;
                    }

                    speed = Math.round((byteSize + self.options[type].arbitraryHeaderByteSize) / (duration/milliFactor));

                    $s.trigger('run-success', [type, byteSize, speed, duration]);

                    self.startTime = null;
                    deferred.resolve(speed, duration);
                },
                complete: function () {
                    $s.trigger('run-complete', [type, byteSize]);
                },
                error: function (a,b,c) {
                    $s.trigger('run-error', [a,b,c]);
                    self.startTime = null;
                    deferred.resolve(-1, -1);
                }
            });
            // Set start time after ajax, not on beforeSend for more precise testing
            t = new Date();
            self.startTime = t.getSeconds() * milliFactor + t.getMilliseconds();

            return deferred.promise();
        }
    };
    window.SpeedTest = SpeedTest;
})(jQuery);