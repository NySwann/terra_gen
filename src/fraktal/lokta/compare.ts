/**
 * Type for circular reference handling strategy
 */
type CircularReferenceHandling = 'error' | 'ignore';


/**
 * Comparison options that can be passed to comparison functions
 */
interface ComparisonOptions {
    /**
     * Whether to use strict equality (===) for comparing values
     * @default true
     */
    strict?: boolean;

    /**
     * How to handle circular references in objects
     * - 'error': throw an error when a circular reference is detected
     * - 'ignore': treat circular references as equal if they refer to the same ancestor
     * @default 'error'
     */
    circularReferences?: CircularReferenceHandling;
}

/**
 * Type of difference between two values
 */
type DifferenceType = 'added' | 'removed' | 'changed';

/**
 * Interface for detailed difference information
 */
interface DetailedDifference {
    /** Path to the property that differs */
    path: string;
    /** Type of difference */
    type: DifferenceType;
    /** Original value (undefined for added properties) */
    oldValue?: any;
    /** New value (undefined for removed properties) */
    newValue?: any;
}

/**
 * Error thrown when a circular reference is detected and handling is set to 'error'
 */
class CircularReferenceError extends Error {
    /**
     * Creates a new Circular Reference Error
     * @param path - Path where the circular reference was detected
     */
    constructor(path: string) {
        super(`Circular reference detected at path: ${path}`);
        this.name = 'CircularReferenceError';
    }
}

/**
 * Core utility functions for object comparison
 */


/**
 * Helper function to check if a value is an object
 * @param value - Value to check
 * @returns Whether the value is an object
 */
const isObject = (value: any): boolean => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};


/**
 * Helper function to determine if two values are equal
 * @param a - First value
 * @param b - Second value
 * @param strict - Whether to use strict equality
 * @returns Whether the values are equal
 */
const areValuesEqual = (a: any, b: any, strict = true): boolean => {
    // Handle identical values first
    if (a === b) return true;

    // If strict mode is enabled and values are not strictly equal, they're not equal
    if (strict) return false;

    // For non-strict mode:

    // Handle NaN
    if (Number.isNaN(a) && Number.isNaN(b)) return true;

    // Handle null and undefined
    if ((a === null && b === undefined) || (a === undefined && b === null)) return true;

    // Handle type coercion for primitives
    if (typeof a === 'string' || typeof b === 'string') {
        // Only try numeric comparison if one is a string and the other is a number
        if ((typeof a === 'string' && typeof b === 'number') ||
            (typeof a === 'number' && typeof b === 'string')) {
            const numA = Number(a);
            const numB = Number(b);
            if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA === numB) return true;
        }
    }

    // Handle boolean values
    if (typeof a === 'boolean' || typeof b === 'boolean') {
        const boolA = Boolean(a);
        const boolB = Boolean(b);
        if (boolA === boolB) return true;
    }

    // At this point, if one is falsy and the other is not, they're not equal
    if (!a || !b) return false;

    // If both are dates
    if (a instanceof Date && b instanceof Date)
        return a.getTime() === b.getTime();

    // If both are RegExp
    if (a instanceof RegExp && b instanceof RegExp)
        return a.toString() === b.toString();

    return false;
};

/**
 * Helper function to determine if two values are equal
 * @param a - First value
 * @param b - Second value
 * @param strict - Whether to use strict equality
 * @returns Whether the values are equal
 */

/**
 * Handles comparison for arrays and objects
 * @param firstValue - First value to compare
 * @param secondValue - Second value to compare
 * @param currentPath - Current path for conflicts
 * @param options - Comparison options
 * @param isArrayComparison - Whether this is an array comparison
 * @param detailed - Whether to return detailed difference information
 * @param firstVisited - Map of already visited objects in the first object tree
 * @param secondVisited - Map of already visited objects in the second object tree
 * @returns Array of conflict paths or detailed differences, or boolean indicating equality
 */
const handleDepthComparison = (
    firstValue: any,
    secondValue: any,
    currentPath: string,
    options: ComparisonOptions,
    isArrayComparison: boolean,
    detailed = false,
    firstVisited: Map<any, string> = new Map(),
    secondVisited: Map<any, string> = new Map()
): string[] | DetailedDifference[] | boolean => {
    const { strict = true, circularReferences = 'error' } = options;

    // Handle Date objects specially
    if (firstValue instanceof Date && secondValue instanceof Date) {
        if (firstValue.getTime() === secondValue.getTime()) {
            return true;
        }

        return detailed
            ? [{
                path: currentPath,
                type: 'changed',
                oldValue: firstValue,
                newValue: secondValue
            } as DetailedDifference]
            : [currentPath];
    }

    // Handle RegExp objects specially
    if (firstValue instanceof RegExp && secondValue instanceof RegExp) {
        if (firstValue.toString() === secondValue.toString()) {
            return true;
        }
        return detailed
            ? [{
                path: currentPath,
                type: 'changed',
                oldValue: firstValue,
                newValue: secondValue
            } as DetailedDifference]
            : [currentPath];
    }

    // Check for circular references in arrays
    if (Array.isArray(firstValue) && Array.isArray(secondValue)) {
        // Check if either array has been visited before
        const firstVisitedPath = firstVisited.get(firstValue);
        const secondVisitedPath = secondVisited.get(secondValue);

        if (firstVisitedPath !== undefined || secondVisitedPath !== undefined) {
            // If handling is set to error, throw an error
            if (circularReferences === 'error') {
                throw new CircularReferenceError(currentPath);
            }

            // If both arrays have been visited before and they reference the same relative position in their structures
            if (firstVisitedPath !== undefined && secondVisitedPath !== undefined) {
                // If both paths are the same, consider them equal
                return true;
            }

            // If only one has been visited or they're at different positions, consider them different
            return detailed
                ? [{
                    path: currentPath,
                    type: 'changed',
                    oldValue: firstValue,
                    newValue: secondValue
                } as DetailedDifference]
                : [currentPath];
        }

        // Mark arrays as visited before going deeper
        firstVisited.set(firstValue, currentPath);
        secondVisited.set(secondValue, currentPath);

        if (firstValue.length !== secondValue.length) {
            return isArrayComparison
                ? false
                : (detailed
                    ? [{
                        path: currentPath,
                        type: 'changed',
                        oldValue: firstValue,
                        newValue: secondValue
                    } as DetailedDifference]
                    : [currentPath]);
        }

        // For direct array comparison or nested arrays
        const conflicts = detailed ? [] as DetailedDifference[] : [] as string[];
        let hasConflict = false;

        // Iterate through array elements and compare them
        for (let i = 0; i < firstValue.length; i++) {
            // Construct the array element path
            const elemPath = `${currentPath}.${i}`;

            // Compare array elements
            if (isObject(firstValue[i]) && isObject(secondValue[i])) {
                // Recursively compare objects within arrays
                try {
                    const result = handleDepthComparison(
                        firstValue[i],
                        secondValue[i],
                        elemPath,
                        options,
                        false,
                        detailed,
                        new Map(firstVisited),  // Create a new map to avoid shared references
                        new Map(secondVisited)  // Create a new map to avoid shared references
                    );

                    if (result !== true) {
                        hasConflict = true;
                        if (Array.isArray(result)) {
                            if (detailed) {
                                (conflicts).push(...(result as DetailedDifference[]));
                            } else {
                                (conflicts as string[]).push(...(result as string[]));
                            }
                        }
                    }
                } catch (error) {
                    if (error instanceof CircularReferenceError) {
                        if (circularReferences === 'error') {
                            throw error;
                        }
                        // If circularReferences is 'ignore', continue with next comparison
                    } else {
                        throw error;
                    }
                }
            } else if (Array.isArray(firstValue[i]) && Array.isArray(secondValue[i])) {
                // Recursively compare nested arrays
                try {
                    const result = handleDepthComparison(
                        firstValue[i],
                        secondValue[i],
                        elemPath,
                        options,
                        true,
                        detailed,
                        new Map(firstVisited),  // Create a new map to avoid shared references
                        new Map(secondVisited)  // Create a new map to avoid shared references
                    );

                    if (result !== true) {
                        hasConflict = true;
                        if (Array.isArray(result)) {
                            if (detailed) {
                                (conflicts).push(...(result as DetailedDifference[]));
                            } else {
                                (conflicts as string[]).push(...(result as string[]));
                            }
                        } else if (!result) {
                            // For arrays compared directly
                            if (detailed) {
                                (conflicts).push({
                                    path: elemPath,
                                    type: 'changed',
                                    oldValue: firstValue[i],
                                    newValue: secondValue[i]
                                });
                            } else {
                                (conflicts as string[]).push(elemPath);
                            }
                        }
                    }
                } catch (error) {
                    if (error instanceof CircularReferenceError) {
                        if (circularReferences === 'error') {
                            throw error;
                        }
                        // If circularReferences is 'ignore', continue with next comparison
                    } else {
                        throw error;
                    }
                }
            } else if (!areValuesEqual(firstValue[i], secondValue[i], strict)) {
                // For primitive values that are not equal
                hasConflict = true;
                if (detailed) {
                    (conflicts).push({
                        path: elemPath,
                        type: 'changed',
                        oldValue: firstValue[i],
                        newValue: secondValue[i]
                    });
                } else {
                    (conflicts as string[]).push(elemPath);
                }
            }
        }

        if (isArrayComparison && hasConflict && conflicts.length === 0) {
            return false;
        }

        return conflicts.length > 0 ? conflicts : true;
    }

    // Handle objects
    if (isObject(firstValue) && isObject(secondValue)) {
        // Check if either object has been visited before
        const firstVisitedPath = firstVisited.get(firstValue);
        const secondVisitedPath = secondVisited.get(secondValue);

        if (firstVisitedPath !== undefined || secondVisitedPath !== undefined) {
            // If handling is set to error, throw an error
            if (circularReferences === 'error') {
                throw new CircularReferenceError(currentPath);
            }

            // If both objects have been visited before and they reference the same relative position in their structures
            if (firstVisitedPath !== undefined && secondVisitedPath !== undefined) {
                // If both paths are the same, consider them equal
                return true;
            }

            // If only one has been visited or they're at different positions, consider them different
            return detailed
                ? [{
                    path: currentPath,
                    type: 'changed',
                    oldValue: firstValue,
                    newValue: secondValue
                } as DetailedDifference]
                : [currentPath];
        }

        // Mark objects as visited before going deeper
        firstVisited.set(firstValue, currentPath);
        secondVisited.set(secondValue, currentPath);

        const allKeys = new Set([...Object.keys(firstValue), ...Object.keys(secondValue)]);
        const conflicts = detailed ? [] as DetailedDifference[] : [] as string[];

        for (const key of allKeys) {
            const hasFirst = key in firstValue;
            const hasSecond = key in secondValue;
            const propPath = `${currentPath}.${key}`;


            // If key exists in one but not in the other
            if (!hasFirst || !hasSecond) {
                if (detailed) {
                    const type: DifferenceType = !hasFirst ? 'added' : 'removed';
                    (conflicts).push({
                        path: propPath,
                        type,
                        oldValue: !hasFirst ? undefined : firstValue[key],
                        newValue: !hasSecond ? undefined : secondValue[key]
                    });
                } else {
                    (conflicts as string[]).push(propPath);
                }
                continue;
            }

            // Both objects have the key, compare their values
            try {
                const result = handleDepthComparison(
                    firstValue[key],
                    secondValue[key],
                    propPath,
                    options,
                    false,
                    detailed,
                    new Map(firstVisited),  // Create a new map to avoid shared references
                    new Map(secondVisited)  // Create a new map to avoid shared references
                );

                if (result !== true) {
                    if (Array.isArray(result)) {
                        if (detailed) {
                            (conflicts).push(...(result as DetailedDifference[]));
                        } else {
                            (conflicts as string[]).push(...(result as string[]));
                        }
                    } else if (typeof result === 'string') {
                        (conflicts as string[]).push(result);
                    }
                }
            } catch (error) {
                if (error instanceof CircularReferenceError) {
                    if (circularReferences === 'error') {
                        throw error;
                    }
                    // If circularReferences is 'ignore', just mark this property as different
                    if (detailed) {
                        (conflicts).push({
                            path: propPath,
                            type: 'changed',
                            oldValue: firstValue[key],
                            newValue: secondValue[key]
                        });
                    } else {
                        (conflicts as string[]).push(propPath);
                    }
                } else {
                    throw error;
                }
            }
        }

        return conflicts.length > 0 ? conflicts : true;
    }

    // Handle primitive values
    if (areValuesEqual(firstValue, secondValue, strict)) {
        return true;
    }

    return detailed
        ? [{
            path: currentPath,
            type: 'changed',
            oldValue: firstValue,
            newValue: secondValue
        } as DetailedDifference]
        : [currentPath];
};

/**
 * Compares two objects and returns detailed information about differences
 * 
 * @param firstObject - First object to compare
 * @param secondObject - Second object to compare
 * @param pathOfConflict - Starting path for conflict (optional)
 * @param options - Optional comparison options (strict, circularReferences, pathFilter)
 * @returns Array of detailed differences
 */
export const CompareValuesWithDetailedDifferences = (
    firstObject: any,
    secondObject: any,
    pathOfConflict = '',
    options: ComparisonOptions = {}
): DetailedDifference[] => {
    return _CompareValuesWithDetailedDifferences(
        firstObject,
        secondObject,
        pathOfConflict,
        options
    );
};

/**
 * Internal implementation of CompareValuesWithDetailedDifferences
 * This is separated to allow for memoization
 */
const _CompareValuesWithDetailedDifferences = (
    firstObject: any,
    secondObject: any,
    pathOfConflict = '',
    options: ComparisonOptions = {}
): DetailedDifference[] => {
    // Extract options
    const { circularReferences = 'error' } = options;

    // If the objects are the same reference, there are no differences
    if (Object.is(firstObject, secondObject)) {
        return [];
    }

    // Check for obvious circular references in the top-level objects
    if (circularReferences === 'error') {
        // Look for direct self-references in both objects
        for (const key in firstObject) {
            if (firstObject[key] === firstObject) {
                throw new CircularReferenceError(key);
            }
        }

        for (const key in secondObject) {
            if (secondObject[key] === secondObject) {
                throw new CircularReferenceError(key);
            }
        }
    }

    try {
        // For exclude mode, use the unified depth handling function
        const differences = handleDepthComparison(firstObject, secondObject, pathOfConflict, options, false, true);

        if (!Array.isArray(differences)) {
            return [];
        }

        // Type assertion because we know the differences will be DetailedDifference objects due to detailed=true parameter
        const detailedDifferences = differences as DetailedDifference[];

        return detailedDifferences;
    } catch (error) {
        if (error instanceof CircularReferenceError) {
            if (circularReferences === 'error') {
                throw error;
            }
            // If circularReferences is 'ignore' and we're getting an error, return empty array
            return [];
        }
        throw error;
    }
};