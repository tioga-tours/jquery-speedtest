/*!
 * jQuery JavaScript Library v2.2.3
 * https://tech.tiogatours.nl/jquery-speedtest/README.md
 *
 * Copyright Tioga Tours B.V.
 * Released under the MIT license
 * https://tech.tiogatours.nl/jquery-speedtest/LICENSE
 *
 * Date: 2016-04-26
 */
;(function ($) {

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
            self.benchType('upload', 1, function () {
            });

            self.benchType('upload', 1, function (speed, duration) {
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
		benchmark: function (callback)
        {
			var self = this;
			self.benchUpload(function(uploadSpeed) {
				self.benchDownload(function(downloadSpeed){
					callback(downloadSpeed, uploadSpeed);
				});
			});
		},
		benchUpload: function (callback)
        {
			this.benchIterate('upload', this.options.upload.iterations, callback);
		},
		benchDownload: function (callback)
        {
			this.benchIterate('download', this.options.download.iterations, callback);
		},
		benchIterate: function (type, iterations, callback) {
			var self = this,
				speeds = [],
                durations = [],
				byteSize = this.options[type].byteSize,
			run = function ()
			{
				iterations--;
				self.benchType(type, byteSize, function (speed, duration) {
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
							callback(Math.round(sumSpeed / speeds.length), Math.round(sumDuration / durations.length));
						} else {
							callback(-1, -1);
						}
					}
				});
			};
			run();
		},
		benchType: function (type, byteSize, callback)
        {
			var self = this,
				data = 'size='+byteSize,
				t;

			if (self.startTime !== null) {
				setTimeout(function () {
                    self.benchType(type, byteSize, callback);
                }, 300);
                return;
			}

			if (type === 'upload') {
                data = '';
                var chunkSize = 200;
                for (var i=0; i<byteSize; i+=chunkSize) {
                    data += '&data=' + encodeURIComponent(self.randomString(chunkSize));
                }
                // Correct the size as some extra data was added
                byteSize = data.length;
			}


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

					duration = duration - ot - self.connectTime - decodeTime;

					speed = Math.round((byteSize + self.options[type].arbitraryHeaderByteSize) / (duration/milliFactor));
					self.startTime = null;
					callback(speed, duration);
				},
				complete: function () {
					clearTimeout(self.timeout);
				},
				error: function () {
					self.startTime = null;
					callback(-1);
				}
			});
			// Set start time after ajax, not on beforeSend for more precise testing
			t = new Date();
			self.startTime = t.getSeconds() * milliFactor + t.getMilliseconds();
		}
	};
	window.SpeedTest = SpeedTest;
})(jQuery);