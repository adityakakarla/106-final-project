<script lang='ts'>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    
    // Define types for our data
    type HeartRateData = {
        value: number;
        timestamp: number;
        student: string;
    };

    // Define props type
    let { hr_data } = $props<{ hr_data: HeartRateData[] }>();
    
    let studentId = $state('S1');
    let timeRange = $state<{ start: number | null; end: number | null }>({ start: null, end: null });
    let showAverage = $state(false);
    let chart = $state<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
    let tooltip = $state<any>(null);
    let svgRef = $state<SVGSVGElement | null>(null);
    let width = $state(800);
    let height = $state(450); // Increased height for better label spacing
    let margin = { top: 50, right: 100, bottom: 80, left: 80 };

    // Function to properly sort student IDs numerically
    function sortStudentIds(students: string[]): string[] {
        return students.sort((a, b) => {
            // Extract the numeric part from the student ID (e.g., '1' from 'S1')
            const numA = parseInt(a.substring(1));
            const numB = parseInt(b.substring(1));
            return numA - numB;
        });
    }

    // Format time as HH:MM:SS
    function formatTime(timestamp: number): string {
        return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    $effect(() => {
        if (svgRef && hr_data) {
            createChart();
        }
    });

    function createChart() {
        // Clear any existing chart
        d3.select(svgRef).selectAll("*").remove();
        
        // Initialize timeRange if not set
        if (!timeRange.start || !timeRange.end) {
            const timestamps = hr_data.map((d: HeartRateData) => d.timestamp);
            // Convert to number using Number() to avoid type issues
            timeRange.start = d3.min(timestamps) ? Number(d3.min(timestamps)) : 0;
            timeRange.end = d3.max(timestamps) ? Number(d3.max(timestamps)) : 0;
        }
        
        // Filter data by selected student and time range
        const filteredData = hr_data.filter((d: HeartRateData) => 
            (d.student === studentId) && 
            (d.timestamp >= (timeRange.start || 0)) && 
            (d.timestamp <= (timeRange.end || 0))
        );
        
        // Ensure there's data to display
        if (filteredData.length === 0) {
            // Display a message if no data
            d3.select(svgRef)
                .attr('width', width)
                .attr('height', height)
                .append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('font-size', '18px')
                .attr('fill', '#666')
                .text(`No heart rate data available for Student ${studentId} in selected time range`);
            return;
        }
        
        // Sort by timestamp
        filteredData.sort((a: HeartRateData, b: HeartRateData) => a.timestamp - b.timestamp);
        
        // Create scales
        const xScale = d3.scaleTime()
            .domain([
                new Date((timeRange.start || 0) * 1000), 
                new Date((timeRange.end || 0) * 1000)
            ])
            .range([margin.left, width - margin.right]);
            
        const yScale = d3.scaleLinear()
            .domain([
                Math.max(0, (d3.min(filteredData, (d: HeartRateData) => d.value) || 0) * 0.9),
                (d3.max(filteredData, (d: HeartRateData) => d.value) || 0) * 1.1
            ])
            .range([height - margin.bottom, margin.top])
            .nice(); // Make y-axis values nicer rounded numbers
            
        // Create SVG
        const svg = d3.select(svgRef)
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height])
            .attr('style', 'max-width: 100%; height: auto;');
            
        // Add clip path
        svg.append('defs')
            .append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom);
            
        // Add background for chart area
        svg.append('rect')
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom)
            .attr('fill', '#f8f9fa')
            .attr('rx', 4)
            .attr('ry', 4);
            
        // Add grid lines
        svg.append('g')
            .attr('class', 'grid-lines')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-dasharray', '2,2')
            .attr('stroke-opacity', 0.7)
            .selectAll('line')
            .data(yScale.ticks(8))
            .join('line')
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', d => yScale(d))
            .attr('y2', d => yScale(d));
            
        // Create axes
        const xAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) => g
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale)
                .tickFormat(d3.timeFormat('%H:%M:%S') as any)
                .ticks(width / 120) // Adjust tick frequency based on width
            )
            .call(g => g.select('.domain').attr('stroke', '#666').attr('stroke-width', 1.5))
            .call(g => g.selectAll('.tick line').attr('stroke', '#666'))
            .call(g => g.selectAll('.tick text')
                .attr('fill', '#333')
                .attr('font-size', '14px')
                .attr('font-weight', 'bold')
            );
            
        const yAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) => g
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale)
                .ticks(8)
                .tickFormat(d => `${d}`)
            )
            .call(g => g.select('.domain').attr('stroke', '#666').attr('stroke-width', 1.5))
            .call(g => g.selectAll('.tick line').attr('stroke', '#666'))
            .call(g => g.selectAll('.tick text')
                .attr('fill', '#333')
                .attr('font-size', '14px')
                .attr('font-weight', 'bold')
            );
            
        // Add the axes to the SVG
        svg.append('g').call(xAxis);
        svg.append('g').call(yAxis);
        
        // Add X-axis label
        svg.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', width / 2)
            .attr('y', height - 20)
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('fill', '#333')
            .text('Time');
        
        // Add Y-axis label
        svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(height / 2))
            .attr('y', 30)
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('fill', '#333')
            .text('Heart Rate (BPM)');
        
        // Create a line generator
        const line = d3.line<HeartRateData>()
            .defined(d => !isNaN(d.value))
            .x(d => xScale(new Date(d.timestamp * 1000)))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);
            
        // Add the line path
        const path = svg.append('path')
            .datum(filteredData)
            .attr('fill', 'none')
            .attr('stroke', '#e63946')
            .attr('stroke-width', 3)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('d', line)
            .attr('clip-path', 'url(#clip)');
            
        // Animate line drawing
        const pathLength = path.node()?.getTotalLength() || 0;
        path
            .attr('stroke-dasharray', pathLength)
            .attr('stroke-dashoffset', pathLength)
            .transition()
            .duration(1000)
            .attr('stroke-dashoffset', 0);
            
        // Create a tooltip that follows mouse movement
        const tooltipDiv = svg.append('g')
            .attr('class', 'tooltip-container')
            .style('display', 'none')
            .style('pointer-events', 'none');
            
        tooltipDiv.append('rect')
            .attr('fill', 'rgba(0, 0, 0, 0.8)')
            .attr('rx', 5)
            .attr('ry', 5)
            .attr('width', 180)
            .attr('height', 80);
            
        tooltipDiv.append('text')
            .attr('class', 'tooltip-student')
            .attr('x', 10)
            .attr('y', 20)
            .attr('fill', 'white')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold');
            
        tooltipDiv.append('text')
            .attr('class', 'tooltip-hr')
            .attr('x', 10)
            .attr('y', 45)
            .attr('fill', 'white')
            .attr('font-size', '14px');
            
        tooltipDiv.append('text')
            .attr('class', 'tooltip-time')
            .attr('x', 10)
            .attr('y', 70)
            .attr('fill', 'white')
            .attr('font-size', '14px');
            
        // Add vertical line for tooltip position
        const tooltipLine = svg.append('line')
            .attr('class', 'tooltip-line')
            .attr('stroke', '#666')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .attr('y1', margin.top)
            .attr('y2', height - margin.bottom)
            .style('display', 'none')
            .style('pointer-events', 'none');
            
        // Add transparent overlay for mouse tracking
        svg.append('rect')
            .attr('class', 'overlay')
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('mousemove', function(event) {
                if (filteredData.length === 0) return;
                
                // Get mouse x position
                const [mouseX] = d3.pointer(event);
                
                // Ignore if outside chart area
                if (mouseX < margin.left || mouseX > width - margin.right) {
                    tooltipDiv.style('display', 'none');
                    tooltipLine.style('display', 'none');
                    return;
                }
                
                // Convert mouse position to date
                const date = xScale.invert(mouseX);
                const timestamp = date.getTime() / 1000;
                
                // Find the closest data point
                const bisect = d3.bisector((d: HeartRateData) => d.timestamp).left;
                const index = bisect(filteredData, timestamp);
                const d0 = filteredData[Math.max(0, index - 1)];
                const d1 = filteredData[Math.min(filteredData.length - 1, index)];
                
                // Choose the closest point
                const d = (d1 && d0) ? 
                    (timestamp - d0.timestamp > d1.timestamp - timestamp ? d1 : d0) : 
                    (d0 || d1);
                
                if (!d) return;
                
                // Update tooltip line
                tooltipLine
                    .attr('x1', xScale(new Date(d.timestamp * 1000)))
                    .attr('x2', xScale(new Date(d.timestamp * 1000)))
                    .style('display', 'block');
                
                // Position tooltip: ensure it stays within chart bounds
                const tooltipX = Math.min(
                    width - margin.right - 180, 
                    Math.max(margin.left, xScale(new Date(d.timestamp * 1000)))
                );
                
                // Position and update tooltip
                tooltipDiv.style('display', 'block')
                    .attr('transform', `translate(${tooltipX + 10}, ${Math.max(margin.top + 10, yScale(d.value) - 50)})`);
                    
                tooltipDiv.select('.tooltip-student')
                    .text(`Student: ${d.student}`);
                    
                tooltipDiv.select('.tooltip-hr')
                    .text(`Heart Rate: ${d.value} BPM`);
                    
                tooltipDiv.select('.tooltip-time')
                    .text(`Time: ${formatTime(d.timestamp)}`);
            })
            .on('mouseout', () => {
                tooltipDiv.style('display', 'none');
                tooltipLine.style('display', 'none');
            });
            
        // Add average line if requested
        if (showAverage && filteredData.length > 0) {
            const avgValue = d3.mean(filteredData, (d: HeartRateData) => d.value) || 0;
            
            svg.append('line')
                .attr('x1', margin.left)
                .attr('y1', yScale(avgValue))
                .attr('x2', width - margin.right)
                .attr('y2', yScale(avgValue))
                .attr('stroke', '#457b9d')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '6,3')
                .attr('clip-path', 'url(#clip)');
                
            svg.append('text')
                .attr('x', width - margin.right + 5)
                .attr('y', yScale(avgValue) + 4)
                .attr('fill', '#457b9d')
                .attr('text-anchor', 'start')
                .attr('font-size', '14px')
                .attr('font-weight', 'bold')
                .text(`Avg: ${Math.round(avgValue)} BPM`);
        }
        
        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '18px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text(`Heart Rate Data for Student ${studentId}`);
            
        // Add interaction to enable brushing for zoom
        const brush = d3.brushX()
            .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
            .on('end', brushed);
            
        svg.append('g')
            .attr('class', 'brush')
            .call(brush);
            
        function brushed(event: d3.D3BrushEvent<unknown>) {
            if (!event.selection) return;
            
            // Convert the brush selection from screen coordinates to data values
            const [x0, x1] = (event.selection as [number, number]).map(xScale.invert) as Date[];
            
            // Update the time range
            timeRange.start = x0.getTime() / 1000;
            timeRange.end = x1.getTime() / 1000;
            
            // Recreate the chart with the new range
            createChart();
        }
    }
    
    function resetZoom() {
        const timestamps = hr_data.map((d: HeartRateData) => d.timestamp);
        // Convert to number using Number() to avoid type issues
        timeRange.start = d3.min(timestamps) ? Number(d3.min(timestamps)) : 0;
        timeRange.end = d3.max(timestamps) ? Number(d3.max(timestamps)) : 0;
        createChart();
    }
    
    function handleStudentChange(event: Event) {
        studentId = (event.target as HTMLSelectElement).value;
    }
    
    function toggleAverage() {
        showAverage = !showAverage;
        createChart();
    }
    
    onMount(() => {
        // Create tooltip - using any type to avoid selection type issues
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('border-radius', '5px')
            .style('padding', '10px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', 1000);
            
        // Initial chart creation
        createChart();
        
        return () => {
            if (tooltip) tooltip.remove();
        };
    });
</script>

<div class='h-[100svh] w-full flex flex-col items-center justify-center'>
    <div class='w-[80vw] max-w-[1200px] flex flex-col gap-4 bg-white p-8 rounded-xl border-8 border-red-400'>
        <div class="flex flex-wrap gap-6 justify-center">
            <div class="flex items-center gap-2">
                <label for="student-select" class="font-medium text-xl">Student:</label>
                <select 
                    id="student-select" 
                    class="p-2 text-lg border border-gray-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-red-400 focus:border-red-400" 
                    value={studentId} 
                    on:change={handleStudentChange}
                >
                    {#each sortStudentIds([...new Set(hr_data.map((d: HeartRateData) => d.student))].map(id => id as string)) as student}
                        <option value={student}>{student}</option>
                    {/each}
                </select>
            </div>
            
            <button 
                class="flex items-center gap-1 px-6 py-2 bg-red-500 text-white text-lg rounded-md shadow hover:bg-red-600 transition-colors"
                on:click={toggleAverage}
            >
                {showAverage ? 'Hide' : 'Show'} Average
            </button>
            
            <button 
                class="px-6 py-2 bg-gray-100 text-lg text-gray-800 border border-gray-300 rounded-md shadow hover:bg-gray-200 transition-colors"
                on:click={resetZoom}
            >
                Reset Zoom
            </button>
        </div>
        
        <div class="text-lg text-gray-700 text-center mb-4">
            <p>Drag to zoom in on a time range. Double-click to reset.</p>
        </div>
        
        <div class="viz-container relative w-full overflow-x-auto bg-white rounded-lg">
            <svg bind:this={svgRef} class="mx-auto" width={width} height={height}></svg>
        </div>
    </div>
</div>