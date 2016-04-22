var SpeedTest = function (options) {
    $.extend(true, this.options, options);

    if (this.options.byteSize > 2 * 1024 * 1024) {
        throw 'Cannot bench with sizes bigger then 2 MB';
    }

};
SpeedTest.prototype = {
    options: {
        upload: {
            url: '',
            byteSize: 300 * 1024,
            byteStep: 100 * 1024,
            iterations: 3,
            timeout: 2, // Seconds
            arbitraryHeaderByteSize: 0.4 * 1024,
            arbitraryConnectionTime: 20  // Milliseconds
        },
        download: {
            url: '',
            iterations: 3,
            byteSize: 300 * 1024,
            byteStep: 100 * 1024,
            timeout: 2, // Seconds
            arbitraryHeaderByteSize: 0.4 * 1024,
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
        var self = this;

        if (self.startTime !== null) {
            throw 'Cannot start bench again';
        }

        if (type === 'upload') {
            var data = this.randomString(byteSize);
        } else {
            var data = {
                size: byteSize
            };
        }


        self.rq = $.ajax({
            url: this.options[type].url,
            method: type === 'upload' ? 'POST' : 'GET',
            cache: false,
            data: data,
            timeout: self.options[type].timeout * 1000,
            beforeSend: function () {
                var t = new Date();
                self.startTime = t.getSeconds() * 1000 + t.getMilliseconds();
            },
            success: function (data) {
                var t = new Date(),
                    endTime = t.getSeconds() * 1000 + t.getMilliseconds();

                var duration = (endTime - self.startTime),
                    ot = 0;
                console.log(duration);
                if (data && data.ownTime) {
                    ot = data.ownTime * 1000;
                }

                duration -= ot;

                if (duration > self.options[type].arbitraryConnectionTime) {
                    duration -= self.options[type].arbitraryConnectionTime;
                }

                console.log(duration);

                var speed = Math.round((byteSize + self.options[type].arbitraryHeaderByteSize) / (duration/1000));
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
    }
};