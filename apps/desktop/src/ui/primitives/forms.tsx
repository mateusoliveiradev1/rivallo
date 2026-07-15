import { Icon } from '@rivallo/icons';
import {
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from 'react';

interface FieldTextProps {
  readonly helperText?: string;
  readonly error?: string;
  readonly helperId: string;
  readonly errorId: string;
}

function FieldText({ helperText, error, helperId, errorId }: FieldTextProps) {
  return (
    <>
      {helperText && (
        <p className="rv-field__helper" id={helperId}>
          {helperText}
        </p>
      )}
      {error && (
        <p className="rv-field__error" id={errorId}>
          <Icon name="danger" size={16} />
          <span>{error}</span>
        </p>
      )}
    </>
  );
}

function describedBy(helperText: string | undefined, error: string | undefined, ids: string[]) {
  return (
    [helperText ? ids[0] : undefined, error ? ids[1] : undefined].filter(Boolean).join(' ') ||
    undefined
  );
}

interface CommonFieldProps {
  readonly label: string;
  readonly helperText?: string;
  readonly error?: string;
}

export interface TextFieldProps
  extends CommonFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'color'> {}

export function TextField({
  label,
  helperText,
  error,
  id: providedId,
  className,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const id = providedId ?? `rv-field-${generatedId}`;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  return (
    <div className="rv-field">
      <label className="rv-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        {...inputProps}
        aria-describedby={describedBy(helperText, error, [helperId, errorId])}
        aria-errormessage={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className={['rv-field__control', className].filter(Boolean).join(' ')}
        id={id}
      />
      <FieldText error={error} errorId={errorId} helperId={helperId} helperText={helperText} />
    </div>
  );
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps
  extends CommonFieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'color'> {
  readonly options: readonly SelectOption[];
}

export function Select({
  label,
  helperText,
  error,
  options,
  id: providedId,
  className,
  ...selectProps
}: SelectProps) {
  const generatedId = useId();
  const id = providedId ?? `rv-select-${generatedId}`;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  return (
    <div className="rv-field">
      <label className="rv-field__label" htmlFor={id}>
        {label}
      </label>
      <select
        {...selectProps}
        aria-describedby={describedBy(helperText, error, [helperId, errorId])}
        aria-errormessage={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className={['rv-field__control', 'rv-field__select', className].filter(Boolean).join(' ')}
        id={id}
      >
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldText error={error} errorId={errorId} helperId={helperId} helperText={helperText} />
    </div>
  );
}

export type CheckboxState = boolean | 'indeterminate';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'checked' | 'children' | 'color' | 'onChange' | 'type'
> {
  readonly label: string;
  readonly checked: CheckboxState;
  readonly error?: string;
  readonly onCheckedChange: (checked: boolean) => void;
}

const checkboxStateText = (checked: CheckboxState) => {
  if (checked === 'indeterminate') return 'Parcialmente marcado';
  return checked ? 'Marcado' : 'Não marcado';
};

export function Checkbox({
  label,
  checked,
  error,
  onCheckedChange,
  id: providedId,
  className,
  ...inputProps
}: CheckboxProps) {
  const generatedId = useId();
  const id = providedId ?? `rv-checkbox-${generatedId}`;
  const errorId = `${id}-error`;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = checked === 'indeterminate';
    }
  }, [checked]);

  return (
    <div className="rv-choice-field">
      <label className="rv-checkbox" htmlFor={id}>
        <input
          {...inputProps}
          aria-describedby={error ? errorId : undefined}
          aria-errormessage={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          checked={checked === true}
          className={['rv-checkbox__input', className].filter(Boolean).join(' ')}
          id={id}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onCheckedChange(event.currentTarget.checked)
          }
          ref={inputRef}
          type="checkbox"
        />
        <span className="rv-checkbox__label">{label}</span>
        <span aria-hidden="true" className="rv-choice__state">
          {checkboxStateText(checked)}
        </span>
      </label>
      {error && (
        <p className="rv-field__error" id={errorId}>
          <Icon name="danger" size={16} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface RadioGroupProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly RadioOption[];
  readonly error?: string;
  readonly disabled?: boolean;
  readonly name?: string;
  readonly onValueChange: (value: string) => void;
}

export function RadioGroup({
  label,
  value,
  options,
  error,
  disabled = false,
  name,
  onValueChange,
}: RadioGroupProps) {
  const generatedId = useId();
  const groupName = name ?? `rv-radio-${generatedId}`;
  const errorId = `${groupName}-error`;
  const radioRefs = useRef<Array<HTMLInputElement | null>>([]);

  const moveSelection = (currentIndex: number, direction: -1 | 1) => {
    for (let offset = 1; offset <= options.length; offset += 1) {
      const candidateIndex = (currentIndex + direction * offset + options.length) % options.length;
      const candidate = options[candidateIndex];
      if (!candidate.disabled) {
        onValueChange(candidate.value);
        radioRefs.current[candidateIndex]?.focus();
        return;
      }
    }
  };

  const handleArrowKey = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(index, 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(index, -1);
    }
  };

  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
      className="rv-radio-group"
      disabled={disabled}
    >
      <legend className="rv-field__label">{label}</legend>
      <div className="rv-radio-group__options">
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <label className="rv-radio" key={option.value}>
              <input
                checked={selected}
                disabled={option.disabled}
                name={groupName}
                onChange={() => onValueChange(option.value)}
                onKeyDown={(event) => handleArrowKey(event, index)}
                ref={(element) => {
                  radioRefs.current[index] = element;
                }}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
              {selected && (
                <span aria-hidden="true" className="rv-choice__state">
                  Selecionado
                </span>
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p className="rv-field__error" id={errorId}>
          <Icon name="danger" size={16} />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
