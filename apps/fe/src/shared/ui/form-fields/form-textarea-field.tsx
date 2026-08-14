import type { FieldPath, FieldValues } from "react-hook-form";

import { Textarea } from "../textarea";
import {
  type BaseFormFieldProps,
  FormFieldShell,
} from "./form-field-shell";

type ControlledTextareaProps = Omit<
  React.ComponentPropsWithoutRef<typeof Textarea>,
  "defaultValue" | "name" | "onBlur" | "onChange" | "ref" | "value"
>;

type FormTextareaFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName> & ControlledTextareaProps;

function FormTextareaField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  itemClassName,
  labelClassName,
  ...textareaProps
}: FormTextareaFieldProps<TFieldValues, TName>) {
  return (
    <FormFieldShell
      control={control}
      name={name}
      label={label}
      description={description}
      itemClassName={itemClassName}
      labelClassName={labelClassName}
      renderControl={(field) => <Textarea {...field} {...textareaProps} />}
    />
  );
}

export { FormTextareaField };
