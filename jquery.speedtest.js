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
            }

            // Execute the test twice, the first connection always takes a long time
            // the second connection is much more responsive
            if (self.options.testConnectionTime === true) {
                self.benchIterate('upload', 3, 8).then(function (speed, duration) {
                    self.connectTime = duration;
                });
            }
        };
    SpeedTest.prototype = {
        options: {
            upload: {
                url: '',
                byteSize: 100 * kFactor,
                scaleUp: 1.5,
                scaleDown: 0.5,
                iterations: 3, // Number of successful iterations
                maxIterations: 15, // Absolute limit
                timeout: 2, // Seconds
                arbitraryHeaderByteSize: 400 // bytes
            },
            download: {
                url: '',
                iterations: 3, // Number of successful iterations
                maxIterations: 15, // Absolute limit
                byteSize: 100 * kFactor,
                scaleUp: 1.5,
                scaleDown: 0.5,
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
            var deferred = $.Deferred(),
                opts = this.options.download;
            this.benchIterate('upload', opts.iterations, opts.maxIterations).then(function (speed, duration) {
                deferred.resolve(speed, duration);
            });
            return deferred.promise();
        },
        benchDownload: function ()
        {
            var deferred = $.Deferred(),
                opts = this.options.download;
            this.benchIterate('download', opts.iterations, opts.maxIterations).then(function (speed, duration) {
                deferred.resolve(speed, duration);
            });
            return deferred.promise();
        },
        benchIterate: function (type, successfulIterations, maxIterations) {
            var self = this,
                speeds = [],
                durations = [],
                opts = self.options[type],
                byteSize = opts.byteSize,
                deferred = $.Deferred(),
                run = function ()
                {
                    maxIterations--;
                    self.benchType(type, byteSize).then(function (speed, duration) {
                        if (speed !== -1) {
                            speeds.push(speed);
                            durations.push(duration);
                            byteSize = Math.round(byteSize * opts.scaleUp);
                            successfulIterations--;
                        } else {
                            byteSize = Math.round(byteSize * opts.scaleDown);
                        }

                        // Limit to max 2MB
                        if (byteSize > 2 * 1024 * 1024) {
                            byteSize = 2*1024*1024;
                        }
                        // Limit to min 1B
                        if (byteSize < 1) {
                            byteSize = 1;
                        }

                        if (successfulIterations > 0 && maxIterations > 0) {
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
                data = 'data=' + encodeURIComponent(self.randomString(byteSize));
                byteSize = data.length;
            }

            $s.trigger('before-start', [type, byteSize]);

            self.rq = $.ajax({
                url: self.options[type].url,
                method: type === 'upload' ? 'POST' : 'GET',
                cache: false,
                data: data,
                // Add connect time, because we can never go any faster than that
                timeout: self.options[type].timeout * milliFactor + self.connectTime,
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