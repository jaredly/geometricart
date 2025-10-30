
export const stringToCheckpoint = (s: string) => {
    const [branchId, branchLength, undo] = s.split('-');
    return {
        branchId: parseInt(branchId),
        branchLength: parseInt(branchLength),
        undo: parseInt(undo),
    };
};