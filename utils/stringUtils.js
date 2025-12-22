/**
 * Calculates the Dice Coefficient between two strings.
 * Used for comparing board names to find similarities.
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} Similarity score between 0 and 1
 */
export const getSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;

    const s1 = str1.replace(/\s+/g, '').toLowerCase();
    const s2 = str2.replace(/\s+/g, '').toLowerCase();

    if (s1 === s2) return 1;
    if (s1.length < 2 || s2.length < 2) return 0;

    const bigrams1 = new Map();
    for (let i = 0; i < s1.length - 1; i++) {
        const bigram = s1.substring(i, i + 2);
        const count = bigrams1.has(bigram) ? bigrams1.get(bigram) + 1 : 1;
        bigrams1.set(bigram, count);
    }

    let intersection = 0;
    for (let i = 0; i < s2.length - 1; i++) {
        const bigram = s2.substring(i, i + 2);
        const count = bigrams1.has(bigram) ? bigrams1.get(bigram) : 0;

        if (count > 0) {
            bigrams1.set(bigram, count - 1);
            intersection++;
        }
    }

    return (2.0 * intersection) / (s1.length + s2.length - 2);
};
