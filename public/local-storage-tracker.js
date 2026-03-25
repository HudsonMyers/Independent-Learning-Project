// local-storage-tracker.js

const USAGE_LIMIT = 10;
const NOTES_USAGE_LIMIT_AUTHENTICATED = 1;
const COOLDOWN_HOURS = 4;
const NOTES_COOLDOWN_HOURS = 24;

export function checkAndIncrementUsage(userStatus) {
    if (userStatus === 'authenticated' || userStatus === 'premium') {
        return { canGenerate: true, message: 'Authenticated user. Unlimited usage.' };
    }

    let usageData = JSON.parse(localStorage.getItem('usageData')) || { count: 0, lastReset: Date.now() };
    
    // Validate the lastReset timestamp
    if (isNaN(usageData.lastReset)) {
        console.warn('Corrupted usage data detected. Resetting localStorage.');
        usageData = { count: 0, lastReset: Date.now() };
        localStorage.setItem('usageData', JSON.stringify(usageData));
    }

    const now = Date.now();
    const elapsedTime = now - usageData.lastReset;
    const cooldownPeriod = COOLDOWN_HOURS * 60 * 60 * 1000;

    if (elapsedTime >= cooldownPeriod) {
        usageData = { count: 0, lastReset: now };
    }

    if (usageData.count >= USAGE_LIMIT) {
        const timeRemaining = cooldownPeriod - elapsedTime;
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        return {
            canGenerate: false,
            message: `You have reached your limit of ${USAGE_LIMIT} questions. You can generate more in ${hours} hours, ${minutes} minutes, and ${seconds} seconds, or log in for unlimited questions!`,
            timeRemaining: { hours, minutes, seconds }
        };
    }

    usageData.count += 1;
    localStorage.setItem('usageData', JSON.stringify(usageData));
    return { canGenerate: true, message: 'Question generated successfully.' };
}

export function checkUsageStatus(userStatus) {
    if (userStatus === 'authenticated' || userStatus === 'premium') {
        return { canGenerate: true, message: 'Authenticated user. Unlimited usage.' };
    }

    const usageData = JSON.parse(localStorage.getItem('usageData')) || { count: 0, lastReset: Date.now() };
    
    // Validate the lastReset timestamp
    if (isNaN(usageData.lastReset)) {
        console.warn('Corrupted usage data detected. Resetting localStorage.');
        localStorage.setItem('usageData', JSON.stringify({ count: 0, lastReset: Date.now() }));
        return { canGenerate: true, message: 'Usage limit reset due to corrupted data.' };
    }

    const now = Date.now();
    const elapsedTime = now - usageData.lastReset;
    const cooldownPeriod = COOLDOWN_HOURS * 60 * 60 * 1000;

    if (elapsedTime >= cooldownPeriod) {
        localStorage.setItem('usageData', JSON.stringify({ count: 0, lastReset: now }));
        return { canGenerate: true, message: 'Usage limit reset.' };
    }

    if (usageData.count >= USAGE_LIMIT) {
        const timeRemaining = cooldownPeriod - elapsedTime;
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        return {
            canGenerate: false,
            message: `You have reached your limit of ${USAGE_LIMIT} questions. You can generate more in ${hours} hours, ${minutes} minutes, and ${seconds} seconds, or log in for unlimited questions!`,
            timeRemaining: { hours, minutes, seconds }
        };
    }

    return { canGenerate: true, message: `Questions remaining: ${USAGE_LIMIT - usageData.count}` };
}

export function checkAndIncrementNotesUsage(userStatus) {
    if (userStatus === 'premium') {
        return { canUpload: true, message: 'Premium user. Unlimited notes usage.' };
    }
    
    if (userStatus === 'unauthenticated') {
        return { canUpload: false, message: 'You must be logged in to use this feature. Log in or sign up to get started!' };
    }

    let notesUsageData = JSON.parse(localStorage.getItem('notesUsageData')) || { count: 0, lastReset: Date.now() };
    
    // Validate the lastReset timestamp
    if (isNaN(notesUsageData.lastReset)) {
        console.warn('Corrupted notes data detected. Resetting localStorage.');
        notesUsageData = { count: 0, lastReset: Date.now() };
        localStorage.setItem('notesUsageData', JSON.stringify(notesUsageData));
    }

    const now = Date.now();
    const elapsedTime = now - notesUsageData.lastReset;
    const cooldownPeriod = NOTES_COOLDOWN_HOURS * 60 * 60 * 1000;

    if (elapsedTime >= cooldownPeriod) {
        notesUsageData = { count: 0, lastReset: now };
    }

    if (notesUsageData.count >= NOTES_USAGE_LIMIT_AUTHENTICATED) {
         const timeRemaining = cooldownPeriod - elapsedTime;
         const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
         const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
         const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        return {
            canUpload: false,
            message: `You've reached the max of 1 added file. Upgrade to premium or come back in ${hours} hours, ${minutes} minutes, and ${seconds} seconds.`,
            timeRemaining: { hours, minutes, seconds }
        };
    }

    notesUsageData.count += 1;
    localStorage.setItem('notesUsageData', JSON.stringify(notesUsageData));
    return { canUpload: true, message: 'Notes uploaded successfully.' };
}

export function checkNotesUsageStatus(userStatus) {
    if (userStatus === 'premium') {
        return { canUpload: true, message: 'Premium user. Unlimited notes usage.' };
    }

    if (userStatus === 'unauthenticated') {
        return { canUpload: false, message: 'You must be logged in to use this feature. Log in or sign up to get started!' };
    }
    
    const notesUsageData = JSON.parse(localStorage.getItem('notesUsageData')) || { count: 0, lastReset: Date.now() };
    
    // Validate the lastReset timestamp
    if (isNaN(notesUsageData.lastReset)) {
        console.warn('Corrupted notes data detected. Resetting localStorage.');
        localStorage.setItem('notesUsageData', JSON.stringify({ count: 0, lastReset: Date.now() }));
        return { canUpload: true, message: 'Notes upload limit reset due to corrupted data.' };
    }

    const now = Date.now();
    const elapsedTime = now - notesUsageData.lastReset;
    const cooldownPeriod = NOTES_COOLDOWN_HOURS * 60 * 60 * 1000;

    if (elapsedTime >= cooldownPeriod) {
        localStorage.setItem('notesUsageData', JSON.stringify({ count: 0, lastReset: now }));
        return { canUpload: true, message: 'Notes upload limit reset.' };
    }

    if (notesUsageData.count >= NOTES_USAGE_LIMIT_AUTHENTICATED) {
        const timeRemaining = cooldownPeriod - elapsedTime;
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        return {
            canUpload: false,
            message: `You've reached the max of 1 added file. Upgrade to premium or come back in ${hours} hours, ${minutes} minutes, and ${seconds} seconds.`,
            timeRemaining: { hours, minutes, seconds }
        };
    }

    return { canUpload: true, message: `Notes uploads remaining: ${NOTES_USAGE_LIMIT_AUTHENTICATED - notesUsageData.count}` };
}