import type { FieldPath, FieldValues } from "react-hook-form";

import { Input } from "../input";
import {
  type BaseFormFieldProps,
  FormFieldShell,
} from "./form-field-shell";

type ControlledInputProps = Omit<
  React.ComponentPropsWithoutRef<typeof Input>,
  "defaultValue" | "name" | "onBlur" | "onChange" | "ref" | "value"
>;

type FormInputFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & ControlledInputProps;

function FormInputField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  itemClassName,
  labelClassName,
  ...inputProps
}: FormInputFieldProps<TFieldValues, TName>) {
  return (
    <FormFieldShell
      control={control}
      name={name}
      label={label}
      description={description}
      itemClassName={itemClassName}
      labelClassName={labelClassName}
      renderControl={(field) => <Input {...field} {...inputProps} />}
    />
  );
}

export { FormInputField };
