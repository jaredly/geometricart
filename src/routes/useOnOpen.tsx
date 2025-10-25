import {useRef, useEffect} from 'react';

export const useOnOpen = (onOpen: (open: boolean) => void) => {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = ref.current!;
        let t: NodeJS.Timeout;
        const observer = new MutationObserver(() => {
            clearTimeout(t);
            if (dialog.hasAttribute('open')) {
                onOpen(true);
            } else {
                console.log('setting a timeout');
                t = setTimeout(() => onOpen(false), 300);
            }
        });
        observer.observe(dialog, {attributes: true, attributeFilter: ['open']});

        return () => observer.disconnect();
    }, [onOpen]);
    return ref;
};
