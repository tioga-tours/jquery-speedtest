;(function ($) {
		
	var milliFactor  = 1000,
		kFactor = 1024,
	
	SpeedTest = function (options) {
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
	};
	SpeedTest.prototype = {
		options: {
			upload: {
				url: '',
				byteSize: 300 * kFactor,
				byteStep: 100 * kFactor,
				iterations: 3,
				timeout: 2, // Seconds
				arbitraryHeaderByteSize: 400, // bytes
				arbitraryConnectionTime: 20  // Milliseconds
			},
			download: {
				url: '',
				iterations: 3,
				byteSize: 300 * kFactor,
				byteStep: 100 * kFactor,
				timeout: 2, // Seconds
				arbitraryHeaderByteSize: 400, // bytes
				arbitraryConnectionTime: 20  // Milliseconds
			}
		},
		startTime: null,

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
		benchmark: function (callback) {
			var self = this;
			self.benchUpload(function(uploadSpeed) {
				self.benchDownload(function(downloadSpeed){
					callback(downloadSpeed, uploadSpeed);
				});
			});
		},
		benchUpload: function (callback) {
			this.benchIterate('upload', this.options.upload.iterations, callback);
		},
		benchDownload: function (callback) {
			this.benchIterate('download', this.options.download.iterations, callback);
		},
		benchIterate: function (type, iterations, callback) {
			var self = this,
				speeds = [],
				byteSize = this.options[type].byteSize;
			run = function ()
			{
				iterations--;
				self.benchType(type, byteSize, function (speed) {
					if (speed !== -1) {
						speeds.push(speed);
						byteSize += self.options[type].byteStep;
					} else {
						byteSize -= self.options[type].byteStep;
					}

					if (iterations > 0) {
						run();
					} else {
						var sum = 0, i;

						for (i=0;i<speeds.length; i++) {
							sum += speeds[i];
						}
						if (speeds.length > 0) {
							callback(Math.round(sum / speeds.length));
						} else {
							callback(-1);
						}
					}
				});
			};
			run();
		},
		benchType: function (type, byteSize, callback) {
			var self = this,
				data = {
					size: byteSize
				},
				t;

			if (self.startTime !== null) {
				throw 'Cannot start bench again';
			}

			if (type === 'upload') {
				data = self.randomString(byteSize);
			}

			self.rq = $.ajax({
				url: self.options[type].url,
				method: type === 'upload' ? 'POST' : 'GET',
				cache: false,
				data: data,
				timeout: self.options[type].timeout * milliFactor,
				success: function (data) {
					var t = new Date(),
						endTime = t.getSeconds() * milliFactor + t.getMilliseconds(),
						duration = (endTime - self.startTime),
						ot = 0,
						speed;
					
					if (data && data.ownTime) {
						ot = data.ownTime * milliFactor;
					}

					duration -= ot;

					if (duration > self.options[type].arbitraryConnectionTime) {
						duration -= self.options[type].arbitraryConnectionTime;
					}

					speed = Math.round((byteSize + self.options[type].arbitraryHeaderByteSize) / (duration/milliFactor));
					self.startTime = null;
					callback(speed);
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