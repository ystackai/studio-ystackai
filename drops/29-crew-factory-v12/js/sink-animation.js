// Fibonacci cubic-bezier curve for sink animation
function generateFibonacciBezier(steps = 100) {
    // Generate Fibonacci sequence for curve control points
    let fib = [0, 1];
    for (let i = 2; i < steps; i++) {
        fib[i] = fib[i - 1] + fib[i - 2];
    }

    // Normalize to 0-1 range for CSS cubic-bezier
    const maxFib = Math.max(...fib);
    const normalized = fib.map(f => f / maxFib);

    // Take every 3rd element to get control points for cubic-bezier
    // We'll use 4 points for a cubic-bezier (0,0), (x1,y1), (x2,y2), (1,1)
    const points = [];
    for (let i = 0; i < normalized.length; i += 3) {
        if (i + 2 < normalized.length) {
            points.push({
                x: normalized[i],
                y: normalized[i + 2]
            });
        }
    }

    // Use first 3 points to define the cubic-bezier curve
    // We'll use the first point for x1,y1 and second point for x2,y2
    // The first point is (0,0) and last is (1,1) so we only need to define the middle two points
    if (points.length >= 2) {
        const p1 = points[0];
        const p2 = points[1];
        // Convert to CSS cubic-bezier format
        return `${p1.x}, ${p1.y}, ${p2.x}, ${p2.y}`;
    }

    // Fallback to a simple curve if we don't have enough data
    return '0.25, 0.1, 0.25, 1';
}

// Sink animation using requestAnimationFrame with Fibonacci timing
function startSinkAnimation(frogElement, duration = 3000) {
    const startTime = performance.now();
    const totalDuration = duration;
    
    // Get the initial position
    const initialPosition = frogElement.getBoundingClientRect().top;
    const viewportHeight = window.innerHeight;
    const finalPosition = viewportHeight; // Bottom of viewport
    
    // Create Fibonacci-based timing function
    function fibonacciTiming(t) {
        // Simple approach: use a modified sine wave that approximates Fibonacci growth
        // This creates a curve that starts slow and accelerates, similar to Fibonacci sequence
        return Math.pow(t, 1.618); // Using golden ratio exponent
    }

    // Create animation function
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        
        // Apply Fibonacci-based easing
        const easedProgress = fibonacciTiming(progress);
        const position = initialPosition + (finalPosition - initialPosition) * easedProgress;
        
        // Apply the position transformation
        frogElement.style.transform = `translateY(${position - initialPosition}px)`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    // Start the animation
    requestAnimationFrame(animate);
}

// Mock debt tier API
function fetchDebtTier() {
    return new Promise((resolve, reject) => {
        // Simulate network delay
        setTimeout(() => {
            // 80% chance of success
            if (Math.random() > 0.2) {
                // Return a mock debt tier
                const tiers = ['A', 'B', 'C', 'D', 'E'];
                const tier = tiers[Math.floor(Math.random() * tiers.length)];
                resolve({ tier: tier, score: Math.floor(Math.random() * 1000) });
            } else {
                // Simulate timeout
                reject(new Error('Network timeout'));
            }
        }, 1000);
    });
}
