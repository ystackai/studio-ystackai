// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    const frogElement = document.querySelector('.frog-container');
    const bezierCurve = generateFibonacciBezier(100);
    console.log('Fibonacci Bezier Curve:', bezierCurve);

    // Fetch debt tier and trigger animations
    fetchDebtTier()
        .then(tier => {
            console.log('Debt tier resolved:', tier);
            audioEngine.playSounds();
            setTimeout(() => {
                startSinkAnimation(frogElement, 3000);
            }, 100);
        })
        .catch(error => {
            console.log('Debt tier fetch failed:', error);
            // Even if it fails, still trigger audio and animation after a timeout
            audioEngine.playSounds();
            setTimeout(() => {
                startSinkAnimation(frogElement, 3000);
            }, 100);
        });
});
