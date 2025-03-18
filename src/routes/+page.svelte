<script lang="ts">
    import type { PageProps } from './$types';
    import Introduction from '$lib/components/Introduction.svelte';
    import ProjectIdea from '$lib/components/ProjectIdea.svelte';
    import HeartRate from '$lib/components/HeartRate.svelte';
    import HeartRateComparison from '$lib/components/HeartRateComparison.svelte';
    import ComparisonIntroduction from '$lib/components/ComparisonIntroduction.svelte';
    import Takeaways from '$lib/components/Takeaways.svelte';
    import FirstComparisonIntroduction from '$lib/components/FirstComparisonIntroduction.svelte';
    import FirstComparison from '$lib/components/FirstComparison.svelte';
    import HeartRateMonitor from '$lib/components/HeartRateMonitor.svelte';
    import MonitorIntroduction from '$lib/components/MonitorIntroduction.svelte';
    import CustomMonitor from '$lib/components/CustomMonitor.svelte';
    let { data }: PageProps = $props();
    let slide = $state(0);
    function nextSlide() {
      slide += 1;
    }
   </script>
   
   {#if slide === 0}
     <Introduction />
   {:else if slide === 1}
     <ProjectIdea />
   {:else if slide === 2}
     <HeartRate hr_data={data?.data} />
   {:else if slide === 3}
     <FirstComparisonIntroduction />
   {:else if slide === 4}
     <FirstComparison hr_data={data?.data} />
   {:else if slide === 5}
     <ComparisonIntroduction />
   {:else if slide === 6}
     <HeartRateComparison hr_data={data?.data} />
   {:else if slide === 7}
     <MonitorIntroduction />
   {:else if slide === 8}
     <HeartRateMonitor />
   {:else if slide === 9}
     <Takeaways />
   {:else if slide === 10}
     <CustomMonitor />
   {/if}
   
   {#if slide !== 10}
   <button class="next-button" onclick={nextSlide}>
    Next Slide
   </button>
   {/if}
   
   <style>
   .next-button {
     position: fixed;
     bottom: 6rem;
     left: 50%;
     transform: translateX(-50%);
     text-align: center;
     font-size: 1.2rem;
     padding: 0.5rem 1.5rem;
     background-color: #e53e3e;
     color: white;
     border: none;
     border-radius: 0.5rem;
     box-shadow: 0 3px 8px rgba(229, 62, 62, 0.3);
     cursor: pointer;
     transition: all 0.3s ease;
     overflow: hidden;
     z-index: 1;
    }
   .next-button:hover {
     background-color: #c53030;
     transform: translateX(-50%) scale(1.05);
     box-shadow: 0 5px 15px rgba(229, 62, 62, 0.4);
    }
   .next-button:active {
     transform: translateX(-50%) translateY(2px) scale(0.98);
     box-shadow: 0 2px 6px rgba(229, 62, 62, 0.5);
    }
   .next-button::before {
     content: '';
     position: absolute;
     top: 0;
     left: -100%;
     width: 100%;
     height: 100%;
     background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
     transition: left 0.7s ease;
     z-index: -1;
    }
   .next-button:hover::before {
     left: 100%;
    }
   </style>