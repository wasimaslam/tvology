import throttledQueue from 'throttled-queue';
const throttleFast = throttledQueue(1, 50);
const throttleSlow = throttledQueue(1, 150);


export default function throttle(work) {
    return throttleFast(work)
        .catch(e => {
            throttleSlow(work).catch((e) => {
                throw e;
            });
        });
}