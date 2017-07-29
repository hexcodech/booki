class StatsHolder {
	constructor(config) {
		//bandwidth
		this.requests = [];
		this.bandwidthInterval = config.STATS_BANDWIDTH_INTERVAL;

		["requestCompleted", "getBandwidth"].forEach(key => {
			this[key] = this[key].bind(this);
		});
	}

	requestCompleted(request) {
		this.requests.push(Object.assign(request, { timestamp: Date.now() }));
	}

	getBandwidth() {
		let bandwidth = {
			interval: this.bandwidthInterval,
			bytesReceived: 0,
			bytesServed: 0,
			requestsServed: 0
		};

		let now = Date.now();

		this.requests = this.requests.filter(el => {
			//filter old requests

			if (el.timestamp + this.bandwidthInterval >= now) {
				//yes we abuse the filter function, sorry ^^

				bandwidth.bytesReceived += el.req.bytes;
				bandwidth.bytesServed += el.res.bytes;
				bandwidth.requestsServed += 1;

				return true;
			}

			return false;
		});

		return bandwidth;
	}
}

module.exports = StatsHolder;
