import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { formatBRLInput, parseBRLInput } from "@/lib/format";

type CurrencyInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: number;
  onValueChange: (value: number) => void;
  emptyWhenZero?: boolean;
};

export function CurrencyInput({
  value,
  onValueChange,
  emptyWhenZero = true,
  onBlur,
  onFocus,
  ...props
}: CurrencyInputProps) {
  const focused = useRef(false);
  const textoInicial =
    emptyWhenZero && !value ? "" : formatBRLInput(value);
  const [texto, setTexto] = useState(textoInicial);

  useEffect(() => {
    if (!focused.current) {
      setTexto(emptyWhenZero && !value ? "" : formatBRLInput(value));
    }
  }, [emptyWhenZero, value]);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={texto}
      onFocus={(event) => {
        focused.current = true;
        onFocus?.(event);
      }}
      onChange={(event) => {
        const proximo = event.target.value;
        setTexto(proximo);
        onValueChange(parseBRLInput(proximo));
      }}
      onBlur={(event) => {
        focused.current = false;
        const numero = parseBRLInput(texto);
        onValueChange(numero);
        setTexto(emptyWhenZero && !numero ? "" : formatBRLInput(numero));
        onBlur?.(event);
      }}
    />
  );
}
