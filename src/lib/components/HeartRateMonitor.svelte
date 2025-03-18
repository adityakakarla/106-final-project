<script lang="ts">
    import { onMount } from 'svelte';
    
    // Svelte 5 reactive primitives
    let heartRate = $state(100);
    let isRunning = $state(true);
    let volume = $state(1.0);
    let ecgData = $state<number[]>([]);
    let showSettings = $state(false);
    let selectedStudent = $state<keyof typeof studentData | ''>('');
    
    // Student heart rate data
    const studentData = {
        'S1': 106,
        'S2': 120,
        'S3': 104,
        'S4': 93,
        'S5': 95,
        'S6': 104,
        'S7': 101,
        'S8': 102,
        'S9': 87,
        'S10': 106
    } as const;
    
    // Handle student selection
    function handleStudentChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        const student = select.value as keyof typeof studentData | '';
        selectedStudent = student;
        if (selectedStudent) {
            heartRate = studentData[selectedStudent];
        }
    }
    
    // ECG pattern generation
    function generateEcgPoint(heartRate: number, time: number): number {
        // Basic ECG pattern with P wave, QRS complex, and T wave
        const cycleTime = 60 / heartRate; // Time for one complete heart cycle in seconds
        const t = time % cycleTime / cycleTime; // Normalized time within cycle (0-1)
        
        // Parameters to tune the ECG wave
        const pWaveStart = 0.0;
        const pWaveEnd = 0.1;
        const qrsStart = 0.15;
        const qrsEnd = 0.25;
        const tWaveStart = 0.3;
        const tWaveEnd = 0.45;
        
        let value = 0;
        
        // P wave (small upward deflection)
        if (t >= pWaveStart && t <= pWaveEnd) {
            const pT = (t - pWaveStart) / (pWaveEnd - pWaveStart);
            value = 0.25 * Math.sin(pT * Math.PI);
        } 
        // QRS complex (sharp downward then upward deflection)
        else if (t >= qrsStart && t <= qrsEnd) {
            const qrsT = (t - qrsStart) / (qrsEnd - qrsStart);
            if (qrsT < 0.2) {
                value = -0.2 * (qrsT / 0.2);
            } else if (qrsT < 0.4) {
                value = -0.2 + (qrsT - 0.2) * 5; // Sharp downward spike
            } else if (qrsT < 0.6) {
                value = 0.8 - (qrsT - 0.4) * 5; // Sharp upward spike 
            } else {
                value = -0.2 + (qrsT - 0.6) * 1; // Return to baseline
            }
        } 
        // T wave (moderate upward deflection)
        else if (t >= tWaveStart && t <= tWaveEnd) {
            const tT = (t - tWaveStart) / (tWaveEnd - tWaveStart);
            value = 0.35 * Math.sin(tT * Math.PI);
        } 
        // Baseline
        else {
            value = 0;
        }
        
        // Add small noise to make it look more realistic
        value += (Math.random() - 0.5) * 0.03;
        
        return value;
    }

    // Audio context and sound generation
    let audioContext: AudioContext | null = null;
    let heartbeatBuffer: AudioBuffer | null = null;
    
    async function loadHeartbeatSound(): Promise<void> {
        try {
            // Create a synthetic heartbeat sound
            audioContext = new AudioContext();
            const bufferSize = audioContext.sampleRate * 0.3; // 300ms sound
            heartbeatBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const data = heartbeatBuffer.getChannelData(0);
            
            // First "lub" sound - amplified by 4x
            for (let i = 0; i < bufferSize/3; i++) {
                const t = i / audioContext.sampleRate;
                data[i] = Math.sin(2 * Math.PI * 70 * t) * Math.exp(-20 * t) * 4.0;
            }
            
            // Brief pause
            
            // Second "dub" sound - amplified by 4x
            for (let i = Math.floor(bufferSize/2); i < bufferSize; i++) {
                const t = (i - bufferSize/2) / audioContext.sampleRate;
                data[i] = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-30 * t) * 2.8;
            }
        } catch (error) {
            console.error("Error creating heartbeat sound:", error);
        }
    }
    
    function playHeartbeat(): void {
        if (!audioContext || !heartbeatBuffer || !isRunning) return;
        
        try {
            const source = audioContext.createBufferSource();
            source.buffer = heartbeatBuffer;
            
            // Volume control
            const gainNode = audioContext.createGain();
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            source.start();
        } catch (error) {
            console.error("Error playing heartbeat:", error);
        }
    }
    
    let animationFrameId: number | null = null;
    let lastHeartbeat = 0;
    let startTime: number | undefined;
    
    function animate(timestamp: number): void {
        if (!startTime) startTime = timestamp;
        const elapsed = (timestamp - startTime) / 1000; // Time in seconds
        
        // Calculate when to play heartbeat sound
        const heartbeatInterval = 60 / heartRate; // Time between beats in seconds
        if (elapsed - lastHeartbeat >= heartbeatInterval) {
            playHeartbeat();
            lastHeartbeat = elapsed;
        }
        
        // Update ECG data
        if (isRunning) {
            const newPoint = generateEcgPoint(heartRate, elapsed);
            
            // Add the new point to the ECG data
            ecgData = [...ecgData, newPoint];
            
            // Keep a limited window of data points
            if (ecgData.length > 150) {
                ecgData = ecgData.slice(-150);
            }
        }
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    function toggleMonitor(): void {
        isRunning = !isRunning;
    }
    
    function adjustHeartRate(amount: number): void {
        heartRate = Math.max(40, Math.min(200, heartRate + amount));
    }
    
    function adjustVolume(amount: number): void {
        volume = Math.max(0, Math.min(1, volume + amount));
    }
    
    function toggleSettings(): void {
        showSettings = !showSettings;
    }
    
    // Initialize and clean up
    onMount(() => {
        loadHeartbeatSound().then(() => {
            animationFrameId = requestAnimationFrame(animate);
        });
        
        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (audioContext) {
                audioContext.close();
            }
        };
    });
</script>

<div class='h-[100svh] w-full flex flex-col items-center justify-center'>
    <div class='w-[80vw] max-w-[1000px] flex flex-col space-y-4 bg-white p-8 rounded-xl border-8 border-red-400'>
        <div class="heart-rate-monitor">
            <div class="monitor-display">
                <div class="monitor-header">
                    <div class="monitor-status" class:active={isRunning}>
                        <span class="status-indicator"></span>
                        <span>{isRunning ? 'MONITORING' : 'PAUSED'}</span>
                    </div>
                    <div class="monitor-title">ECG MONITOR</div>
                    <div class="monitor-controls">
                        <select 
                            class="student-select" 
                            value={selectedStudent} 
                            on:change={handleStudentChange}
                        >
                            <option value="">Select Student</option>
                            {#each Object.entries(studentData) as [student, rate]}
                                <option value={student}>{student} ({rate} BPM)</option>
                            {/each}
                        </select>
                        <button class="settings-btn" on:click={toggleSettings}>
                            <span class="icon">⚙️</span>
                        </button>
                    </div>
                </div>
                
                <div class="ecg-display">
                    <div class="ecg-grid">
                        <!-- Grid lines are created with CSS -->
                    </div>
                    <div class="ecg-trace">
                        <svg width="100%" height="100%" viewBox="0 0 150 100" preserveAspectRatio="none">
                            <!-- ECG line -->
                            <polyline 
                                points={ecgData.map((value: number, index: number) => `${index},${50 - value * 40}`).join(' ')}
                                fill="none"
                                stroke="rgb(248 113 113)"
                                stroke-width="1.5"
                            />
                        </svg>
                    </div>
                </div>
                
                <div class="vital-signs">
                    <div class="vital-sign heart-rate">
                        <div class="vital-label">HEART RATE</div>
                        <div class="vital-value">{heartRate} <span class="unit">BPM</span></div>
                        <div class="heart-icon" class:beating={isRunning}>❤️</div>
                    </div>
                </div>
                
                {#if showSettings}
                <div class="settings-panel">
                    <div class="settings-header">
                        <h3>Monitor Settings</h3>
                        <button class="close-btn" on:click={toggleSettings}>×</button>
                    </div>
                    <div class="settings-controls">
                        <div class="control-group">
                            <label>Heart Rate: {heartRate} BPM</label>
                            <div class="button-group">
                                <button on:click={() => adjustHeartRate(-5)}>-5</button>
                                <button on:click={() => adjustHeartRate(-1)}>-1</button>
                                <button on:click={() => adjustHeartRate(1)}>+1</button>
                                <button on:click={() => adjustHeartRate(5)}>+5</button>
                            </div>
                            <div class="presets">
                                <button on:click={() => heartRate = 60}>Rest (60)</button>
                                <button on:click={() => heartRate = 120}>Exercise (120)</button>
                                <button on:click={() => heartRate = 180}>Critical (180)</button>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Volume: {Math.round(volume * 100)}%</label>
                            <div class="button-group">
                                <button on:click={() => adjustVolume(-0.1)}>-</button>
                                <button on:click={() => adjustVolume(0.1)}>+</button>
                            </div>
                        </div>
                        <div class="control-group">
                            <button class="toggle-btn" on:click={toggleMonitor}>
                                {isRunning ? 'Pause Monitor' : 'Start Monitor'}
                            </button>
                        </div>
                    </div>
                </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .heart-rate-monitor {
        width: 100%;
        font-family: 'Arial', sans-serif;
    }
    
    .monitor-display {
        background-color: white;
        border-radius: 10px;
        border: none;
        padding: 20px;
        position: relative;
    }
    
    .monitor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid rgb(248 113 113);
        padding-bottom: 10px;
        margin-bottom: 15px;
    }
    
    .monitor-status {
        display: flex;
        align-items: center;
        font-size: 14px;
        color: #666;
    }
    
    .monitor-status.active {
        color: rgb(248 113 113);
    }
    
    .status-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #666;
        margin-right: 5px;
    }
    
    .monitor-status.active .status-indicator {
        background-color: rgb(248 113 113);
        box-shadow: 0 0 5px rgb(248 113 113);
        animation: blink 2s infinite;
    }
    
    .monitor-title {
        font-size: 24px;
        font-weight: bold;
        color: #333;
    }
    
    .settings-btn {
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 16px;
    }
    
    .settings-btn:hover {
        color: rgb(248 113 113);
    }
    
    .ecg-display {
        position: relative;
        height: 200px;
        border: 2px solid rgb(248 113 113);
        background-color: white;
        border-radius: 5px;
        margin-bottom: 15px;
        overflow: hidden;
    }
    
    .ecg-grid {
        position: absolute;
        width: 100%;
        height: 100%;
        background-image: 
            linear-gradient(to right, rgba(248, 113, 113, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(248, 113, 113, 0.1) 1px, transparent 1px),
            linear-gradient(to right, rgba(248, 113, 113, 0.2) 5px, transparent 5px),
            linear-gradient(to bottom, rgba(248, 113, 113, 0.2) 5px, transparent 5px);
        background-size: 10px 10px, 10px 10px, 50px 50px, 50px 50px;
    }
    
    .ecg-trace {
        position: absolute;
        width: 100%;
        height: 100%;
    }
    
    .vital-signs {
        display: flex;
        justify-content: space-between;
    }
    
    .vital-sign {
        flex: 1;
        background-color: white;
        border: 2px solid rgb(248 113 113);
        border-radius: 5px;
        padding: 15px;
        margin: 0 5px;
        text-align: center;
    }
    
    .vital-sign:first-child {
        margin-left: 0;
    }
    
    .vital-sign:last-child {
        margin-right: 0;
    }
    
    .vital-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 5px;
    }
    
    .vital-value {
        font-size: 28px;
        font-weight: bold;
        color: rgb(248 113 113);
    }
    
    .heart-rate .vital-value {
        color: rgb(248 113 113);
    }
    
    .bp .vital-value {
        color: #ff9900;
    }
    
    .spo2 .vital-value {
        color: #00aaff;
    }
    
    .unit {
        font-size: 14px;
        font-weight: normal;
    }
    
    .heart-icon {
        font-size: 24px;
        margin-top: 5px;
        opacity: 0.7;
    }
    
    .heart-icon.beating {
        animation: heartbeat 1s infinite;
    }
    
    .settings-panel {
        position: absolute;
        top: 60px;
        right: 20px;
        background-color: white;
        border: 2px solid rgb(248 113 113);
        border-radius: 5px;
        box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
        width: 300px;
        z-index: 10;
    }
    
    .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        border-bottom: 2px solid rgb(248 113 113);
    }
    
    .settings-header h3 {
        margin: 0;
        color: #333;
        font-size: 16px;
    }
    
    .close-btn {
        background: none;
        border: none;
        color: #666;
        font-size: 20px;
        cursor: pointer;
    }
    
    .settings-controls {
        padding: 15px;
    }
    
    .control-group {
        margin-bottom: 15px;
    }
    
    .control-group label {
        display: block;
        margin-bottom: 5px;
        color: #666;
    }
    
    .button-group {
        display: flex;
        gap: 5px;
        margin-bottom: 10px;
    }
    
    .button-group button,
    .presets button,
    .toggle-btn {
        background-color: rgb(248 113 113);
        border: none;
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .button-group button:hover,
    .presets button:hover,
    .toggle-btn:hover {
        background-color: rgb(239 68 68); /* red-500 */
    }
    
    .presets {
        display: flex;
        gap: 5px;
    }
    
    .toggle-btn {
        width: 100%;
        padding: 8px;
        background-color: rgb(248 113 113);
    }
    
    .toggle-btn:hover {
        background-color: rgb(239 68 68);
    }
    
    .monitor-controls {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .student-select {
        background-color: white;
        color: #333;
        border: 2px solid rgb(248 113 113);
        border-radius: 4px;
        padding: 5px 10px;
        font-size: 14px;
        cursor: pointer;
    }
    
    .student-select option {
        background-color: white;
        color: #333;
    }
    
    .student-select:hover {
        border-color: rgb(239 68 68);
    }
    
    .student-select:focus {
        outline: none;
        border-color: rgb(239 68 68);
    }
    
    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    @keyframes heartbeat {
        0%, 100% { transform: scale(1); }
        15% { transform: scale(1.3); }
        30% { transform: scale(1); }
        45% { transform: scale(1.15); }
        60% { transform: scale(1); }
    }
</style>