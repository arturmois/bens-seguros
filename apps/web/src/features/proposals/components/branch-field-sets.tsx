'use client';

import type { Control, FieldValues, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { COMBUSTIVEL_OPTIONS, USO_VEICULO_OPTIONS } from '../lib/branch-options';

export interface FieldHelperProps {
  register: UseFormRegister<FieldValues>;
  control: Control<FieldValues>;
}

interface FormFieldProps {
  readonly label: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}

export function FieldWrapper({ label, required, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function AutoFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Marca" required>
        <Input placeholder="Ex: Volkswagen" {...register('marca')} />
      </FieldWrapper>
      <FieldWrapper label="Modelo" required>
        <Input placeholder="Ex: Gol 1.6" {...register('modelo')} />
      </FieldWrapper>
      <FieldWrapper label="Ano Fabricacao" required>
        <Input
          type="number"
          placeholder="Ex: 2024"
          {...register('anoFabricacao', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Ano Modelo" required>
        <Input
          type="number"
          placeholder="Ex: 2025"
          {...register('anoModelo', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Placa">
        <Input placeholder="Ex: ABC1D23" {...register('placa')} />
      </FieldWrapper>
      <FieldWrapper label="Chassi">
        <Input placeholder="Chassi do veiculo" {...register('chassi')} />
      </FieldWrapper>
      <FieldWrapper label="Cor">
        <Input placeholder="Ex: Prata" {...register('cor')} />
      </FieldWrapper>
      <FieldWrapper label="Combustivel">
        <Controller
          name="combustivel"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={COMBUSTIVEL_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {COMBUSTIVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Uso do Veiculo">
        <Controller
          name="usoVeiculo"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={USO_VEICULO_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {USO_VEICULO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
    </>
  );
}

export function LifeFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Profissao" required>
        <Input placeholder="Profissao do segurado" {...register('profissao')} />
      </FieldWrapper>
      <FieldWrapper label="Renda Mensal (centavos)">
        <Input
          type="number"
          placeholder="Ex: 500000 = R$ 5.000"
          {...register('rendaMensalCentavos', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Fumante">
        <Controller
          name="fumante"
          control={control}
          render={({ field }) => (
            <Switch checked={field.value === true} onCheckedChange={field.onChange} />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Esportes Radicais">
        <Controller
          name="esportesRadicais"
          control={control}
          render={({ field }) => (
            <Switch checked={field.value === true} onCheckedChange={field.onChange} />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Beneficiarios">
        <Textarea
          placeholder="Nomes e parentesco dos beneficiarios"
          {...register('beneficiarios')}
        />
      </FieldWrapper>
    </>
  );
}

export function OtherFields({ register }: FieldHelperProps) {
  return (
    <FieldWrapper label="Descricao" required>
      <Textarea placeholder="Descreva o objeto segurado" {...register('descricao')} />
    </FieldWrapper>
  );
}
