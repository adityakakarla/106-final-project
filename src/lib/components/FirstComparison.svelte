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
    
    // Student grades lookup removed
    
    let selectedStudents = $state<string[]>([]);
    let timeRange = $state<{ start: number | null; end: number | null }>({ start: null, end: null });
    let showAverages = $state(false);
    let svgRef = $state<SVGSVGElement | null>(null);
    let width = $state(1800);
    let height = $state(500);
    let margin = { top: 50, right: 250, bottom: 80, left: 80 }; // Increased right margin for larger legend text
    
    // Color scale for student lines with red-based palette
    const colorScale = d3.scaleOrdinal<string>()
        .domain(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'])
        .range([
            '#4361EE', // Blue
            '#3A0CA3', // Purple
            '#7209B7', // Violet
            '#F72585', // Pink
            '#4CC9F0', // Light blue
            '#06D6A0', // Teal
            '#118AB2', // Dark blue
            '#FFD166', // Yellow
            '#FB8500', // Orange
            '#2EC4B6'  // Turquoise
        ]);

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

    // Toggle student selection
    function toggleStudentSelection(student: string) {
        if (selectedStudents.includes(student)) {
            selectedStudents = selectedStudents.filter(s => s !== student);
        } else {
            selectedStudents = [...selectedStudents, student];
        }
        
        if (selectedStudents.length > 0) {
            createChart();
        } else {
            // Clear chart but show message
            d3.select(svgRef).selectAll("*").remove();
            showEmptySelectionMessage();
        }
    }
    
    // Select all students
    function selectAllStudents() {
        selectedStudents = sortStudentIds([...new Set(hr_data.map((d: HeartRateData) => d.student))] as string[]);
        createChart();
    }
    
    // Clear all selections
    function clearSelections() {
        selectedStudents = [];
        // Clear chart but show message
        d3.select(svgRef).selectAll("*").remove();
        showEmptySelectionMessage();
    }
    
    // Show message when no students are selected
    function showEmptySelectionMessage() {
        if (svgRef) {
            d3.select(svgRef)
                .attr('width', width)
                .attr('height', height)
                .append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('font-size', '18px')
                .attr('fill', '#666')
        }
    }

    $effect(() => {
        if (svgRef && hr_data) {
            if (selectedStudents.length > 0) {
                createChart();
            } else {
                showEmptySelectionMessage();
            }
        }
    });

    function createChart() {
        // Clear any existing chart
        d3.select(svgRef).selectAll("*").remove();
        
        if (selectedStudents.length === 0) {
            // Display a message if no students are selected
            showEmptySelectionMessage();
            return;
        }
        
        // Initialize timeRange if not set
        if (!timeRange.start || !timeRange.end) {
            const timestamps = hr_data.map((d: HeartRateData) => d.timestamp);
            timeRange.start = d3.min(timestamps) ? Number(d3.min(timestamps)) : 0;
            timeRange.end = d3.max(timestamps) ? Number(d3.max(timestamps)) : 0;
        }
        
        // Filter data by selected students and time range
        const filteredData = hr_data.filter((d: HeartRateData) => 
            selectedStudents.includes(d.student) && 
            (d.timestamp >= (timeRange.start || 0)) && 
            (d.timestamp <= (timeRange.end || 0))
        );
        
        // Group data by student
        const studentData = d3.group(filteredData, (d: HeartRateData) => d.student);
        
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
            
        // Create scales
        const xScale = d3.scaleTime()
            .domain([
                new Date((timeRange.start || 0) * 1000), 
                new Date((timeRange.end || 0) * 1000)
            ])
            .range([margin.left, width - margin.right]);
        
        // Find min and max heart rates across all selected students
        const allValues = Array.from(studentData.values()).flat().map(d => d.value);
        const yScale = d3.scaleLinear()
            .domain([
                Math.max(0, (d3.min(allValues) || 0) * 0.9),
                (d3.max(allValues) || 0) * 1.1
            ])
            .range([height - margin.bottom, margin.top])
            .nice();
            
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
                .ticks(width / 120)
            )
            .call(g => g.select('.domain').attr('stroke', '#666').attr('stroke-width', 1.5))
            .call(g => g.selectAll('.tick line').attr('stroke', '#666'))
            .call(g => g.selectAll('.tick text')
                .attr('fill', '#333')
                .attr('font-size', '16px')
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
                .attr('font-size', '16px')
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
            .attr('font-size', '20px')
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('fill', '#333')
            .text('Time');
        
        // Add Y-axis label
        svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(height / 2))
            .attr('y', 25)
            .attr('font-size', '20px')
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('fill', '#333')
            .text('Heart Rate (BPM)');
        
        // Create a line generator with stronger smoothing
        const line = d3.line<HeartRateData>()
            .defined(d => !isNaN(d.value))
            .x(d => xScale(new Date(d.timestamp * 1000)))
            .y(d => yScale(d.value))
            .curve(d3.curveCatmullRom.alpha(0.5)); // Use Catmull-Rom for smoother curves
            
        // Add lines for each student with smoothing
        studentData.forEach((data, student) => {
            // Sort data by timestamp
            data.sort((a, b) => a.timestamp - b.timestamp);
            
            // Add the line path
            const path = svg.append('path')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', colorScale(student))
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
                
            // Add average line if requested
            if (showAverages && data.length > 0) {
                const avgValue = d3.mean(data, (d: HeartRateData) => d.value) || 0;
                
                // Add horizontal average line with the same color but dashed
                svg.append('line')
                    .attr('x1', margin.left)
                    .attr('y1', yScale(avgValue))
                    .attr('x2', width - margin.right)
                    .attr('y2', yScale(avgValue))
                    .attr('stroke', colorScale(student))
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '6,3')
                    .attr('opacity', 0.8)
                    .attr('clip-path', 'url(#clip)');
                
                // Add average value label at the end of the line
                svg.append('text')
                    .attr('x', width - margin.right + 5)
                    .attr('y', yScale(avgValue) + 4)
                    .attr('fill', colorScale(student))
                    .attr('font-size', '16px')
                    .attr('font-weight', 'bold')
                    .text(`Avg: ${Math.round(avgValue)} BPM`);
            }
        });
        
        // Create legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - margin.right + 20}, ${margin.top + 10})`);
            
        // Add title for legend
        legend.append('text')
            .attr('x', 0)
            .attr('y', -5)
            .attr('fill', '#333')
            .attr('font-size', '18px')
            .attr('font-weight', 'bold')
            .text('Students');
            
        // Add legend items
        selectedStudents.forEach((student, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 30 + 20})`);
                
            // Add line for the student
            legendItem.append('line')
                .attr('x1', 0)
                .attr('y1', 10)
                .attr('x2', 25)
                .attr('y2', 10)
                .attr('stroke', colorScale(student))
                .attr('stroke-width', 4);
                
            // Add student label without grade percentage
            legendItem.append('text')
                .attr('x', 35)
                .attr('y', 14)
                .attr('fill', '#333')
                .attr('font-size', '16px')
                .attr('font-weight', 'bold')
                .text(student);
        });
        
        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '24px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text('Heart Rate Comparison');
            
        // Add tooltip for points
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('border-radius', '5px')
            .style('padding', '10px')
            .style('font-size', '14px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', 1000);
            
        // Add vertical line and points for tooltip
        const tooltipLine = svg.append('line')
            .attr('class', 'tooltip-line')
            .attr('stroke', '#666')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .attr('y1', margin.top)
            .attr('y2', height - margin.bottom)
            .style('display', 'none');
            
        const tooltipPoints = svg.append('g')
            .attr('class', 'tooltip-points')
            .style('display', 'none');
            
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
                // Get mouse x position
                const [mouseX] = d3.pointer(event);
                
                // Ignore if outside chart area
                if (mouseX < margin.left || mouseX > width - margin.right) {
                    tooltip.style('opacity', 0);
                    tooltipLine.style('display', 'none');
                    tooltipPoints.style('display', 'none');
                    return;
                }
                
                // Convert mouse position to date
                const date = xScale.invert(mouseX);
                const timestamp = date.getTime() / 1000;
                
                // Find the closest data point for each student
                tooltipLine
                    .attr('x1', mouseX)
                    .attr('x2', mouseX)
                    .style('display', 'block');
                    
                tooltipPoints.style('display', 'block').selectAll('*').remove();
                
                let tooltipContent = `<strong>Time: ${formatTime(timestamp)}</strong><br />`;
                
                // For each student line, find closest point
                studentData.forEach((data, student) => {
                    const bisect = d3.bisector((d: HeartRateData) => d.timestamp).left;
                    const index = bisect(data, timestamp);
                    
                    if (index > 0 && index < data.length) {
                        const d0 = data[index - 1];
                        const d1 = data[index];
                        const d = timestamp - d0.timestamp > d1.timestamp - timestamp ? d1 : d0;
                        
                        // Add point at this location
                        tooltipPoints.append('circle')
                            .attr('cx', xScale(new Date(d.timestamp * 1000)))
                            .attr('cy', yScale(d.value))
                            .attr('r', 5)
                            .attr('fill', colorScale(student))
                            .attr('stroke', 'white')
                            .attr('stroke-width', 2);
                            
                        // Add to tooltip content without grade percentage
                        tooltipContent += `<span style="color:${colorScale(student)}">●</span> ${student}: ${d.value} BPM<br />`;
                    }
                });
                
                // Position and show tooltip
                tooltip
                    .html(tooltipContent)
                    .style('left', `${event.pageX + 15}px`)
                    .style('top', `${event.pageY - 30}px`)
                    .style('opacity', 1);
            })
            .on('mouseout', () => {
                tooltip.style('opacity', 0);
                tooltipLine.style('display', 'none');
                tooltipPoints.style('display', 'none');
            });
            
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
    
    function toggleAverages() {
        showAverages = !showAverages;
        console.log("Toggled averages, now:", showAverages);
        if (selectedStudents.length > 0) {
            createChart();
        }
    }
    
    onMount(() => {
        // Initial chart creation or show message
        if (selectedStudents.length > 0) {
            createChart();
        } else {
            showEmptySelectionMessage();
        }
        
        return () => {
            // Clean up tooltip if it exists
            d3.select('body').selectAll('.tooltip').remove();
        };
    });
</script>

<div class='h-[100svh] w-full flex flex-col items-center justify-center'>
    <div class='w-[90vw] max-w-[1800px] pb-48 flex flex-col gap-4 bg-white p-8 rounded-xl border-8 border-red-500'>
        <h2 class="text-3xl font-bold text-center mb-2">Student Heart Rate Comparison</h2>
        
        <div class="flex flex-wrap gap-6 justify-center mb-4">
            <div class="flex flex-wrap items-center gap-2 justify-center">
                <span class="font-medium text-2xl">Students:</span>
                <div class="flex flex-wrap gap-2 max-w-[1000px]">
                    {#each sortStudentIds([...new Set(hr_data.map((d: HeartRateData) => d.student))] as string[]) as student}
                        <button 
                            class="px-4 py-2 text-lg rounded-md shadow-sm transition-colors {selectedStudents.includes(student) ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-800 hover:bg-red-100'}"
                            on:click={() => toggleStudentSelection(student)}
                        >
                            {student}
                        </button>
                    {/each}
                </div>
                
                <div class="flex gap-2 ml-2">
                    <button 
                        class="px-4 py-2 bg-red-100 text-red-800 text-base rounded-md hover:bg-red-200 transition-colors"
                        on:click={selectAllStudents}
                    >
                        All
                    </button>
                    <button 
                        class="px-4 py-2 bg-gray-100 text-gray-800 text-base rounded-md hover:bg-gray-200 transition-colors"
                        on:click={clearSelections}
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
        
        <div class="flex flex-wrap gap-6 justify-center">
            <button 
                class="flex items-center gap-1 px-6 py-2 {showAverages ? 'bg-red-700' : 'bg-red-500'} text-white text-xl rounded-md shadow hover:bg-red-600 transition-colors"
                on:click={toggleAverages}
            >
                {showAverages ? 'Hide' : 'Show'} Averages
            </button>
            
        </div>

        
        <div class="viz-container relative w-full overflow-x-auto bg-white rounded-lg">
            <svg bind:this={svgRef} class="mx-auto" width={width} height={height}></svg>
            
            {#if selectedStudents.length === 0}
                <div class="absolute inset-0 flex items-center justify-center">
                    <p class="text-2xl text-gray-400">Please select at least one student to display heart rate data</p>
                </div>
            {/if}
        </div>
    </div>
</div>
