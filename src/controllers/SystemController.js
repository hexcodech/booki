class SystemController {

	constructor({booki, os, statsHolder}){

		const bindAll     = require('lodash/bindAll');

		this.statsHolder  = statsHolder;
		this.os           = require('os');

		bindAll(this, ['getStats']);
	}

	getStats(request, response, next){

		let cpuStats1 = this.os.cpus();

		setTimeout(() => {
			let cpuStats2 = this.os.cpus();

			let cpus = [];

			for(let i=0;i<cpuStats1.length;i++){
				let cpu = {
					model: cpuStats1[i].model,
					speed: Math.round((cpuStats1[i].speed + cpuStats2[i].speed) / 2),
					times: {}
				};

				for(let key in cpuStats1[i].times){
					cpu.times[key] = cpuStats2[i].times[key] - cpuStats1[i].times[key];
				}

				cpus.push(cpu);
			}

			let cpuAverage = {};

			for(let i=0;i<cpus.length;i++){
				for(let key in cpus[i].times){
					if(cpuAverage.hasOwnProperty(key)){
						cpuAverage[key] += cpus[i].times[key];
					}else{
						cpuAverage[key] = cpus[i].times[key];
					}
				}
			}

			let stats = {
				cpus                : cpus,
				cpuAverage          : cpuAverage,
				cpuUsage            : process.cpuUsage(),

				totalMemory         : this.os.totalmem(),
				freeMemory          : this.os.freemem(),
				memoryUsage         : process.memoryUsage(),

				loadAverage         : this.os.loadavg(),

				systemUptime        : this.os.uptime(),
				processUptime       : process.uptime(),

				os                  : this.os.type(),
				platform            : this.os.platform(),

				hostname            : this.os.hostname(),
				pid                 : process.pid,

				nodeVersion         : process.version,

				bandwidth           : this.statsHolder.getBandwidth()
			}

			response.json(stats);
			response.end();

		}, 500);
	}

};

module.exports = SystemController;
