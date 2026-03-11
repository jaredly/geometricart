import {AnimatableCoord, AnimatableNumber} from '../export-types';
import {BlurInput} from './BlurInput';
import {parseAnimatable} from './createLayerTemplate';

export const AnimCoordOrNumberInput = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value?: AnimatableCoord | AnimatableNumber;
    onChange: (next?: AnimatableCoord | AnimatableNumber) => void;
}) => {
    return (
        <div className="form-control">
            <div className="label flex gap-2 items-center">
                <span className="label-text text-sm font-semibold">{label}</span>
            </div>
            <BlurInput
                value={value != null ? String(value) : ''}
                placeholder="number | expression"
                onChange={(value) => onChange(parseAnimatable(value))}
            />
        </div>
    );
};
